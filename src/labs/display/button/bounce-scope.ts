// The scope under the button diagram: raw pin vs debounced level over the last 1.2 s, and a
// zoom on the first 7 ms of the last press where the bounces show.
import { MONO_FONT } from "@/lib/canvas";
import { definePalette } from "@/lib/palette";
import { type ButtonSignal, type Edge, levelAt } from "./button-signal";

export const bouncePalette = definePalette({ dim: "--term-dim", raw: "--w-scl", deb: "--w-dc" });
type BouncePalette = ReturnType<typeof bouncePalette>;

const WINDOW_MS = 1200;

function trace(
  g: CanvasRenderingContext2D,
  list: readonly Edge[],
  t0: number,
  t1: number,
  x0: number,
  x1: number,
  y: number,
  color: string,
  now: number,
) {
  const sx = (t: number) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0);
  const yy = (low: boolean) => (low ? y + 14 : y - 14);
  const end = Math.min(t1, now);
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  let level = levelAt(list, t0);
  g.moveTo(x0, yy(level));
  for (const e of list) {
    if (e.t <= t0 || e.t > end) continue;
    g.lineTo(sx(e.t), yy(level));
    level = e.low;
    g.lineTo(sx(e.t), yy(level));
  }
  g.lineTo(sx(end), yy(level));
  g.stroke();
}

/** The translated annotations drawn on the scope, and the document's direction. */
export interface BounceLabels {
  readonly raw: string;
  readonly debounced: string;
  readonly window: string;
  readonly zoom: string;
  readonly spike: string;
  readonly capture: string;
  readonly dir: CanvasDirection;
}

export function drawBounceScope(
  g: CanvasRenderingContext2D,
  C: BouncePalette,
  signal: ButtonSignal,
  now: number,
  L: BounceLabels,
): void {
  const { width, height } = g.canvas;
  g.clearRect(0, 0, width, height);
  g.font = `600 11px ${MONO_FONT}`;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.direction = L.dir;
  const X0 = 70;
  const X1 = 450;
  const W0 = now - WINDOW_MS;
  g.fillStyle = C.dim;
  g.fillText(L.raw, 4, 46);
  g.fillText(L.debounced, 4, 116);
  // Logic levels, as the code names them: English.
  g.fillText("HIGH", X0 - 34, 32);
  g.fillText("LOW", X0 - 30, 60);
  g.fillText(L.window, X0, 176);
  trace(g, signal.edges, W0, now, X0, X1, 46, C.raw, now);
  trace(g, signal.deb, W0, now, X0, X1, 116, C.deb, now);

  const ZX0 = 480;
  const ZX1 = 672;
  g.strokeStyle = C.dim;
  g.lineWidth = 1;
  g.strokeRect(ZX0 - 6.5, 18.5, ZX1 - ZX0 + 12, 150);
  g.fillStyle = C.dim;
  g.fillText(L.zoom, ZX0, 30);
  if (signal.lastPressT !== null) {
    trace(
      g,
      signal.edges,
      signal.lastPressT - 0.3,
      signal.lastPressT + 7,
      ZX0,
      ZX1,
      90,
      C.raw,
      now,
    );
    g.fillText(L.spike, ZX0, 150);
  } else g.fillText(L.capture, ZX0, 90);
}
