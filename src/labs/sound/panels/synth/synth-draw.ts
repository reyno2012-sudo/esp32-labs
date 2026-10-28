// The synth panel's picture: four periods of the wave, its harmonics (folded ones in coral) and
// the ADSR envelope with its four handles.
import type { ScopePalette } from "@/lib/canvas";
import { labelParagraph, labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { harmonic, waveShape } from "../../model/synth";
import type { Wave } from "../../model/speaker";

export type SynthWave = Exclude<Wave, "noise">;
export type HandleKey = "a" | "d" | "s" | "r";

export interface Envelope {
  a: number;
  d: number;
  /** Sustain level 0..1. */
  s: number;
  r: number;
}

export const W = 680;
export const H = 300;
// The envelope's area.
const EX = 360;
const EW = 310;
const EY = 188;
const EH = 90;
const HOLD = 250;
/** How long a key's note lasts, ms. */
export const NOTE_MS = 600;

const total = (e: Envelope) => e.a + e.d + HOLD + e.r;
const xMs = (e: Envelope, ms: number) => EX + (ms / Math.max(800, total(e))) * EW;
const yA = (a: number) => EY + EH - a * EH;

export function handles(e: Envelope): { k: HandleKey; x: number; y: number }[] {
  return [
    { k: "a", x: xMs(e, e.a), y: yA(1) },
    { k: "d", x: xMs(e, e.a + e.d), y: yA(e.s) },
    { k: "s", x: xMs(e, e.a + e.d + HOLD), y: yA(e.s) },
    { k: "r", x: xMs(e, total(e)), y: yA(0) },
  ];
}

/** The handle within reach of a canvas point, if any. */
export const handleAt = (e: Envelope, x: number, y: number) =>
  handles(e).find((h) => Math.hypot(h.x - x, h.y - y) < 14)?.k ?? null;

/** Moves a handle to a canvas point. */
export function dragHandle(e: Envelope, k: HandleKey, x: number, y: number): void {
  const ms = Math.max(1, ((x - EX) / EW) * Math.max(800, total(e)));
  const level = Math.max(0, Math.min(1, (EY + EH - y) / EH));
  if (k === "a") e.a = Math.min(400, ms);
  if (k === "d") {
    e.d = Math.max(1, Math.min(600, ms - e.a));
    e.s = level;
  }
  if (k === "s") e.s = level;
  if (k === "r") e.r = Math.max(5, Math.min(800, ms - e.a - e.d - HOLD));
}

/** Draws everything; returns how many harmonics fold back above 8 kHz. */
export function drawSynth(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  wave: SynthWave,
  hz: number,
  e: Envelope,
  drag: HandleKey | null,
  dotAt: number | null,
  tr: SoundT,
): number {
  const T = textWriter(g);
  const L = labelWriter(g);
  const small = mono(10);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  L(14, 18, tr("synth.periods"), C.muted);
  g.strokeStyle = C.pink;
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= 320; x++) {
    const y = 80 - waveShape(wave, (x / 320) * 4) * 50;
    if (x) g.lineTo(14 + x, y);
    else g.moveTo(14, y);
  }
  g.stroke();
  g.lineWidth = 1;
  // Harmonics: up to 8 kHz in pink; above it, where they fold back to at 16 kHz (aliasing), in coral.
  L(360, 18, tr("synth.harmonics"), C.muted);
  g.fillStyle = C.dim;
  g.fillRect(360, 140, 310, 1);
  let aliased = 0;
  for (let n = 1; n <= 40; n++) {
    const a = harmonic(wave, n);
    if (!a) continue;
    let f = n * hz;
    const real = f <= 8000;
    if (!real) {
      f = Math.abs(16000 * Math.round(f / 16000) - f);
      aliased++;
      if (f > 8000) continue;
    }
    const h = Math.max(1, (1 + Math.log10(a) / 2.5) * 110);
    if (h <= 1) continue;
    g.fillStyle = real ? C.pink : C.coral;
    g.globalAlpha = real ? 1 : 0.7;
    g.fillRect(360 + (f / 8000) * 310, 140 - h, 2.5, h);
    g.globalAlpha = 1;
  }
  [0, 2000, 4000, 6000, 8000].forEach((f) =>
    T(360 + (f / 8000) * 310, 154, f ? `${f / 1000}k` : "0", C.muted, mono(9), "center"),
  );
  // The envelope.
  L(14, 186, tr("synth.adsr"), C.muted);
  labelParagraph(g, 14, 206, tr("synth.click"), { maxW: 330, lineH: 16, col: C.muted, font: small });
  const hs = handles(e);
  const cols = [C.teal, C.amber, C.pink, C.coral];
  g.fillStyle = C.dim;
  g.fillRect(EX, EY + EH, EW, 1);
  let px = EX;
  let py = yA(0);
  hs.forEach((h, i) => {
    g.strokeStyle = cols[i] ?? C.pink;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(h.x, h.y);
    g.stroke();
    g.lineWidth = 1;
    px = h.x;
    py = h.y;
  });
  hs.forEach((h, i) => {
    const col = cols[i] ?? C.pink;
    g.fillStyle = col;
    g.beginPath();
    g.arc(h.x, h.y, drag === h.k ? 8 : 6, 0, 7);
    g.fill();
    T(h.x, h.y - 10, "ADSR"[i] ?? "", col, mono(10, true), "center");
  });
  if (dotAt !== null) {
    const ms = performance.now() - dotAt;
    const held = NOTE_MS - e.r;
    let x: number;
    let a: number;
    if (ms < e.a) {
      x = xMs(e, ms);
      a = ms / e.a;
    } else if (ms < e.a + e.d) {
      x = xMs(e, ms);
      a = 1 - ((1 - e.s) * (ms - e.a)) / e.d;
    } else if (ms < held) {
      x = xMs(e, Math.min(ms, e.a + e.d + HOLD));
      a = e.s;
    } else {
      const k = Math.min(1, (ms - held) / e.r);
      x = xMs(e, e.a + e.d + HOLD + k * e.r);
      a = e.s * (1 - k);
    }
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(x, yA(a), 4, 0, 7);
    g.fill();
  }
  return aliased;
}

export function synthCaption(wave: SynthWave, aliased: number, tr: SoundT): string {
  const what = tr(`synth.what.${wave}`);
  return aliased
    ? tr("synth.captionAliased", { what, count: aliased })
    : tr("synth.caption", { what });
}
