// A 3D stage: renderer, a camera that orbits on drag (eased, so it settles instead of stopping
// dead), labels and leader lines that follow 3D points, and an illustrated finish (ink outlines
// and a soft contact shadow). No React: a component creates it once three.js has loaded and
// calls tick() per frame. Every DOM node it writes per frame is one it created itself.
import type * as Three from "three";
import { definePalette } from "@/lib/palette";

export type ThreeModule = typeof Three;

export interface StageOptions {
  /** The point the camera orbits around and looks at. */
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
  readonly radius: number;
  readonly az?: number;
  readonly el?: number;
  readonly spin?: boolean;
  /** Instead of spinning, rock gently around the start view by this angle, until touched. */
  readonly sway?: number;
  /** Field of view in degrees; narrow reads like an isometric drawing. */
  readonly fov?: number;
  /** Keep this much of the scene's width in view whatever the canvas's shape (overrides radius). */
  readonly fitWidth?: number;
  /** Closest and farthest the zoom goes, as multiples of `radius`. */
  readonly zoom?: readonly [number, number];
  /** Where a drag turns the model: the whole box (default) or only the canvas. */
  readonly dragOn?: "box" | "canvas";
  /** A soft shadow under the model: its size and the height of the floor. */
  readonly ground?: { readonly w: number; readonly d: number; readonly y: number };
  readonly reduce: boolean;
}

interface Label {
  readonly node: HTMLSpanElement;
  readonly at: Three.Vector3 | (() => Three.Vector3);
  readonly show: () => boolean;
}

interface Leader {
  readonly path: SVGPathElement;
  readonly dot: SVGCircleElement;
  readonly at: Three.Vector3;
  readonly anchor: HTMLElement;
}

const SVG = "http://www.w3.org/2000/svg";
const modelColours = definePalette({ ink: "--model-ink", shadow: "--model-shadow" });

/** Geometry kinds worth an ink outline: solid parts, not rings, waves or spheres. */
const OUTLINED = new Set(["BoxGeometry", "CylinderGeometry", "ExtrudeGeometry", "ShapeGeometry"]);

export class Stage3d {
  readonly scene: Three.Scene;
  readonly camera: Three.PerspectiveCamera;
  readonly renderer: Three.WebGLRenderer;
  /** Where the camera is heading; it eases there every frame. */
  readonly view: { az: number; el: number; radius: number; spinning: boolean; dragging: boolean };
  readonly reduce: boolean;
  #T: ThreeModule;
  #box: HTMLElement;
  #drag: HTMLElement;
  #overlay: HTMLElement;
  #svg: SVGSVGElement;
  #labels: Label[] = [];
  #leaders = new Map<string, Leader>();
  #target: Three.Vector3;
  #v: Three.Vector3;
  #ro: ResizeObserver;
  #home: { az: number; el: number; radius: number };
  #now: { az: number; el: number; radius: number };
  #zoom: readonly [number, number];
  #sway: number;
  #fitWidth: number | undefined;
  #touched = false;
  #px = 0;
  #py = 0;
  #moved = 0;
  #frame: (t: number, dt: number) => void = () => {};

  constructor(
    T: ThreeModule,
    box: HTMLElement,
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    o: StageOptions,
  ) {
    this.#T = T;
    this.#box = box;
    this.#drag = o.dragOn === "canvas" ? canvas : box;
    this.#overlay = overlay;
    this.#target = new T.Vector3(o.target.x, o.target.y, o.target.z);
    this.#v = new T.Vector3();
    this.#zoom = o.zoom ?? [0.6, 1.6];
    this.#sway = o.reduce ? 0 : (o.sway ?? 0);
    this.#fitWidth = o.fitWidth;
    this.reduce = o.reduce;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(o.fov ?? 36, 1.6, 0.1, 200);
    // A flat, bright key from the top front and a cool fill: shapes read, nothing goes black.
    this.scene.add(new T.HemisphereLight(0xffffff, 0x445566, 1.7));
    const sun = new T.DirectionalLight(0xffffff, 1.7);
    sun.position.set(4, 9, 6);
    this.scene.add(sun);
    const rim = new T.DirectionalLight(0xbfd8ff, 0.6);
    rim.position.set(-6, 4, -5);
    this.scene.add(rim);
    if (o.ground) this.scene.add(this.#shadow(o.ground));
    this.#home = { az: o.az ?? 0.7, el: o.el ?? 0.62, radius: o.radius };
    this.#now = { ...this.#home };
    this.view = { ...this.#home, spinning: (o.spin ?? true) && !o.reduce, dragging: false };

    this.#svg = document.createElementNS(SVG, "svg");
    this.#svg.setAttribute("class", "stage-leaders");
    overlay.appendChild(this.#svg);

    this.#ro = new ResizeObserver(this.#resize);
    this.#ro.observe(box);
    this.#resize();
    const d = this.#drag;
    d.addEventListener("pointerdown", this.#down);
    d.addEventListener("pointermove", this.#move);
    d.addEventListener("pointerup", this.#up);
    d.addEventListener("pointercancel", this.#up);
    d.addEventListener("wheel", this.#wheel, { passive: false });
  }

  /** A radial-gradient disc under the model: the contact shadow of an illustration. */
  #shadow(g: NonNullable<StageOptions["ground"]>) {
    const T = this.#T;
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, modelColours().shadow);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    const mesh = new T.Mesh(
      new T.PlaneGeometry(g.w, g.d),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(c),
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = g.y;
    mesh.renderOrder = -1;
    return mesh;
  }

  #resize = () => {
    const w = this.#box.clientWidth;
    const h = this.#box.clientHeight;
    if (!w || !h) return;
    const canvas = this.renderer.domElement;
    this.renderer.setSize(canvas.clientWidth || w, canvas.clientHeight || h, false);
    this.camera.aspect = (canvas.clientWidth || w) / (canvas.clientHeight || h);
    this.camera.updateProjectionMatrix();
    if (this.#fitWidth) {
      // The distance at which fitWidth spans the view, keeping any zoom the reader applied.
      const half = Math.tan(((this.camera.fov / 2) * Math.PI) / 180) * this.camera.aspect;
      const fit = Math.max(this.#fitWidth / 2 / half, this.#fitWidth * 0.6);
      const zoomed = this.view.radius / this.#home.radius;
      this.#home.radius = fit;
      this.view.radius = fit * zoomed;
    }
    this.#svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  };

  #down = (e: PointerEvent) => {
    this.view.dragging = true;
    this.#touched = true;
    this.#px = e.clientX;
    this.#py = e.clientY;
    this.#moved = 0;
    this.#drag.setPointerCapture?.(e.pointerId);
  };

  #move = (e: PointerEvent) => {
    if (!this.view.dragging) return;
    const dx = e.clientX - this.#px;
    const dy = e.clientY - this.#py;
    this.#px = e.clientX;
    this.#py = e.clientY;
    this.#moved += Math.abs(dx) + Math.abs(dy);
    this.view.az += dx * 0.008;
    this.view.el = Math.min(1.45, Math.max(0.08, this.view.el + dy * 0.006));
  };

  #up = () => {
    this.view.dragging = false;
  };

  // Pinch on a trackpad (ctrl + wheel) zooms; a plain wheel keeps scrolling the page.
  #wheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.zoom(Math.exp(e.deltaY * 0.01));
  };

  /** True when the last pointer press barely moved: a click, not a drag. */
  wasClick = () => this.#moved < 6;

  /** Turn by an angle (radians), as the toolbar's rotate buttons do. */
  rotate(by: number) {
    this.#touched = true;
    this.view.az += by;
  }

  /** Move closer (< 1) or farther (> 1), within the stage's zoom range. */
  zoom(factor: number) {
    const [near, far] = this.#zoom;
    const r = this.#home.radius;
    this.#touched = true;
    this.view.radius = Math.min(r * far, Math.max(r * near, this.view.radius * factor));
  }

  /** Back to the opening view. */
  recenter() {
    Object.assign(this.view, this.#home);
  }

  /**
   * After the scene is built: ink outlines on its solid parts, as children, so they move, hide
   * and fade with their mesh. Transparent parts get a fainter line.
   */
  outline() {
    const T = this.#T;
    const ink = new T.Color(modelColours().ink);
    const meshes: Three.Mesh[] = [];
    this.scene.traverse((obj) => {
      const mesh = obj as Three.Mesh;
      if (mesh.isMesh && OUTLINED.has(mesh.geometry.type) && !mesh.userData.noOutline)
        meshes.push(mesh);
    });
    for (const mesh of meshes) {
      const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const faint = m?.transparent ?? false;
      const lines = new T.LineSegments(
        new T.EdgesGeometry(mesh.geometry, 35),
        new T.LineBasicMaterial({ color: ink, transparent: faint, opacity: faint ? 0.35 : 1 }),
      );
      lines.raycast = () => {};
      mesh.add(lines);
    }
  }

  /** A label pinned to a 3D point (or a moving one). */
  label(text: string, at: Label["at"], show: () => boolean = () => true, className?: string) {
    const node = document.createElement("span");
    node.textContent = text;
    if (className) node.className = className;
    this.#overlay.appendChild(node);
    this.#labels.push({ node, at, show });
  }

  /** A dashed leader from an element on the page (a callout card) to a point on the model. */
  leader(key: string, at: Three.Vector3, anchor: HTMLElement) {
    const path = document.createElementNS(SVG, "path");
    const dot = document.createElementNS(SVG, "circle");
    dot.setAttribute("r", "5");
    this.#svg.append(path, dot);
    this.#leaders.set(key, { path, dot, at, anchor });
  }

  /** Lights one leader (or none): the callout you hover or focus. */
  focus(key: string | null) {
    for (const [k, l] of this.#leaders) {
      const on = k === key ? "true" : "false";
      l.path.setAttribute("data-on", on);
      l.dot.setAttribute("data-on", on);
    }
  }

  /** Scene animation, called every frame with seconds and the frame time. */
  onFrame(frame: (t: number, dt: number) => void) {
    this.#frame = frame;
  }

  tick(nowMs: number, dt: number) {
    const v = this.view;
    const n = this.#now;
    const step = Math.min(0.05, dt);
    if (v.spinning && !v.dragging) v.az += step * 0.12;
    if (this.#sway && !this.#touched) v.az = this.#home.az + this.#sway * Math.sin(nowMs / 2600);
    // Ease towards the target view; with reduced motion, jump.
    const k = this.reduce ? 1 : 1 - Math.exp(-step * 9);
    n.az += (v.az - n.az) * k;
    n.el += (v.el - n.el) * k;
    n.radius += (v.radius - n.radius) * k;
    const t = this.#target;
    this.camera.position.set(
      t.x + n.radius * Math.cos(n.el) * Math.cos(n.az),
      t.y + n.radius * Math.sin(n.el),
      t.z + n.radius * Math.cos(n.el) * Math.sin(n.az),
    );
    this.camera.lookAt(t);
    this.#frame(nowMs / 1000, step);
    this.renderer.render(this.scene, this.camera);
    this.#drawLabels();
    this.#drawLeaders();
  }

  /** Where the canvas sits inside the box this frame (layouts may put it anywhere). */
  #frameRect = { x: 0, y: 0, w: 0, h: 0 };

  #measure() {
    const box = this.#box.getBoundingClientRect();
    const c = this.renderer.domElement.getBoundingClientRect();
    this.#frameRect = { x: c.left - box.left, y: c.top - box.top, w: c.width, h: c.height };
  }

  /** A 3D point in the box's pixels. */
  #project(p: Three.Vector3): { x: number; y: number; front: boolean } {
    const r = this.#frameRect;
    this.#v.copy(p).project(this.camera);
    return {
      x: r.x + ((this.#v.x + 1) / 2) * r.w,
      y: r.y + ((1 - this.#v.y) / 2) * r.h,
      front: this.#v.z < 1,
    };
  }

  #drawLabels() {
    this.#measure();
    for (const l of this.#labels) {
      const p = this.#project(typeof l.at === "function" ? l.at() : l.at);
      l.node.style.opacity = l.show() && p.front ? "1" : "0";
      l.node.style.left = `${p.x}px`;
      l.node.style.top = `${p.y - 10}px`;
    }
  }

  #drawLeaders() {
    if (!this.#leaders.size || !this.#svg.getClientRects().length) return;
    const box = this.#box.getBoundingClientRect();
    for (const l of this.#leaders.values()) {
      const p = this.#project(l.at);
      const r = l.anchor.getBoundingClientRect();
      const left = r.left - box.left;
      const top = r.top - box.top;
      // Leave the card from the side that faces the point, step out, then run straight to it.
      let ax = left + r.width / 2;
      let ay = p.y < top ? top : top + r.height;
      let ex = ax;
      let ey = ay + (p.y < top ? -18 : 18);
      if (p.x > left + r.width || p.x < left) {
        const toRight = p.x > left + r.width;
        ax = toRight ? left + r.width : left;
        ay = top + r.height / 2;
        ex = ax + (toRight ? 18 : -18);
        ey = ay;
      }
      l.path.setAttribute("d", `M${ax} ${ay}L${ex} ${ey}L${p.x} ${p.y}`);
      l.dot.setAttribute("cx", String(p.x));
      l.dot.setAttribute("cy", String(p.y));
    }
  }

  dispose() {
    this.#ro.disconnect();
    const d = this.#drag;
    d.removeEventListener("pointerdown", this.#down);
    d.removeEventListener("pointermove", this.#move);
    d.removeEventListener("pointerup", this.#up);
    d.removeEventListener("pointercancel", this.#up);
    d.removeEventListener("wheel", this.#wheel);
    this.#labels.forEach((l) => l.node.remove());
    this.#labels = [];
    this.#leaders.clear();
    this.#svg.remove();
    this.scene.traverse((o) => {
      const mesh = o as Partial<Three.Mesh>;
      mesh.geometry?.dispose();
      const m = mesh.material;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => {
        (x as Partial<Three.MeshBasicMaterial>).map?.dispose();
        x.dispose();
      });
    });
    this.renderer.dispose();
  }
}

/** A rounded rectangle in the XZ plane, as points (for coils and traces). */
export function roundedRect(
  T: ThreeModule,
  cx: number,
  y: number,
  cz: number,
  hw: number,
  hd: number,
  r: number,
  n = 10,
): Three.Vector3[] {
  const pts: Three.Vector3[] = [];
  const corners = [
    [hw - r, hd - r, 0],
    [-(hw - r), hd - r, Math.PI / 2],
    [-(hw - r), -(hd - r), Math.PI],
    [hw - r, -(hd - r), Math.PI * 1.5],
  ] as const;
  for (const [x, z, a0] of corners)
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push(new T.Vector3(cx + x + r * Math.cos(a), y, cz + z + r * Math.sin(a)));
    }
  return pts;
}
