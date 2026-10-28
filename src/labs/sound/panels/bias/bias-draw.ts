// Where the wave sits in the ADC's range: a 0-3.3 V ruler, the shaded range, the bias line and a
// talk-like burst, clipped where it leaves the range.
import type { ScopePalette } from "@/lib/canvas";
import { labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { type Atten, SND_TOP } from "../../model/level";

export function drawBias(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  b: number,
  a: number,
  atten: Atten,
  tt: number,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  const top = SND_TOP[atten];
  const step = top / 4095;
  const yv = (v: number) => 240 - (v / 3300) * 220;
  const small = mono(10);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 260);
  g.fillStyle = C.dim;
  g.fillRect(70, yv(top), 40, yv(0) - yv(top));
  g.strokeStyle = C.muted;
  g.strokeRect(70, yv(3300), 40, yv(0) - yv(3300));
  for (const v of [0, 500, 1000, 1500, 2000, 2500, 3000, 3300]) {
    g.fillStyle = C.muted;
    g.fillRect(64, yv(v), 6, 1);
    T(60, yv(v) + 4, (v / 1000).toFixed(1), C.muted, small, "right");
  }
  W(90, yv(top) - 6, tr("bias.range", { v: top / 1000 }), C.teal, small, "center");
  g.strokeStyle = C.pink;
  g.beginPath();
  g.moveTo(66, yv(b));
  g.lineTo(660, yv(b));
  g.stroke();
  let clipped = false;
  for (let x = 130; x < 660; x++) {
    const ph = (x - 130) / 530;
    const env = 0.35 + 0.65 * Math.abs(Math.sin(ph * 3.1 + tt * 0.8));
    const v = b + a * env * Math.sin(ph * 70 + tt * 9);
    const seen = Math.max(0, Math.min(top, v));
    if (seen !== v) {
      clipped = true;
      g.fillStyle = C.coral;
      g.fillRect(x, yv(v) - 1, 1, 2);
    }
    g.fillStyle = seen !== v ? C.amber : C.ink;
    g.fillRect(x, yv(seen) - 1, 1.2, 2.4);
  }
  g.fillStyle = C.teal;
  g.globalAlpha = 0.12;
  g.fillRect(130, yv(top), 530, yv(0) - yv(top));
  g.globalAlpha = 1;
  const lo = b - a;
  const hi = b + a;
  const steps = Math.round((Math.min(top, hi) - Math.max(0, lo)) / step);
  let hint: string;
  if (lo <= 0 || hi >= top)
    hint = tr("bias.hint.clipping");
  else if (b > top - 150) hint = tr("bias.hint.nearTop");
  else if (atten === 12 && hi < 1600) hint = tr("bias.hint.try6");
  else if (atten === 6 && hi < 1150) hint = tr("bias.hint.try25");
  else hint = tr("bias.hint.good");
  W(130, 20, tr("bias.steps", { mv: step, steps }), C.ink);
  W(130, 38, hint, clipped || b > top - 150 ? C.amber : C.teal);
}
