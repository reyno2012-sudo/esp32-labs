// The parrot panel's picture: what it heard on top, what it says below, a playhead, the REC timer.
import type { ScopePalette } from "@/lib/canvas";
import { drawWave, labelWriter, mono, textWriter } from "../../kit/draw";

export const W = 680;
export const H = 220;

export interface ParrotPicture {
  heard: Float32Array;
  /** Translated lane labels. */
  heardLabel: string;
  says: Float32Array;
  saysLabel: string;
  /** 0..1 through the playback, or null when nothing plays. */
  playhead: number | null;
  /** Seconds recorded so far, or null when not recording. */
  recSecs: number | null;
}

function lane(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  y: number,
  s: Float32Array,
  col: string,
  label: string,
): void {
  labelWriter(g)(60, y - 4, label, C.muted, mono(10));
  // The scale from every 64th sample, like the original: cheap and close enough.
  let k = 1e-3;
  for (let i = 0; i < s.length; i += 64) k = Math.max(k, Math.abs(s[i] ?? 0));
  drawWave(g, 60, y, 600, 70, s, s.length, k * 1.1, col);
}

export function drawParrot(g: CanvasRenderingContext2D, C: ScopePalette, p: ParrotPicture): void {
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  lane(g, C, 22, p.heard, C.teal, p.heardLabel);
  lane(g, C, 126, p.says, C.pink, p.saysLabel);
  if (p.playhead !== null) {
    g.fillStyle = C.ink;
    g.fillRect(60 + p.playhead * 600, 120, 1.5, 80);
  }
  if (p.recSecs !== null)
    textWriter(g)(660, 16, `● REC ${p.recSecs.toFixed(1)} s`, C.coral, mono(12, true), "right");
}
