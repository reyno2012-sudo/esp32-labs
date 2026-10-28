// S5 panel: a sound of up to three sines plus noise, its samples and the FFT's bins.
import type { ScopePalette } from "@/lib/canvas";
import { labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { type Fft, hann } from "../../model/fft";
import { noteOf } from "../../model/tune";

export const FFT_RATE = 16000;

export function drawFftExplainer(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  fft: Fft,
  s: Float32Array,
  windowed: boolean,
  anyTone: boolean,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  const n = fft.n;
  const rate = FFT_RATE;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 330);
  const ms = Math.round((n / rate) * 1000);
  W(20, 16, tr(windowed ? "fft.samplesWindowed" : "fft.samples", { n, ms }), C.muted);
  g.fillStyle = C.dim;
  g.fillRect(20, 70, 640, 1);
  g.strokeStyle = C.pink;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = 20 + (i / n) * 640;
    const y = 70 - ((s[i] ?? 0) / 24000) * 48 * (windowed ? hann(i, n) : 1);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  if (windowed) {
    g.setLineDash([4, 4]);
    g.strokeStyle = C.muted;
    g.beginPath();
    for (let i = 0; i < n; i += 4) {
      const x = 20 + (i / n) * 640;
      const y = 70 - 48 * hann(i, n);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    g.setLineDash([]);
  }
  // Bins: linear 0-8 kHz, one bar per bin (thin at 1024).
  const bins = n / 2;
  const x0 = 20;
  const w = 640;
  const yb = 290;
  const hb = 170;
  const yOf = (db: number) => yb - Math.max(0, Math.min(1, (db + 80) / 80)) * hb;
  for (let k = 1; k < bins; k++) {
    const x = x0 + (k / bins) * w;
    g.fillStyle = C.teal;
    g.fillRect(x, yOf(fft.db(k)), Math.max(1, w / bins - 0.5), yb - yOf(fft.db(k)));
  }
  for (const d of [-20, -40, -60]) {
    g.fillStyle = C.dim;
    g.fillRect(x0, yOf(d), w, 1);
    T(x0 + w, yOf(d) - 2, `${d} dB`, C.muted, mono(10), "right");
  }
  for (const f of [0, 1000, 2000, 4000, 6000, 8000])
    T(x0 + (f / 8000) * w, yb + 14, f ? `${f / 1000}k` : "0", C.muted, mono(10), "center");
  const p = fft.peak(rate, 80, 7900);
  const nt = noteOf(p.hz);
  if (anyTone) {
    const px = x0 + (p.hz / 8000) * w;
    g.fillStyle = C.ink;
    g.fillRect(px, yOf(p.db) - 14, 1, 10);
    T(px, yOf(p.db) - 18, `${p.hz.toFixed(1)} Hz`, C.ink, mono(11), "center");
  }
  const cents = `${nt.cents >= 0 ? "+" : ""}${nt.cents.toFixed(0)}`;
  W(
    20,
    326,
    tr("fft.bins", { apart: rate / n, bins, hz: p.hz, note: nt.name, cents }),
    C.ink,
  );
}
