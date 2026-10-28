import { definePalette } from "./palette";

/** The colours of the simulated 320×170 TFT and of every "scope" style canvas. */
export const scopePalette = definePalette({
  paper: "--scope-paper",
  grid: "--scope-grid",
  ink: "--scope-ink",
  muted: "--scope-muted",
  dim: "--scope-dim",
  teal: "--scope-trace",
  amber: "--scope-amber",
  coral: "--scope-coral",
  blue: "--scope-blue",
  pink: "--scope-pink",
  violet: "--scope-violet",
  indigo: "--scope-indigo",
  card: "--card-white",
  chip: "--pcb",
});
export type ScopePalette = ReturnType<typeof scopePalette>;

export const SCREEN_W = 320;
export const SCREEN_H = 170;

export const MONO_FONT = "'IBM Plex Mono', monospace";
export const DISPLAY_FONT = "Archivo, sans-serif";

/** Draws text in one call: font, colour and alignment, then restores left alignment. */
export function drawText(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  font = `8px ${MONO_FONT}`,
  align: CanvasTextAlign = "left",
): void {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = align;
  g.fillText(text, x, y);
  g.textAlign = "left";
}

/** A canvas 2D context, or throws: every simulator canvas needs one. */
export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas 2D is not available in this browser");
  return g;
}
