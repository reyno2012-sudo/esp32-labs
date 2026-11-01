import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildBoardScene } from "@/features/home/board3d/esp32-scene";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import styles from "./Intro.module.css";
import { Icon } from "@/ui/Icon";

export function Intro({ onEnter }: { onEnter: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const rhythm = useRef<{ context: AudioContext; analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> } | null>(null);
  const [sound, setSound] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  useEffect(() => {
    const element = audio.current!;
    let active = true;
    // Ask the browser to start audible playback; never misreport a blocked attempt.
    void element.play().then(() => {
      if (!active || rhythm.current) return;
      const context = new AudioContext();
      if (context.state !== 'running') { void context.close(); return; }
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .65;
      context.createMediaElementSource(element).connect(analyser);
      analyser.connect(context.destination);
      rhythm.current = { context, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') setAutoplayBlocked(true);
      else if (!(error instanceof DOMException && error.name === 'AbortError')) setAudioError(true);
    });
    return () => { active = false; element.pause(); };
  }, []);
  useEffect(() => {
    const element = video.current!;
    element.defaultPlaybackRate = .5;
    element.playbackRate = .5;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { if (reduced.matches) element.pause(); else void element.play().catch(() => {}); };
    sync(); reduced.addEventListener('change', sync);
    return () => { element.pause(); reduced.removeEventListener('change', sync); };
  }, []);
  useEffect(() => () => {
    const current = rhythm.current;
    rhythm.current = null;
    if (current) void current.context.close();
  }, []);
  const toggleSound = async () => {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) { element.pause(); return; }
    try {
      setAudioError(false);
      if (!rhythm.current) {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = .65;
        context.createMediaElementSource(element).connect(analyser);
        analyser.connect(context.destination);
        rhythm.current = { context, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
      }
      await rhythm.current.context.resume();
      await element.play();
    } catch { setAudioError(true); }
  };
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .85;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    renderer.setClearColor(0x000000, 0);
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    camera.position.set(10, 12, 15);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x77715c, .7));
    const light = new THREE.DirectionalLight(0xfff0d6, 2.5);
    light.position.set(-8, 16, 8); light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
    scene.add(light);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const model = buildBoardScene(THREE, { scene, reduce: reduced, onFrame: () => {} }, { blinkLed: true });
    const board = model.root;
    // USB (-X) leads away from the camera; the antenna end follows behind.
    let heading = -Math.atan2(camera.position.z, camera.position.x);
    board.rotation.y = heading;
    board.scale.setScalar(2 / 3);
    board.position.set(0, .48, 0);
    // The exposed legs begin at the underside of the black header spacers.
    const pins = board.children.filter((child): child is THREE.Mesh =>
      child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry &&
      Math.abs(child.geometry.parameters.height - .86) < .001);
    const feet = pins.map(pin => {
      const pivot = new THREE.Group();
      pivot.position.copy(pin.position);
      pivot.position.y = -.41;
      const side = pin.position.z > 0 ? 1 : -1;
      const along = pin.position.x;
      board.add(pivot);
      pivot.add(pin);
      pin.scale.y = .39 / .86;
      pin.position.set(0, -.39 / 2, 0);
      return { pivot, side, along };
    });
    // One small warm LED over each header pin, within the existing pad footprint.
    const headerLeds = feet.map(({ pivot }) => {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffe5a0, emissive: 0xffc85a, emissiveIntensity: .45,
        roughness: .28, metalness: .05,
      });
      const led = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .025, 12), material);
      led.position.set(pivot.position.x, .068, pivot.position.z);
      board.add(led);
      return material;
    });
    // Raise the antenna end by 8 degrees around the USB-end pivot.
    // Keep the outer group's existing yaw, bounce and walking animation intact.
    const boardParts = [...board.children];
    const tailTilt = new THREE.Group();
    tailTilt.position.x = -3.1;
    tailTilt.rotation.z = THREE.MathUtils.degToRad(8);
    const tiltedParts = new THREE.Group();
    tiltedParts.position.x = 3.1;
    tiltedParts.add(...boardParts);
    tailTilt.add(tiltedParts);
    board.add(tailTilt);
    // Move the board back toward the viewer by 2 CSS centimetres on screen.
    const backwardOffsetPx = 2 * 96 / 2.54;
    const resize=()=>{renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.position.set(10,12,camera.aspect<1?25:15);camera.lookAt(0,0,0);heading=-Math.atan2(camera.position.z,camera.position.x);board.rotation.y=heading;camera.setViewOffset(container.clientWidth,container.clientHeight,-container.clientWidth*.01,-container.clientHeight*.14-backwardOffsetPx,container.clientWidth,container.clientHeight);camera.updateProjectionMatrix();};
    resize();window.addEventListener('resize',resize);
    const start=performance.now();let frame=0;
    let previous = 0, phase = 0, energy = 0;
    const draw=()=>{ const t=(performance.now()-start)/1000;
      const dt = Math.min(.05, t - previous); previous = t;
      let bass = 0;
      const track = rhythm.current;
      if (track && audio.current && !audio.current.paused) {
        track.analyser.getByteFrequencyData(track.data);
        bass = ((track.data[1] ?? 0) + (track.data[2] ?? 0) + (track.data[3] ?? 0)) / (3 * 255);
      }
      energy += (bass - energy) * (1 - Math.exp(-dt * 12));
      const moving = video.current && !video.current.paused && !video.current.ended;
      phase += moving ? dt * (3 + energy * 2) : 0;
      model.frame(t);
      headerLeds.forEach((material, i) => {
        material.emissiveIntensity = reduced ? .45 : .45 + .18 * Math.sin(t * 3 + i * 1.7);
      });
      if(!reduced){
        // Keep the USB end anchored as the tail swings +/-7 degrees per step.
        const yaw = heading + Math.sin(phase) * (7 * Math.PI / 180);
        board.rotation.y = yaw;
        const pivotDistance = 3.1 * (2 / 3);
        board.position.x = pivotDistance * (Math.cos(yaw) - Math.cos(heading));
        board.position.z = pivotDistance * (Math.sin(heading) - Math.sin(yaw));
        feet.forEach(({ pivot, side, along }) => {
          const step = phase + along * 4 + (side > 0 ? Math.PI : 0);
          // Rotate only in the board's lengthwise plane, never sideways.
          pivot.rotation.z = Math.sin(step) * (.32 + energy * .16);
        });
        // A small step-synchronised bounce; stronger bass adds a little spring.
        board.position.y = .48 + (1 - Math.cos(phase * 2)) * .5 * (.065 + energy * .035);
        board.rotation.x = Math.sin(phase) * (.008 + energy * .006);
      }
      renderer.render(scene,camera);frame=requestAnimationFrame(draw);};draw();
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);board.traverse(object=>{if(object instanceof THREE.Mesh || object instanceof THREE.Sprite){if(object instanceof THREE.Mesh)object.geometry.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(mat=>{Object.values(mat).forEach(value=>{if(value instanceof THREE.Texture)value.dispose();});mat.dispose();});}});environment.dispose();renderer.dispose();renderer.domElement.remove();};
  }, []);
  return <div className={styles.intro}>
    <video ref={video} className={styles.backgroundVideo} src="/intro/tunnel-video-trimmed.mp4" poster="/intro/tunnel-first-frame.jpg" muted loop playsInline preload="auto" aria-hidden="true" />
    <div className={styles.contactShadow} aria-hidden="true" />
    <div className={styles.scene} ref={host} />
    <button className={styles.enter} onClick={onEnter} aria-label="进入 Reyno Lab">
      <span className={styles.brand}>REYNO LAB <span className={styles.slash}>/</span> <span className={styles.model}>ESP32-S3</span></span>
      <span className={styles.caption}><strong>让灵感，迈出第一步。</strong><span>点击屏幕 · 开始探索</span></span>
    </button>
    {/* Background music only; no spoken content requiring captions. */}
    {/* eslint-disable-next-line jsx-a11y-x/media-has-caption */}
    <audio ref={audio} src="/intro/opening-music.mp3" loop autoPlay preload="auto" onPlaying={()=>{setSound(true);setAutoplayBlocked(false);setAudioError(false);}} onPause={()=>setSound(false)} onError={()=>setAudioError(true)} />
    <button
      type="button"
      className={styles.sound}
      aria-pressed={sound}
      aria-label={audioError ? '音频播放失败，点击重试' : sound ? '关闭音乐' : autoplayBlocked ? '浏览器限制自动播放，点击播放音乐' : '播放音乐'}
      onClick={toggleSound}
    >
      <Icon name={audioError ? "rotateRight" : sound ? "volumeOn" : "volumeOff"} size={24} />
    </button>
  </div>;
}
