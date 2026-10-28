// S5's views, drawn like kit/lib/sound-kit's screen code on the 320×170 canvas.
import type { ScopePalette } from "@/lib/canvas";
import { B12, display, S8, textWriter } from "../../kit/draw";
import { noteOf } from "../../model/tune";
import { type S5State, steerFrac } from "./s5";

type G = CanvasRenderingContext2D;

/** x of a frequency on a 100 Hz - 8 kHz log axis. */
const logX = (hz: number, x: number, w: number) => x + (Math.log(hz / 100) / Math.log(80)) * w;
const bandHue = (i: number, v: number) =>
  `hsl(${190 + (i * 140) / 24} 85% ${40 + Math.min(30, v)}%)`;

export function drawS5(g: G, C: ScopePalette, view: number, t: number, st: S5State): void {
  if (view === 0) drawBars(g, C, st);
  else if (view === 1) drawWaterfall(g, C, st);
  else if (view === 2) drawTuner(g, C, st);
  else drawSteer(g, C, t, st);
}

function drawBars(g: G, C: ScopePalette, st: S5State): void {
  const T = textWriter(g);
  const x = 14;
  const w = 296;
  const yTop = 52;
  const yBot = 132;
  const h = yBot - yTop;
  const step = w / 24;
  for (let i = 0; i < 24; i++) {
    const v = st.bars[i] ?? 0;
    const bh = Math.min(1, v / 40) * h;
    if (bh > 0) {
      g.fillStyle = bandHue(i, v);
      g.fillRect(x + i * step, yBot - bh, step - 2, bh);
    }
    g.fillStyle = C.ink;
    g.fillRect(x + i * step, yBot - Math.min(1, (st.caps[i] ?? 0) / 40) * h - 1, step - 2, 1);
  }
  g.fillStyle = C.dim;
  g.fillRect(x, yBot + 1, w, 1);
  for (const [hz, l] of [
    [100, "100"],
    [250, "250"],
    [1000, "1k"],
    [4000, "4k"],
    [8000, "8k"],
  ] as const) {
    const px = Math.min(x + w - 1, logX(hz, x, w));
    g.fillStyle = C.muted;
    g.fillRect(px, yBot + 2, 1, 3);
    T(Math.max(x, Math.min(x + w - 12, px - 6)), yBot + 13, l, C.muted, S8);
  }
  const p = st.fft.peak(16000, 100, 7999);
  const nt = noteOf(p.hz, st.a4);
  const txt = st.hold
    ? "HOLD"
    : st.mic.level.above() >= 6
      ? p.hz >= 1000
        ? `loudest ${(p.hz / 1000).toFixed(2)} kHz (${nt.name})`
        : `loudest ${p.hz.toFixed(0)} Hz (${nt.name})`
      : "quiet: hum, whistle or play music";
  T(10, 43, txt, st.hold ? C.amber : C.ink, S8);
  T(
    318,
    43,
    `N ${st.fft.n} - ${(16000 / st.fft.n).toFixed(0)} Hz/bin - 212 us`,
    C.muted,
    S8,
    "right",
  );
}

function drawWaterfall(g: G, C: ScopePalette, st: S5State): void {
  const T = textWriter(g);
  const x = 30;
  const yBot = 140;
  for (let c = 0; c < 140; c++) {
    const col = st.hist[(st.hh + c) % 140];
    if (!col) continue;
    for (let r = 0; r < 48; r++) {
      const raw = col[r] ?? 0;
      if (raw <= 8) continue;
      const v = raw / 255;
      const X = x + c * 2;
      const Y = yBot - (r + 1) * 2;
      g.fillStyle = C.pink;
      g.globalAlpha = Math.min(1, v / 0.62);
      g.fillRect(X, Y, 2, 2);
      if (v > 0.62) {
        g.fillStyle = C.ink;
        g.globalAlpha = (v - 0.62) / 0.38;
        g.fillRect(X, Y, 2, 2);
      }
      g.globalAlpha = 1;
    }
  }
  g.strokeStyle = C.dim;
  g.strokeRect(x - 1.5, yBot - 97.5, 283, 98);
  for (const [hz, l] of [
    [100, "100"],
    [500, "500"],
    [1000, "1k"],
    [2000, "2k"],
    [4000, "4k"],
    [8000, "8k"],
  ] as const) {
    const y = yBot - (Math.log(hz / 100) / Math.log(80)) * 96;
    g.fillStyle = C.muted;
    g.fillRect(x - 4, y, 3, 1);
    T(2, Math.max(36, y + 4), l, C.muted, S8);
  }
  T(30, 153, st.hold ? "HOLD" : "now ->", C.muted, S8);
  T(224, 153, "0", C.muted, S8);
  T(300, 153, "40", C.muted, S8);
  const gr = g.createLinearGradient(232, 0, 296, 0);
  gr.addColorStop(0, C.paper);
  gr.addColorStop(0.62, C.pink);
  gr.addColorStop(1, C.ink);
  g.fillStyle = gr;
  g.fillRect(232, 146, 64, 6);
}

function drawTuner(g: G, C: ScopePalette, st: S5State): void {
  const T = textWriter(g);
  const P = st.pitch;
  const live = P.heard || performance.now() - P.last < 400;
  const nt = noteOf(P.hz, st.a4);
  if (live && P.hz > 0) {
    const ok = Math.abs(nt.cents) <= 5;
    T(14, 82, nt.name, ok ? C.teal : C.ink, display(30));
    T(14, 108, `${P.hz.toFixed(1)} Hz`, C.muted, B12);
    T(
      14,
      125,
      `${nt.cents >= 0 ? "+" : ""}${nt.cents.toFixed(0)} cents`,
      ok ? C.teal : C.amber,
      S8,
    );
  } else {
    T(14, 70, "whistle", C.muted, B12);
    T(14, 90, "or hum", C.muted, B12);
    T(14, 117, "close to the mic", C.muted, S8);
  }
  const cx = 232;
  const cy = 122;
  const r = 62;
  const at = (c: number, rad: number): readonly [number, number] => {
    const a = (c / 50) * 1.047;
    return [cx + Math.sin(a) * rad, cy - Math.cos(a) * rad];
  };
  for (let c = -50; c <= 50; c += 10) {
    const [x0, y0] = at(c, r);
    const [x1, y1] = at(c, r - (c ? 6 : 12));
    g.strokeStyle = c ? C.muted : C.ink;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  for (let c = -5; c <= 5; c += 0.5) {
    const [px, py] = at(c, r + 3);
    g.fillStyle = C.teal;
    g.fillRect(px - 1, py - 1, 2, 2);
  }
  if (live && P.hz > 0) {
    const [px, py] = at(Math.max(-50, Math.min(50, nt.cents)), r - 4);
    g.strokeStyle = Math.abs(nt.cents) <= 5 ? C.teal : C.pink;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(px, py);
    g.stroke();
    g.lineWidth = 1;
  }
  g.fillStyle = C.muted;
  g.beginPath();
  g.arc(cx, cy, 3, 0, 7);
  g.fill();
  T(cx - r - 4, cy + 11, "flat", C.muted, S8);
  T(cx + r - 18, cy + 11, "sharp", C.muted, S8);
  g.fillStyle = C.dim;
  g.fillRect(10, 140, 300, 1);
  if (nt.midi) {
    for (let i = 0; i < 120; i++) {
      const m = P.trail[(P.th + i) % 120] ?? 0;
      if (!m) continue;
      const d = m - nt.midi;
      if (Math.abs(d) > 2) continue;
      g.fillStyle = Math.abs(d) < 0.05 ? C.teal : C.pink;
      g.fillRect(10 + (i * 300) / 120, 140 - (d / 2) * 14, 2, 2);
    }
  }
  T(318, 41, `A4 = ${st.a4.toFixed(0)} Hz`, C.muted, S8, "right");
}

function drawSteer(g: G, C: ScopePalette, t: number, st: S5State): void {
  const T = textWriter(g);
  const S = st.steer;
  const yTop = 40;
  const yBot = 150;
  const h = yBot - yTop;
  g.fillStyle = C.dim;
  g.beginPath();
  g.roundRect(8, yTop, 8, h, 3);
  g.fill();
  if (st.pitch.heard) {
    const f = steerFrac(st, st.pitch.hz);
    g.fillStyle = `hsl(${f * 280} 85% 60%)`;
    g.beginPath();
    g.arc(12, yBot - f * h, 3, 0, 7);
    g.fill();
  }
  T(20, yTop + 7, String(st.hi), C.muted, S8);
  T(20, yBot, `${st.lo} Hz`, C.muted, S8);
  const dx = 220;
  for (let i = 1; i < 120; i++) {
    const a = S.ribbon[(S.rh + i - 1) % 120] ?? 0;
    const b = S.ribbon[(S.rh + i) % 120] ?? 0;
    g.strokeStyle = C.pink;
    g.globalAlpha = i / 120;
    g.beginPath();
    g.moveTo(dx - ((120 - i) * 160) / 120, yBot - a * h);
    g.lineTo(dx - ((119 - i) * 160) / 120, yBot - b * h);
    g.stroke();
  }
  g.globalAlpha = 1;
  const ty = yBot - S.target * h;
  const held = S.inSince ? performance.now() - S.inSince : 0;
  g.strokeStyle = held ? C.teal : C.amber;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(dx, ty, 14.5, 0, 7);
  g.stroke();
  g.lineWidth = 1;
  if (held) {
    g.fillStyle = C.teal;
    g.fillRect(dx - 14, ty + 19, 28 * Math.min(1, held / 1000), 3);
  }
  const y = yBot - S.y * h;
  const col = st.pitch.heard ? `hsl(${S.y * 280} 85% 60%)` : C.muted;
  for (let k = 3; k >= 1; k--) {
    g.fillStyle = col;
    g.globalAlpha = 0.25 / k;
    g.beginPath();
    g.arc(dx, y, 5 + k * 3, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = col;
  g.beginPath();
  g.arc(dx, y, 5, 0, 7);
  g.fill();
  T(270, yTop + 14, String(S.score), C.ink, B12);
  T(262, yTop + 27, "score", C.muted, S8);
  if (!st.pitch.heard && t % 2 < 1) T(248, yBot, "whistle!", C.muted, S8);
}
