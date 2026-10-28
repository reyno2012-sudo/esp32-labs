// Stages 1-4 of the chain: air, capsule, the AO pin, the ADC. Each draws below the pipeline and
// returns the live value line.
import { drawWave, mono } from "../../kit/draw";
import { attenName } from "../../model/level";
import type { StageCtx } from "./chain-types";

const Y0 = 64;
const H = 222;

export function stageAir({ g, C, tr, mic, t }: StageCtx): string {
  const L = mic.level;
  const amp = 2 + Math.min(14, L.instAbove() / 3);
  for (let c = 0; c < 46; c++)
    for (let r = 0; r < 12; r++) {
      const bx = 30 + c * 14;
      const d = Math.sin(c * 0.45 - t * 6) * amp;
      g.fillStyle = C.muted;
      g.fillRect(bx + d + ((r * 7) % 5), Y0 + 14 + r * 16, 2.5, 2.5);
    }
  g.strokeStyle = C.pink;
  g.beginPath();
  for (let c = 0; c < 640; c++) {
    const yy = Y0 + H - 18 - Math.sin((c / 14) * 0.45 - t * 6) * amp * 1.2;
    if (c) g.lineTo(20 + c, yy);
    else g.moveTo(20 + c, yy);
  }
  g.stroke();
  return tr("chain.air.value", { db: L.instAbove() });
}

export function stageCapsule({ g, C, T, W, tr, mic, s, t }: StageCtx): string {
  const mvNow = mic.lastMv - mic.biasMv;
  const bulge = Math.max(-26, Math.min(26, mvNow * 3));
  g.strokeStyle = C.card;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(200, Y0 + 30);
  g.quadraticCurveTo(200 + bulge, Y0 + 110, 200, Y0 + 190);
  g.stroke();
  g.strokeStyle = C.muted;
  g.beginPath();
  g.moveTo(240, Y0 + 30);
  g.lineTo(240, Y0 + 190);
  g.stroke();
  g.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    T(206 + bulge * 0.4, Y0 + 46 + k * 26, "+", C.amber, mono(12, true));
    T(246, Y0 + 46 + k * 26, "−", C.teal, mono(12, true));
  }
  W(200, Y0 + 210, tr("chain.capsule.diaphragm"), C.muted, undefined, "center");
  W(240, Y0 + 224, tr("chain.capsule.plate"), C.muted, undefined, "center");
  for (let k = 0; k < 4; k++) {
    const xx = 60 + k * 30 + ((t * 60) % 30);
    g.strokeStyle = C.pink;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.arc(xx - 40, Y0 + 110, 30, -0.5, 0.5);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.strokeStyle = C.dim;
  g.strokeRect(320, Y0 + 20, 340, 170);
  const mvs = new Float32Array(640);
  for (let i = 0; i < 640; i++) mvs[i] = ((s[i] ?? 0) / 16) * mic.mvPerStep();
  drawWave(g, 320, Y0 + 20, 340, 170, mvs, 640, 30, C.pink);
  W(326, Y0 + 34, tr("chain.capsule.box"), C.muted);
  return tr("chain.capsule.value", { mv: mvNow });
}

export function stageAo({ g, C, T, W, tr, mic, s }: StageCtx): string {
  const mvNow = mic.lastMv - mic.biasMv;
  const yv = (v: number) => Y0 + H - 10 - (v / 3300) * (H - 20);
  g.strokeStyle = C.dim;
  g.strokeRect(60, Y0 + 10, 600, H - 20);
  for (const v of [0, 1000, 2000, 3000])
    T(54, yv(v) + 4, `${v / 1000} V`, C.muted, undefined, "right");
  g.strokeStyle = C.pink;
  g.beginPath();
  for (let c = 0; c < 600; c++) {
    const v = mic.biasMv + ((s[Math.floor((c * 640) / 600)] ?? 0) / 16) * mic.mvPerStep();
    if (c) g.lineTo(60 + c, yv(v));
    else g.moveTo(60 + c, yv(v));
  }
  g.stroke();
  W(70, yv(mic.biasMv) - 8, tr("chain.ao.bias", { v: mic.biasMv / 1000 }), C.ink);
  // Inset: x100.
  g.fillStyle = C.paper;
  g.fillRect(400, Y0 + 22, 250, 80);
  g.strokeStyle = C.amber;
  g.strokeRect(400, Y0 + 22, 250, 80);
  const zoom = new Float32Array(640);
  for (let i = 0; i < 640; i++) zoom[i] = ((s[i] ?? 0) / 16) * mic.mvPerStep();
  drawWave(g, 402, Y0 + 24, 246, 76, zoom, 640, 30, C.amber);
  W(406, Y0 + 36, tr("chain.ao.zoom"), C.amber);
  return tr(mvNow >= 0 ? "chain.ao.valuePlus" : "chain.ao.valueMinus", {
    v: mic.lastMv / 1000,
    bias: mic.biasMv,
    mv: Math.abs(mvNow),
  });
}

export function stageAdc({ g, C, T, W, tr, mic, s }: StageCtx): string {
  const dc = mic.dc ?? 0;
  const raws = Array.from(s.slice(-40), (v) => Math.round(v / 16 + dc));
  const mid = Math.round(dc);
  const span = Math.max(8, ...raws.map((r) => Math.abs(r - mid))) + 2;
  const yr = (r: number) => Y0 + H / 2 - ((r - mid) / span) * (H / 2 - 16);
  for (let r = mid - span; r <= mid + span; r++)
    if (span < 40 || r % 5 === 0) {
      g.fillStyle = C.dim;
      g.fillRect(70, yr(r), 590, 1);
    }
  T(64, yr(mid) + 4, String(mid), C.muted, undefined, "right");
  g.strokeStyle = C.pink;
  g.beginPath();
  raws.forEach((r, i) => {
    const x = 80 + i * 14.5;
    if (i) g.lineTo(x, yr(raws[i - 1] ?? r));
    else g.moveTo(x, yr(r));
    g.lineTo(x, yr(r));
  });
  g.stroke();
  raws.forEach((r, i) => {
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(80 + i * 14.5, yr(r), 2.5, 0, 7);
    g.fill();
  });
  W(80, Y0 + H - 4, tr("chain.adc.dots", { mv: mic.mvPerStep() }), C.muted);
  return tr("chain.adc.value", { raw: mic.lastRaw, atten: attenName(mic.atten) });
}
