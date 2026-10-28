// Stages 5-8 of the chain: DMA, the ring, removing the bias, int16 → dB.
import type { ScopePalette } from "@/lib/canvas";
import { display, drawWave, levelColour, maxAbs, mono } from "../../kit/draw";
import { sndDb } from "../../model/level";
import type { StageCtx } from "./chain-types";

const Y0 = 64;

/** The ring view's fade: slots just written are bright, old ones dim. */
const mixCss = (C: ScopePalette, behind: number) => {
  const k = behind / (Math.PI * 2);
  return k < 0.15 ? C.pink : k < 0.5 ? C.violet : C.dim;
};

export function stageDma({ g, C, T, W, tr, sim, dt, reduce }: StageCtx): string {
  sim.dmaFill = (sim.dmaFill + dt * (reduce ? 0 : 60)) % 256;
  for (let i = 0; i < 256; i++) {
    const c = i % 32;
    const r = Math.floor(i / 32);
    g.fillStyle = i < sim.dmaFill ? C.teal : C.dim;
    g.fillRect(40 + c * 12, Y0 + 30 + r * 16, 10, 12);
  }
  W(40, Y0 + 20, tr("chain.dma.frame"), C.muted);
  if (sim.dmaFill < 4 && sim.flying < 0) sim.flying = 0;
  if (sim.flying >= 0) {
    sim.flying += dt * 1.5;
    g.fillStyle = C.teal;
    g.fillRect(430 + sim.flying * 180, Y0 + 80, 26, 20);
    if (sim.flying > 1) sim.flying = -1;
  }
  g.strokeStyle = C.pink;
  g.beginPath();
  g.roundRect(560, Y0 + 60, 100, 60, 8);
  g.stroke();
  W(610, Y0 + 86, tr("chain.dma.sampler"), C.ink, display(12), "center");
  W(610, Y0 + 104, tr("chain.dma.samplerCore"), C.muted, undefined, "center");
  g.strokeStyle = C.dim;
  g.beginPath();
  g.roundRect(560, Y0 + 150, 100, 50, 8);
  g.stroke();
  T(610, Y0 + 172, "loop()", C.ink, display(12), "center");
  W(610, Y0 + 190, tr("chain.dma.loopCore"), C.muted, undefined, "center");
  W(40, Y0 + 190, tr("chain.dma.idle"), C.muted);
  return tr("chain.dma.value");
}

export function stageRing({ g, C, W, tr, mic }: StageCtx): string {
  const cx = 200;
  const cy = Y0 + 110;
  const R = 90;
  const head = ((mic.w % 65536) / 65536) * Math.PI * 2;
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2 - Math.PI / 2;
    const behind = (head - (a + Math.PI / 2) + Math.PI * 4) % (Math.PI * 2);
    g.strokeStyle = mixCss(C, behind);
    g.lineWidth = 10;
    g.beginPath();
    g.arc(cx, cy, R, a, a + (Math.PI * 2) / 64 - 0.02);
    g.stroke();
  }
  const ha = head - Math.PI / 2;
  g.strokeStyle = C.ink;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(ha) * (R + 14), cy + Math.sin(ha) * (R + 14));
  g.stroke();
  g.lineWidth = 1;
  W(
    cx + Math.cos(ha) * (R + 26),
    cy + Math.sin(ha) * (R + 26) + 4,
    tr("chain.ring.write"),
    C.ink,
    undefined,
    "center",
  );
  const readers: readonly (readonly ["scope" | "fft" | "recorder", number, string])[] = [
    ["scope", 0.03, C.pink],
    ["fft", 0.06, C.amber],
    ["recorder", 0.4, C.teal],
  ];
  readers.forEach(([n, lag, col], i) => {
    const a = ha - lag * Math.PI * 2;
    g.fillStyle = col;
    g.beginPath();
    g.arc(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18), 4, 0, 7);
    g.fill();
    W(360, Y0 + 60 + i * 26, tr(`chain.ring.readers.${n}`), col);
  });
  W(360, Y0 + 160, tr("chain.ring.size"), C.muted);
  return tr("chain.ring.value", { w: mic.w, slot: mic.w & 65535 });
}

export function stageBias({ g, C, W, tr, mic, s }: StageCtx): string {
  const dc = mic.dc ?? 0;
  const raws = Array.from(s.slice(-480), (v) => v / 16 + dc);
  const span = Math.max(6, ...raws.map((r) => Math.abs(r - dc))) * 1.15;
  const yA = (r: number) => Y0 + 60 - ((r - dc) / span) * 50;
  const yB = (v: number) => Y0 + 170 - (v / span) * 50;
  g.strokeStyle = C.muted;
  g.beginPath();
  raws.forEach((r, i) => (i ? g.lineTo(40 + i * 1.3, yA(r)) : g.moveTo(40, yA(r))));
  g.stroke();
  g.setLineDash([5, 4]);
  g.strokeStyle = C.pink;
  g.beginPath();
  g.moveTo(40, yA(dc));
  g.lineTo(664, yA(dc));
  g.stroke();
  g.setLineDash([]);
  W(44, Y0 + 8, tr("chain.bias.raw", { dc }), C.muted);
  W(340, Y0 + 118, tr("chain.bias.minus"), C.pink, mono(12, true), "center");
  g.fillStyle = C.dim;
  g.fillRect(40, yB(0), 624, 1);
  g.strokeStyle = C.teal;
  g.beginPath();
  raws.forEach((r, i) => (i ? g.lineTo(40 + i * 1.3, yB(r - dc)) : g.moveTo(40, yB(r - dc))));
  g.stroke();
  W(44, Y0 + 128, tr("chain.bias.alone"), C.muted);
  return tr("chain.bias.value", { raw: mic.lastRaw, dc, diff: mic.lastRaw - dc });
}

export function stageDb({ g, C, T, W, tr, mic, s }: StageCtx): string {
  const L = mic.level;
  const last = s.slice(-512);
  g.strokeStyle = C.dim;
  g.strokeRect(40, Y0 + 10, 600, 90);
  drawWave(g, 40, Y0 + 10, 600, 90, last, 512, maxAbs(last, 256 / 1.1) * 1.1, C.pink);
  for (let f = 0; f <= 8; f++) {
    g.fillStyle = C.muted;
    g.fillRect(40 + f * 75, Y0 + 104, 1, 6);
  }
  W(44, Y0 + 124, tr("chain.db.frames"), C.muted);
  for (let f = 0; f < 8; f++) {
    let sum = 0;
    for (let i = 0; i < 64; i++) sum += (last[f * 64 + i] ?? 0) ** 2;
    const db = sndDb(Math.sqrt(sum / 64));
    const above = Math.max(0, db - L.floor);
    const bh = Math.min(70, above * 1.4);
    g.fillStyle = levelColour(C, above);
    g.fillRect(48 + f * 75, Y0 + 210 - bh, 58, bh);
    T(77 + f * 75, Y0 + 222, `${above.toFixed(0)} dB`, C.muted, mono(10), "center");
  }
  return tr("chain.db.value", { fast: L.fast, floor: L.floor, above: L.above() });
}
