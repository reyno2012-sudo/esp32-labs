// The drawing of labs/03-display/src/main.cpp: 2.5 s of RGB test bars, then the bench scope.
import { definePalette } from "@/lib/palette";
import { MONO_FONT } from "@/lib/canvas";

export const COLOUR_CHECK_MS = 2500;

export const displayPalette = definePalette({
  paper: "--scope-paper",
  grid: "--scope-grid",
  trace: "--scope-trace",
  ink: "--scope-ink",
  muted: "--scope-muted",
  amber: "--scope-amber",
  r: "--test-r",
  g: "--test-g",
  b: "--test-b",
  w: "--test-w",
});
type DisplayPalette = ReturnType<typeof displayPalette>;

/** Step 1: three bars, left to right red, green, blue. */
export function drawColourCheck(g: CanvasRenderingContext2D, C: DisplayPalette): void {
  g.textBaseline = "top";
  [C.r, C.g, C.b].forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(i * 106, 0, i === 2 ? 108 : 106, 170);
  });
  g.fillStyle = C.w;
  g.font = `16px ${MONO_FONT}`;
  g.fillText("RED    GREEN    BLUE", 52, 76);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "hh:mm:ss" of an uptime in ms. */
export function uptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** Step 2: the bench scope. `t` is the wave's time in seconds, `elapsed` the uptime in ms. */
export function drawScope(
  g: CanvasRenderingContext2D,
  C: DisplayPalette,
  t: number,
  elapsed: number,
  fps: number,
): void {
  g.textBaseline = "top";
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 320, 170);
  g.fillStyle = C.ink;
  g.font = `600 18px ${MONO_FONT}`;
  g.fillText("hello, bench", 8, 8);
  g.fillStyle = C.muted;
  g.font = `10px ${MONO_FONT}`;
  g.fillText("ESP32-S3 N16R8", 196, 8);
  g.fillText(`${Math.round(Math.min(fps, 22))} fps`, 196, 20);

  g.strokeStyle = C.grid;
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x < 320; x += 32) {
    g.moveTo(x + 0.5, 34);
    g.lineTo(x + 0.5, 170);
  }
  for (let y = 34; y < 170; y += 34) {
    g.moveTo(0, y + 0.5);
    g.lineTo(320, y + 0.5);
  }
  g.stroke();

  g.strokeStyle = C.trace;
  g.lineWidth = 1.4;
  g.beginPath();
  for (let x = 0; x < 320; x++) {
    const ph = x * 0.045 - t * 3;
    const y = Math.sin(ph) * 40 * (0.7 + 0.3 * Math.sin(t * 0.7)) + Math.sin(ph * 3.1) * 6;
    if (x) g.lineTo(x, 102 + y);
    else g.moveTo(x, 102 + y);
  }
  g.stroke();

  g.fillStyle = C.amber;
  g.font = `600 18px ${MONO_FONT}`;
  g.fillText(uptime(elapsed), 196, 148);
}
