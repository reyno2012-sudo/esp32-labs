// S4 panel: voice-activated recording, step by step, over a 9 s scene.
import type { ScopePalette } from "@/lib/canvas";
import { display, labelWriter, levelColour, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { type TriggerAction, VoiceTrigger } from "../../model/trigger";

/** 9 s, one point per 20 ms. */
export const LEN = 9000;
export const FR = 20;

/** The scene, dB above the quiet: a door bang, then a sentence with a short pause in it. */
export function scenePoints(): number[] {
  const lvl = (ms: number) => {
    let d = Math.random() * 3;
    if (ms >= 1500 && ms < 1560) d = 38 - (ms - 1500) * 0.5;
    if (ms >= 3200 && ms < 6000 && !(ms >= 4300 && ms < 4700))
      d = Math.max(d, 12 + 14 * Math.abs(Math.sin((ms - 3200) / 110)));
    return d;
  };
  return Array.from({ length: LEN / FR }, (_, i) => lvl(i * FR));
}

interface Clip {
  readonly action: TriggerAction;
  readonly from: number;
  readonly to: number;
  readonly trig: number;
}

/** Runs the trigger up to the cursor, draws the timeline, returns the caption. */
export function drawRecorder(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  pts: readonly number[],
  cursor: number,
  trig: number,
  hold: number,
  tr: SoundT,
): string {
  const T = textWriter(g);
  const W = labelWriter(g);
  const small = mono(10);
  const vt = new VoiceTrigger({ startDb: trig, holdMs: hold });
  vt.arm(true);
  const clips: Clip[] = [];
  let open: { from: number; trig: number } | null = null;
  for (let ms = 0; ms <= cursor; ms += FR) {
    const r = vt.push(pts[ms / FR] ?? 0, ms);
    if (r && r.action === "start") open = { from: r.from, trig: ms };
    else if (r) {
      clips.push({ ...r, trig: open?.trig ?? r.from });
      open = null;
    }
  }
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 300);
  const x0 = 40;
  const w = 620;
  const y0 = 40;
  const h = 150;
  const xOf = (ms: number) => x0 + (ms / LEN) * w;
  const yOf = (d: number) => y0 + h - (Math.min(45, d) / 45) * h;
  // Clip spans behind the envelope: amber = pre-roll (from before the trigger), red = recorded.
  const span = (from: number, trigAt: number, to: number, col: string) => {
    g.globalAlpha = 0.22;
    g.fillStyle = C.amber;
    g.fillRect(xOf(from), y0, xOf(trigAt) - xOf(from), h);
    g.fillStyle = col;
    g.fillRect(xOf(trigAt), y0, xOf(to) - xOf(trigAt), h);
    g.globalAlpha = 1;
  };
  clips.forEach((c) => span(c.from, c.trig, c.to, c.action === "save" ? C.coral : C.dim));
  if (open) span(open.from, open.trig, cursor, C.coral);
  pts.forEach((d, i) => {
    const ms = i * FR;
    g.fillStyle = ms <= cursor ? levelColour(C, d) : C.dim;
    g.fillRect(xOf(ms), yOf(d), Math.max(1, w / pts.length - 0.3), y0 + h - yOf(d));
  });
  g.setLineDash([5, 4]);
  g.strokeStyle = C.ink;
  g.beginPath();
  g.moveTo(x0, yOf(trig));
  g.lineTo(x0 + w, yOf(trig));
  g.stroke();
  g.strokeStyle = C.muted;
  g.beginPath();
  g.moveTo(x0, yOf(trig * 0.6));
  g.lineTo(x0 + w, yOf(trig * 0.6));
  g.stroke();
  g.setLineDash([]);
  W(x0 - 4, yOf(trig) + 4, tr("recorder.start"), C.ink, small, "right");
  W(x0 - 4, yOf(trig * 0.6) + 4, tr("recorder.quiet"), C.muted, small, "right");
  g.fillStyle = C.ink;
  g.fillRect(xOf(cursor), y0 - 6, 1.5, h + 12);
  for (let s = 0; s <= 9; s++) T(xOf(s * 1000), y0 + h + 14, `${s} s`, C.muted, small, "center");
  // The ring: always the last 4 s, whatever the state.
  const ringFrom = xOf(Math.max(0, cursor - 4000));
  g.fillStyle = C.violet;
  g.globalAlpha = 0.25;
  g.fillRect(ringFrom, y0 + h + 22, xOf(cursor) - ringFrom, 8);
  g.globalAlpha = 1;
  W(
    ringFrom + 4,
    y0 + h + 44,
    tr("recorder.ring"),
    C.violet,
    small,
  );
  // State, hold timer, results.
  const rec = vt.state === "rec";
  T(
    x0,
    24,
    rec ? `REC ${((cursor - vt.from) / 1000).toFixed(1)} s` : "ARMED",
    rec ? C.coral : C.teal,
    display(16),
  );
  if (rec) {
    const quiet = cursor - vt.lastLoud;
    const k = Math.min(1, quiet / hold);
    g.strokeStyle = C.dim;
    g.strokeRect(160.5, 12.5, 160, 10);
    g.fillStyle = C.amber;
    g.fillRect(161, 13, 158 * k, 9);
    W(
      330,
      22,
      quiet > 100
        ? tr("recorder.holding", { quiet: quiet / 1000, hold: hold / 1000 })
        : tr("recorder.loud"),
      C.muted,
      small,
    );
  }
  clips.forEach((c, i) => {
    const saved = clips.filter((x, k) => k <= i && x.action === "save").length;
    const text =
      c.action === "save"
        ? tr("recorder.saved", { n: saved, s: (c.to - c.from) / 1000 })
        : tr("recorder.dropped", { s: c.trig / 1000 });
    W(680 - 10, 18 + i * 14, text, c.action === "save" ? C.coral : C.muted, small, "right");
  });
  if (rec) return tr("recorder.caption.rec");
  return clips.some((c) => c.action === "save")
    ? tr("recorder.caption.saved")
    : tr("recorder.caption.armed");
}
