// S8's views: the parrot, the live echo, the robot, the effect chain's scope.
import type { ScopePalette } from "@/lib/canvas";
import { B12, drawWave, levelColour, maxAbs, S8, textWriter } from "../../kit/draw";
import { VOICE_FX } from "../../model/voice-fx";
import type { S8State } from "./s8";

type G = CanvasRenderingContext2D;

/** The parrot's current voice. */
export const fxName = (st: S8State) => VOICE_FX[st.fx]?.[0] ?? "normal";

export function drawS8(g: G, C: ScopePalette, view: number, t: number, st: S8State): void {
  if (view === 0) drawParrot(g, C, t, st);
  else if (view === 1) drawEcho(g, C, st);
  else if (view === 2) drawRobot(g, C, t, st);
  else drawChain(g, C, st);
}

function drawBird(g: G, C: ScopePalette, t: number, st: S8State): void {
  const cx = 70;
  const cy = 70;
  const bob = Math.sin(t * 2) * 2;
  const open = st.mood === "talking" ? Math.abs(Math.sin(t * 14)) : 0;
  g.fillStyle = C.teal;
  g.beginPath();
  g.arc(cx, cy + 22 + bob, 24, 0, 7);
  g.fill();
  g.beginPath();
  g.arc(cx + 8, cy - 8 + bob, 18, 0, 7);
  g.fill();
  g.fillStyle = C.dim;
  g.beginPath();
  g.moveTo(cx - 22, cy + 10 + bob);
  g.lineTo(cx - 4, cy + 18 + bob);
  g.lineTo(cx - 18, cy + 46 + bob);
  g.fill();
  g.fillStyle = C.coral;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(cx + 2 + i * 6, cy - 24 + bob);
    g.lineTo(cx + 8 + i * 6, cy - 24 + bob);
    g.lineTo(cx + i * 7, cy - 38 + bob - i * 2);
    g.fill();
  }
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(cx + 14, cy - 12 + bob, st.mood === "recording" ? 7 : 5, 0, 7);
  g.fill();
  g.fillStyle = C.paper;
  g.beginPath();
  g.arc(cx + 15, cy - 12 + bob, 2.5, 0, 7);
  g.fill();
  g.fillStyle = C.amber;
  g.beginPath();
  g.moveTo(cx + 24, cy - 12 + bob);
  g.lineTo(cx + 24, cy - 4 + bob);
  g.lineTo(cx + 40, cy - 2 + bob);
  g.fill();
  g.beginPath();
  g.moveTo(cx + 24, cy - 3 + bob + open * 6);
  g.lineTo(cx + 24, cy + 2 + bob + open * 12);
  g.lineTo(cx + 35, cy - 1 + bob + open * 12);
  g.fill();
}

const MOOD_LINE = {
  listening: "Say something!",
  recording: "I'm listening...",
  talking: "Squawk!",
} as const;

function drawParrot(g: G, C: ScopePalette, t: number, st: S8State): void {
  const T = textWriter(g);
  const L = st.mic.level;
  drawBird(g, C, t, st);
  if (st.mood === "listening")
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.8 + i / 3) % 1;
      g.strokeStyle = C.pink;
      g.globalAlpha = 1 - k;
      g.beginPath();
      g.arc(150, 60, 8 + (1 - k) * 30, Math.PI / 2, Math.PI * 1.5);
      g.stroke();
    }
  g.globalAlpha = 1;
  g.fillStyle = C.dim;
  g.beginPath();
  g.roundRect(150, 36, 162, 58, 10);
  g.fill();
  const line1 = !st.parrotOn
    ? "Resting (parrot on)"
    : st.live
      ? "Busy: live effect on"
      : MOOD_LINE[st.mood];
  T(158, 58, line1, st.mood === "recording" ? C.coral : C.ink, B12);
  T(158, 70, `voice: ${fxName(st)}`, C.pink, S8);
  T(158, 81, VOICE_FX[st.fx]?.[1] ?? "", C.muted, S8);
  if (st.mood === "recording")
    T(150, 118, `REC ${((st.mic.ms - st.recFrom) / 1000).toFixed(1)} s`, C.coral, B12);
  else if (st.mood === "talking") {
    const k = Math.min(1, (performance.now() - st.talkAt) / st.talkMs);
    g.strokeStyle = C.dim;
    g.strokeRect(150.5, 110.5, 160, 8);
    g.fillStyle = C.pink;
    g.fillRect(151, 111, 158 * k, 6);
  }
  const fill = Math.min(1, L.above() / 50) * 158;
  g.fillStyle = C.dim;
  g.fillRect(150, 130, 160, 10);
  g.fillStyle = levelColour(C, L.above());
  g.fillRect(151, 132, fill, 6);
  g.fillStyle = C.coral;
  g.fillRect(151 + (st.trig.cfg.startDb / 50) * 158, 127, 1, 16);
  T(150, 152, `${L.above().toFixed(0)} dB, starts at ${st.trig.cfg.startDb}`, C.muted, S8);
}

function drawEcho(g: G, C: ScopePalette, st: S8State): void {
  const T = textWriter(g);
  const L = st.mic.level;
  const on = st.live === "echo";
  T(10, 50, on ? "Echo ON" : "Echo off", on ? C.teal : C.muted, B12);
  T(110, 47, `delay ${st.delay} ms - feedback ${st.feedback} %`, C.ink, S8);
  const x0 = 14;
  const y0 = 64;
  const h = 54;
  const w = 292;
  g.fillStyle = C.dim;
  g.fillRect(x0, y0 + h, w, 1);
  g.fillStyle = C.ink;
  g.fillRect(x0, y0, 3, h);
  let a = 1;
  for (let k = 1; k < 12; k++) {
    const x = x0 + (k * st.delay * w) / 2000;
    if (x > x0 + w) break;
    const hh = h * a;
    g.fillStyle = C.pink;
    if (hh > 0.5) g.fillRect(x, y0 + h - hh, 3, hh);
    a *= st.feedback / 100;
  }
  T(x0, y0 + h + 11, "one clap -> its echoes over 2 s", C.muted, S8);
  T(
    10,
    141,
    `in ${L.fast.toFixed(0)} dBFS  out ${on ? (L.fast - 3).toFixed(0) : "-96"} dBFS  latency ~${on ? 64 : 0} ms`,
    on ? C.ink : C.muted,
    S8,
  );
  T(10, 157, "speaker away from the mic, vol low", C.muted, S8);
}

function drawRobot(g: G, C: ScopePalette, t: number, st: S8State): void {
  const T = textWriter(g);
  const on = st.live === "robot";
  const cx = 80;
  const cy = 92;
  g.fillStyle = C.muted;
  g.beginPath();
  g.roundRect(cx - 44, cy - 44, 88, 84, 10);
  g.fill();
  g.fillStyle = C.dim;
  g.fillRect(cx - 1, cy - 58, 2, 14);
  g.fillStyle = on && t % 1 < 0.5 ? C.coral : C.dim;
  g.beginPath();
  g.arc(cx, cy - 60, 4, 0, 7);
  g.fill();
  for (const dx of [-18, 18]) {
    g.fillStyle = C.paper;
    g.beginPath();
    g.arc(cx + dx, cy - 14, 9, 0, 7);
    g.fill();
    g.fillStyle = on ? C.teal : C.dim;
    g.beginPath();
    g.arc(cx + dx, cy - 14, 4, 0, 7);
    g.fill();
  }
  const lvl = on ? Math.min(1, st.mic.level.above() / 30) : 0;
  for (let i = 0; i < 7; i++) {
    const hh = 4 + lvl * 18 * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 20));
    g.fillStyle = on ? C.pink : C.dim;
    g.fillRect(cx - 30 + i * 9, cy + 18 - hh / 2, 6, Math.max(2, hh));
  }
  T(150, 50, on ? "Robot ON" : "Robot off", on ? C.teal : C.muted, B12);
  T(150, 73, `carrier ${st.carrier} Hz`, C.ink, S8);
  T(150, 89, "voice x a slow sine:", C.muted, S8);
  T(150, 100, "every f becomes f-c, f+c", C.muted, S8);
  T(150, 111, "+ 8-bit crunch", C.muted, S8);
  T(150, 137, "speaker away from the mic", C.muted, S8);
}

function drawChain(g: G, C: ScopePalette, st: S8State): void {
  const T = textWriter(g);
  const active = Boolean(st.live) || st.mood !== "listening";
  const mid = st.live === "echo" ? "delay" : st.live === "robot" ? "ring mod" : fxName(st);
  ["mic", mid, "speaker"].forEach((b, i) => {
    const y = 38 + i * 42;
    g.fillStyle = active ? C.pink : C.dim;
    g.globalAlpha = active ? 0.3 : 0.6;
    g.beginPath();
    g.roundRect(6, y, 76, 26, 6);
    g.fill();
    g.globalAlpha = 1;
    T(12, y + 17, b, active ? C.ink : C.muted, S8);
    if (i < 2) {
      g.fillStyle = active ? C.pink : C.dim;
      g.beginPath();
      g.moveTo(40, y + 30);
      g.lineTo(48, y + 30);
      g.lineTo(44, y + 38);
      g.fill();
    }
  });
  const inS = st.mic.latest(320);
  T(92, 41, "in", C.muted, S8);
  drawWave(g, 92, 44, 222, 50, inS, 320, maxAbs(inS, 512), C.teal);
  T(92, 105, "out", C.muted, S8);
  const out = new Float32Array(320);
  if (st.live === "robot")
    for (let i = 0; i < 320; i++)
      out[i] =
        Math.round(((inS[i] ?? 0) * Math.sin((2 * Math.PI * st.carrier * i) / 16000)) / 256) * 256;
  else if (st.live === "echo" || st.mood === "talking") out.set(inS);
  drawWave(g, 92, 108, 222, 50, out, 320, maxAbs(out, 512), C.pink);
}
