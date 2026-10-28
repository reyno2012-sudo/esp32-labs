import { DISPLAY_FONT, drawText, MONO_FONT, type ScopePalette } from "@/lib/canvas";
import { annotationDirection, type BleT } from "../../i18n";
import { SPAN, type TimingSettings, type TimingSim } from "./timing-sim";

export const TIMING_W = 680;
export const TIMING_H = 220;

/** Three channel lanes, the scanner's windows as bands, events caught (teal) or missed (grey). */
export function drawTiming(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  sim: TimingSim,
  s: TimingSettings,
  t: BleT,
): void {
  const { simT } = sim;
  g.direction = annotationDirection();
  const small = `9px ${MONO_FONT}`;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, TIMING_W, TIMING_H);
  const X = (at: number) => 60 + ((at - (simT - SPAN)) / SPAN) * 610;
  const lanes = [
    ["37", "2402 MHz"],
    ["38", "2426 MHz"],
    ["39", "2480 MHz"],
  ] as const;
  lanes.forEach(([n, f], c) => {
    const y = 30 + c * 50;
    g.fillStyle = C.dim;
    g.fillRect(60, y + 18, 610, 1);
    drawText(g, 6, y + 16, t("radio.draw.channel", { ch: n }), C.ink, `bold 12px ${DISPLAY_FONT}`);
    drawText(g, 6, y + 28, f, C.muted, small);
  });
  // The scanner's windows: a band on the lane it listens to.
  for (let k = Math.floor((simT - SPAN) / s.si); k * s.si < simT; k++) {
    const c = ((k % 3) + 3) % 3;
    const t0 = k * s.si;
    const x0 = Math.max(60, X(t0));
    const x1 = Math.min(670, X(Math.min(t0 + s.win, simT)));
    if (x1 <= x0) continue;
    g.fillStyle = C.teal;
    g.globalAlpha = 0.16;
    g.fillRect(x0, 30 + c * 50 + 4, x1 - x0, 28);
    g.globalAlpha = 1;
  }
  for (const e of sim.events)
    for (let c = 0; c < 3; c++) {
      const x = X(e.t + c * 0.4);
      const y = 30 + c * 50;
      const hit = e.hit[c];
      g.fillStyle = hit ? C.teal : C.muted;
      g.fillRect(x - 1.5, y + 6, 3, 24);
      if (hit) {
        g.strokeStyle = C.teal;
        g.beginPath();
        g.arc(x, y + 18, 7, 0, 7);
        g.stroke();
      }
    }
  g.fillStyle = C.amber;
  g.fillRect(669, 26, 2, 150);
  drawText(g, 646, 188, t("timing.draw.now"), C.amber, small);
  drawText(g, 60, 188, t("timing.draw.span", { ms: SPAN }), C.muted, small);
  g.fillStyle = C.teal;
  g.globalAlpha = 0.3;
  g.fillRect(60, 198, 12, 10);
  g.globalAlpha = 1;
  drawText(g, 78, 207, t("timing.draw.listening"), C.muted, small);
  g.fillStyle = C.teal;
  g.fillRect(200, 198, 3, 10);
  drawText(g, 208, 207, t("timing.draw.caught"), C.muted, small);
  g.fillStyle = C.muted;
  g.fillRect(270, 198, 3, 10);
  drawText(g, 278, 207, t("timing.draw.missed"), C.muted, small);
}
