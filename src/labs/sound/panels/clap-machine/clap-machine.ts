// S3 panel: is it a clap? The onset detector run over a loudness envelope, one 4 ms frame at a time.
import type { ScopePalette } from "@/lib/canvas";
import { labelWriter, levelColour, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { type OnsetEvent, OnsetDetector } from "../../model/onsets";

/** Frames shown: 1.2 s. */
export const N = 300;

export type EnvKey = "clap" | "double" | "soft" | "word" | "whistle";

const clapAt = (f: number, at: number, peak = 34) =>
  f >= at ? Math.max(0, peak - (f - at) * 2.4) : 0;

/** Each sound's loudness in dB above the quiet at frame f (its label: clapMachine.sounds.<key>). */
export const ENV: Readonly<Record<EnvKey, { db(f: number): number }>> = {
  clap: { db: (f) => clapAt(f, 40) },
  double: { db: (f) => Math.max(clapAt(f, 40), clapAt(f, 115, 31)) },
  soft: { db: (f) => clapAt(f, 40, 14) },
  word: {
    db: (f) =>
      f < 40 || f > 150
        ? 0
        : Math.min(1, (f - 40) / 8) *
          Math.min(1, (150 - f) / 10) *
          (16 + 8 * Math.abs(Math.sin((f - 40) / 14))),
  },
  whistle: {
    db: (f) =>
      f < 50 || f > 220 ? 0 : 22 * Math.min(1, (f - 50) / 10) * Math.min(1, (220 - f) / 10),
  },
};

export const randomJitter = () => Array.from({ length: N }, () => Math.random() * 2);

/** Runs the real rules from frame 0 to the cursor, draws it all, returns the caption. */
export function drawClapMachine(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  key: EnvKey,
  cursor: number,
  rise: number,
  rel: number,
  jitter: readonly number[],
  tr: SoundT,
): string {
  const T = textWriter(g);
  const W = labelWriter(g);
  const small = mono(10);
  const env = ENV[key];
  const level = (f: number) => env.db(f) + (jitter[f] ?? 0);
  const det = new OnsetDetector({ riseDb: rise, releaseDb: rel });
  const events: (OnsetEvent & { f: number })[] = [];
  for (let f = 0; f <= cursor; f++) {
    const e = det.push(level(f), f * 4);
    if (e) events.push({ ...e, f });
  }
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 330);
  const x0 = 70;
  const w = 590;
  const y0 = 20;
  const h = 160;
  const yOf = (d: number) => y0 + h - (Math.min(50, d) / 50) * h;
  for (let f = 0; f < N; f++) {
    const d = level(f);
    g.fillStyle = f <= cursor ? levelColour(C, d) : C.dim;
    g.fillRect(x0 + (f * w) / N, yOf(d), 2, y0 + h - yOf(d));
  }
  g.setLineDash([5, 4]);
  g.strokeStyle = C.ink;
  g.beginPath();
  g.moveTo(x0, yOf(rise));
  g.lineTo(x0 + w, yOf(rise));
  g.stroke();
  g.strokeStyle = C.muted;
  g.beginPath();
  g.moveTo(x0, yOf(rel));
  g.lineTo(x0 + w, yOf(rel));
  g.stroke();
  g.setLineDash([]);
  W(x0 - 4, yOf(rise) + 4, tr("clapMachine.rise"), C.ink, small, "right");
  W(x0 - 4, yOf(rel) + 4, tr("clapMachine.release"), C.muted, small, "right");
  g.fillStyle = C.ink;
  g.fillRect(x0 + (cursor * w) / N, y0 - 4, 1.5, h + 8);
  T(x0, y0 + h + 16, "0 ms", C.muted, small);
  T(x0 + w, y0 + h + 16, "1200 ms", C.muted, small, "right");
  T(x0 + (cursor * w) / N, y0 + h + 16, `${cursor * 4} ms`, C.ink, small, "center");
  for (const e of events) {
    const ex = x0 + (e.f * w) / N;
    const sx = x0 + ((e.ms / 4) * w) / N;
    if (e.kind === "onset") {
      g.fillStyle = C.ink;
      g.beginPath();
      g.moveTo(ex, y0 - 2);
      g.lineTo(ex + 7, y0 + 2);
      g.lineTo(ex, y0 + 6);
      g.fill();
    } else {
      g.fillStyle = e.kind === "clap" ? C.teal : C.amber;
      g.fillRect(sx, y0 + h + 2, Math.max(3, ex - sx), 4);
    }
  }
  drawStates(g, C, det.state, tr);
  const done = events.filter((e) => e.kind !== "onset");
  const sound = tr(`clapMachine.sounds.${key}`);
  if (done.length) {
    const results = done
      .map((e) =>
        e.kind === "clap"
          ? tr("clapMachine.result.clap", { ms: e.len, db: e.db })
          : tr("clapMachine.result.long", { ms: e.len }),
      )
      .join(" · ");
    return tr("clapMachine.caption.done", { sound, results });
  }
  if (det.state === "loud") return tr("clapMachine.caption.loud", { ms: det.start });
  return tr(key === "soft" ? "clapMachine.caption.soft" : "clapMachine.caption.nothing", { sound });
}

/** The three states and their arrows. */
function drawStates(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  state: string,
  tr: SoundT,
): void {
  const W = labelWriter(g);
  const small = mono(10);
  const states: readonly (readonly ["armed" | "loud" | "quiet", number])[] = [
    ["armed", 120],
    ["loud", 340],
    ["quiet", 560],
  ];
  for (const [s, x] of states) {
    const on = state === s;
    g.fillStyle = on ? C.pink : C.dim;
    g.globalAlpha = on ? 0.3 : 0.5;
    g.beginPath();
    g.arc(x, 250, 26, 0, 7);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = on ? C.pink : C.muted;
    g.lineWidth = on ? 2.5 : 1;
    g.beginPath();
    g.arc(x, 250, 26, 0, 7);
    g.stroke();
    g.lineWidth = 1;
    W(x, 254, tr(`clapMachine.states.${s}`), on ? C.ink : C.muted, mono(12, on), "center");
  }
  g.strokeStyle = C.muted;
  const arrows: readonly (readonly [number, number, string])[] = [
    [146, 314, tr("clapMachine.arrows.onset")],
    [366, 534, tr("clapMachine.arrows.end")],
  ];
  for (const [a, b, l] of arrows) {
    g.beginPath();
    g.moveTo(a, 250);
    g.lineTo(b, 250);
    g.lineTo(b - 6, 246);
    g.moveTo(b, 250);
    g.lineTo(b - 6, 254);
    g.stroke();
    W((a + b) / 2, 240, l, C.muted, small, "center");
  }
  g.beginPath();
  g.moveTo(560, 278);
  g.quadraticCurveTo(340, 330, 120, 278);
  g.stroke();
  W(340, 318, tr("clapMachine.arrows.rearm"), C.muted, small, "center");
}
