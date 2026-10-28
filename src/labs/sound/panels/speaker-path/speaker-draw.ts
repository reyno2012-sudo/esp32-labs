// S7 panel: samples → I2S1 → class D pulses → the cone; the squared volume; the echo guard.
import type { ScopePalette } from "@/lib/canvas";
import {
  display,
  labelParagraph,
  labelWriter,
  levelColour,
  mono,
  textWriter,
} from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";

/** Volume 0-100 → the gain every sample is multiplied by (squared, like the board). */
export const volumeGain = (vol: number) => (vol / 100) ** 2;

/** `t`: seconds for the waves; `tt`: the slowed phase of the samples; `loopT`: 0-6 s of the echo-guard loop. */
export function drawSpeakerPath(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  vol: number,
  t: number,
  tt: number,
  loopT: number,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  const gain = volumeGain(vol);
  const small = mono(10);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 400);
  // 1. Samples.
  W(12, 16, tr("speaker.samples"), C.muted);
  for (let i = 0; i < 24; i++) {
    const v = Math.sin((i / 24) * Math.PI * 2 + tt * 6) * gain;
    g.fillStyle = C.pink;
    g.fillRect(14 + i * 5, 60 - v * 30, 3, 3);
  }
  // 2. I2S1.
  g.strokeStyle = C.violet;
  g.beginPath();
  g.roundRect(140, 26, 136, 64, 8);
  g.stroke();
  T(208, 46, "I2S1", C.ink, display(12), "center");
  T(208, 62, "BCLK 39 · LRC 38", C.muted, mono(9), "center");
  T(208, 76, "DIN 47 · L = R", C.muted, mono(9), "center");
  // 3. Class D: pulses whose width follows the sample.
  W(290, 16, tr("speaker.classD"), C.muted);
  g.strokeStyle = C.amber;
  g.beginPath();
  for (let k = 0; k < 28; k++) {
    const v = Math.sin((k / 28) * Math.PI * 2 + tt * 6) * gain;
    const duty = 0.5 + 0.45 * v;
    const x = 290 + k * 9;
    g.moveTo(x, 80);
    g.lineTo(x, 34);
    g.lineTo(x + 9 * duty, 34);
    g.lineTo(x + 9 * duty, 80);
    g.lineTo(x + 9, 80);
  }
  g.stroke();
  // 4. The cone follows the average.
  const cone = Math.sin(tt * 6 * 4.6) * gain;
  const cx = 600 + cone * 12;
  g.fillStyle = C.dim;
  g.fillRect(580, 30, 8, 60);
  g.strokeStyle = C.ink;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(588, 40);
  g.lineTo(cx + 30, 22);
  g.moveTo(588, 80);
  g.lineTo(cx + 30, 98);
  g.moveTo(cx + 30, 22);
  g.lineTo(cx + 30, 98);
  g.stroke();
  g.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    const r = ((t * 30 + k * 14) % 42) + 8;
    g.strokeStyle = C.pink;
    g.globalAlpha = gain * (1 - r / 52);
    g.beginPath();
    g.arc(cx + 34, 60, r, -0.7, 0.7);
    g.stroke();
  }
  g.globalAlpha = 1;
  W(605, 116, tr("speaker.cone"), C.muted, small, "center");
  // Volume is squared.
  const gx = 20;
  const gy = 160;
  const gw = 150;
  const gh = 90;
  g.strokeStyle = C.dim;
  g.strokeRect(gx, gy, gw, gh);
  g.strokeStyle = C.teal;
  g.beginPath();
  for (let i = 0; i <= 100; i++) {
    const x = gx + (i / 100) * gw;
    const y = gy + gh - (i / 100) ** 2 * gh;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(gx + (vol / 100) * gw, gy + gh - gain * gh, 4, 0, 7);
  g.fill();
  W(gx, gy - 6, tr("speaker.squared"), C.muted, small);
  drawEchoGuard(g, C, loopT, tr);
  const para = { maxW: 656, lineH: 16, col: C.muted, font: small };
  const y = labelParagraph(g, 12, 334, tr("speaker.whySquared"), para);
  labelParagraph(g, 12, y + 2, tr("speaker.whyGuard"), para);
}

/** The echo guard, a 6 s loop: a beep, a clap during it (ignored), a clap later (heard). */
function drawEchoGuard(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  loopT: number,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  const ex = 300;
  const ew = 360;
  const ey = 160;
  const xOf = (s: number) => ex + (s / 6) * ew;
  W(ex, ey - 6, tr("speaker.guard.title"), C.muted, mono(10));
  g.fillStyle = C.violet;
  g.globalAlpha = 0.18;
  g.fillRect(xOf(1), ey, xOf(1.6) - xOf(1), 130);
  g.globalAlpha = 1;
  for (const [l, y] of [
    ["speaker", ey + 20],
    ["mic", ey + 60],
    ["lab", ey + 100],
  ] as const)
    W(ex - 4, y + 4, tr(`speaker.guard.${l}`), C.muted, mono(9), "right");
  g.fillStyle = C.pink;
  g.fillRect(xOf(1), ey + 14, xOf(1.4) - xOf(1), 12);
  for (let s = 0; s < 6; s += 0.02) {
    let lv = 3 + Math.random() * 2;
    if (s >= 1 && s < 1.4) lv = 26;
    if (s >= 1.25 && s < 1.32) lv = 40;
    if (s >= 3.5 && s < 3.58) lv = 38 - (s - 3.5) * 200;
    g.fillStyle = s <= loopT ? levelColour(C, lv) : C.dim;
    g.fillRect(xOf(s), ey + 76 - lv * 0.8, 2, lv * 0.8);
  }
  g.fillStyle = C.teal;
  g.fillRect(ex, ey + 96, xOf(1) - ex, 8);
  g.fillRect(xOf(1.6), ey + 96, ex + ew - xOf(1.6), 8);
  W(xOf(1.3), ey + 124, tr("speaker.guard.muted"), C.violet, mono(9), "center");
  if (loopT > 1.3) T(xOf(1.28), ey + 48, "✗", C.coral, mono(13, true), "center");
  if (loopT > 3.55) W(xOf(3.54), ey + 48, tr("speaker.guard.clap"), C.teal, mono(12, true), "center");
  g.fillStyle = C.ink;
  g.fillRect(xOf(loopT), ey + 8, 1.5, 104);
}
