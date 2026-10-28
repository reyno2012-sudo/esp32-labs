// S5 panel: from a whistle to a note, step by step (samples, window, FFT, peak, parabola, note).
import type { ScopePalette } from "@/lib/canvas";
import { display, labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { type Fft, type FftPeak, hann } from "../../model/fft";
import { noteOf } from "../../model/tune";

export const WHISTLE_RATE = 16000;

export function drawWhistleStep(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  at: number,
  fft: Fft,
  s: Float32Array,
  ws: Float32Array,
  p: FftPeak,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  const rate = WHISTLE_RATE;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 280);
  if (at <= 1) {
    const src = at === 0 ? s : ws;
    g.strokeStyle = C.pink;
    g.beginPath();
    for (let i = 0; i < 512; i++) {
      const x = 20 + (i / 512) * 640;
      const y = 130 - ((src[i] ?? 0) / 9500) * 100;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    if (at === 1) {
      g.setLineDash([4, 4]);
      g.strokeStyle = C.muted;
      g.beginPath();
      for (let i = 0; i < 512; i += 4) {
        const x = 20 + (i / 512) * 640;
        const y = 130 - 100 * hann(i, 512);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      g.setLineDash([]);
    }
    W(20, 262, at === 0 ? "0 ms" : tr("whistle.hump"), C.muted);
    T(660, 262, "32 ms", C.muted, undefined, "right");
    return;
  }
  // Zoom on the bins around the peak (±12 bins), as bars, plus a strip of all 256 on top.
  for (let k = 1; k < 256; k++) {
    const hh = Math.max(0, (fft.db(k) + 80) / 80) * 40;
    g.fillStyle = Math.abs(k - p.k) <= 12 ? C.teal : C.dim;
    g.fillRect(20 + (k / 256) * 640, 60 - hh, 2, hh);
  }
  W(20, 76, tr("whistle.allBins"), C.muted, mono(10));
  const k0 = p.k - 12;
  const bw = 24;
  const yb = 240;
  const yOf = (db: number) => yb - Math.max(0, (db + 80) / 80) * 140;
  for (let k = k0; k <= p.k + 12; k++) {
    const x = 30 + (k - k0) * bw;
    const isPeak = k === p.k;
    g.fillStyle =
      at >= 3 && isPeak ? C.pink : at >= 4 && Math.abs(k - p.k) === 1 ? C.amber : C.teal;
    g.fillRect(x, yOf(fft.db(k)), bw - 4, yb - yOf(fft.db(k)));
    if ((k - k0) % 4 === 0)
      T(x + bw / 2 - 2, yb + 14, `${((k * rate) / 512).toFixed(0)}`, C.muted, mono(9), "center");
  }
  if (at >= 4) {
    const xs = (k: number) => 30 + (k - k0) * bw + (bw - 4) / 2;
    const a = fft.db(p.k - 1);
    const b = fft.db(p.k);
    const c = fft.db(p.k + 1);
    g.strokeStyle = C.ink;
    g.beginPath();
    for (let u = -1.2; u <= 1.2; u += 0.05) {
      const y = b + 0.5 * (c - a) * u + 0.5 * (a - 2 * b + c) * u * u;
      const X = xs(p.k) + u * bw;
      const Y = yOf(y);
      if (u === -1.2) g.moveTo(X, Y);
      else g.lineTo(X, Y);
    }
    g.stroke();
    const tx = xs(p.k) + p.shift * bw;
    g.fillStyle = C.ink;
    g.fillRect(tx, 90, 1.5, yb - 90);
    T(tx, 86, `${p.hz.toFixed(1)} Hz`, C.ink, mono(12, true), "center");
  }
  if (at === 3)
    W(
      660,
      100,
      tr("whistle.peakBin", { k: p.k, hz: (p.k * rate) / 512, clarity: p.clarity }),
      C.pink,
      mono(12),
      "right",
    );
  if (at === 5) {
    const nt = noteOf(p.hz);
    T(660, 110, nt.name, Math.abs(nt.cents) <= 5 ? C.teal : C.ink, display(40), "right");
    T(
      660,
      132,
      `${nt.cents >= 0 ? "+" : ""}${nt.cents.toFixed(0)} cents · midi ${(69 + 12 * Math.log2(p.hz / 440)).toFixed(2)}`,
      C.muted,
      mono(12),
      "right",
    );
  }
}
