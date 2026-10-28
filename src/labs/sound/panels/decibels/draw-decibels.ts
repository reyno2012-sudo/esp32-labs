// S2 panel drawing: two waves (the quiet and a louder sound) and a decibel ruler.
import type { ScopePalette } from "@/lib/canvas";
import { labelWriter, levelColour, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { sndLike } from "../../model/level";

/** Draws the panel; returns the caption. `db` is dB above the quiet, `tt` the wave's phase time. */
export function drawDecibels(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  db: number,
  tt: number,
  tr: SoundT,
): string {
  const T = textWriter(g);
  const W = labelWriter(g);
  const ratio = Math.pow(10, db / 20);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 250);
  // Two waves on a log-ish visual scale so both stay visible: quiet = 4 px, loud = up to 90 px.
  const hq = 4;
  const hl = Math.min(90, hq * ratio);
  g.fillStyle = C.dim;
  g.fillRect(20, 100, 400, 1);
  const wave = (h: number) => {
    g.beginPath();
    for (let x = 0; x < 400; x++) {
      const y = 100 - h * Math.sin(x / 9 + tt * 4);
      if (x) g.lineTo(20 + x, y);
      else g.moveTo(20, y);
    }
    g.stroke();
  };
  g.strokeStyle = C.muted;
  wave(hq);
  g.strokeStyle = C.pink;
  g.lineWidth = 2;
  wave(hl);
  g.lineWidth = 1;
  if (hq * ratio > 90)
    W(24, 18, tr("decibels.tooTall", { px: Math.round(hq * ratio) }), C.amber);
  W(24, 214, tr("decibels.legend"), C.muted);
  // The ruler: 0-60 dB, the doublings and the tens.
  const x0 = 460;
  const yOf = (d: number) => 220 - d * 3.3;
  g.fillStyle = C.dim;
  g.fillRect(x0, yOf(60), 2, yOf(0) - yOf(60));
  const marks: readonly (readonly [number, string, "quiet" | "rustle" | "talking" | "clap" | ""])[] = [
    [0, "×1", "quiet"],
    [6, "×2", ""],
    [12, "×4", "rustle"],
    [20, "×10", "talking"],
    [26, "×20", ""],
    [40, "×100", "clap"],
    [60, "×1000", ""],
  ];
  for (const [d, r, w] of marks) {
    g.fillStyle = C.muted;
    g.fillRect(x0 - 4, yOf(d), 10, 1);
    T(x0 + 12, yOf(d) + 4, `${d} dB  ${r}`, C.ink, mono(10));
    if (w) W(x0 + 110, yOf(d) + 4, tr(`decibels.marks.${w}`), C.muted, mono(10));
  }
  g.fillStyle = levelColour(C, db);
  g.beginPath();
  g.moveTo(x0 - 6, yOf(db));
  g.lineTo(x0 - 16, yOf(db) - 6);
  g.lineTo(x0 - 16, yOf(db) + 6);
  g.fill();
  // sndLike is what S2's screen prints: it stays in English, like the board.
  return tr(ratio < 10 ? "decibels.caption" : "decibels.captionBig", {
    db,
    ratio,
    power: ratio * ratio,
    like: sndLike(db),
  });
}
