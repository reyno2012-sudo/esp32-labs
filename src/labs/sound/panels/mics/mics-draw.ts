// Analog mic vs digital mic, and one I2S frame carrying a sample on SCK, WS and SD.
import type { ScopePalette } from "@/lib/canvas";
import { display, labelWriter, mono, type TextFn, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";

const hex = (v: number, n: number) =>
  (v >>> 0).toString(16).toUpperCase().padStart(n, "0").slice(-n);

/** A 24-bit sample from the slider (-100..100): a sliver of full scale, real voices are small. */
export const sampleOf = (slider: number) => Math.round((slider / 100) * 0.02 * 8388607) | 0;

function lane(
  g: CanvasRenderingContext2D,
  T: TextFn,
  C: ScopePalette,
  y: number,
  title: string,
  col: string,
  boxes: readonly (readonly [string, string])[],
): void {
  T(12, y + 22, title, col, display(12));
  boxes.forEach(([a, b], i) => {
    const x = 130 + i * 110;
    g.strokeStyle = col;
    g.beginPath();
    g.roundRect(x, y, 100, 36, 7);
    g.stroke();
    T(x + 50, y + 15, a, C.ink, mono(11), "center");
    T(x + 50, y + 29, b, C.muted, mono(9), "center");
    if (i) {
      g.fillStyle = col;
      g.fillRect(x - 10, y + 18, 10, 1.5);
    }
  });
}

export function drawMics(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  s24: number,
  tick: number,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  const small = mono(9);
  const slot = (s24 << 8) >>> 0; // the 32-bit left slot: 24 data bits, then 8 zeros
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 360);
  // The two paths.
  lane(g, W, C, 8, "KY-037", C.pink, [
    [tr("mics.lane.capsule"), tr("mics.lane.fewMv")],
    [tr("mics.lane.plusBias"), tr("mics.lane.onAo")],
    ["ESP32 ADC", tr("mics.lane.adcBits")],
    [tr("mics.lane.minusAverage"), tr("mics.lane.dmaRing")],
    ["× 16", "int16"],
  ]);
  lane(g, W, C, 54, "INMP441", C.teal, [
    [tr("mics.lane.capsule"), tr("mics.lane.ownAmp")],
    [tr("mics.lane.adc24"), tr("mics.lane.insideMic")],
    [tr("mics.lane.frames"), "SCK · WS · SD"],
    [">> 8", tr("mics.lane.sample24")],
    [">> 6", "int16 (+12 dB)"],
  ]);
  // The I2S frame: 64 SCK ticks = left slot (32) + right slot (32).
  const x0 = 70;
  const w = 600;
  const tw = w / 64;
  const yS = 128;
  const yW = 160;
  const yD = 192;
  T(12, yS + 12, "SCK", C.muted);
  T(12, yW + 12, "WS", C.muted);
  T(12, yD + 12, "SD", C.muted);
  g.strokeStyle = C.ink;
  g.beginPath();
  for (let i = 0; i < 64; i++) {
    const x = x0 + i * tw;
    g.moveTo(x, yS + 16);
    g.lineTo(x, yS);
    g.lineTo(x + tw / 2, yS);
    g.lineTo(x + tw / 2, yS + 16);
    g.lineTo(x + tw, yS + 16);
  }
  g.stroke();
  g.strokeStyle = C.amber;
  g.beginPath();
  g.moveTo(x0, yW + 16);
  g.lineTo(x0 + 32 * tw, yW + 16);
  g.lineTo(x0 + 32 * tw, yW);
  g.lineTo(x0 + w, yW);
  g.stroke();
  W(x0 + 16 * tw, yW - 2, tr("mics.frame.left"), C.amber, small, "center");
  W(x0 + 48 * tw, yW - 2, tr("mics.frame.right"), C.muted, small, "center");
  // SD: bit k of the slot goes out on tick k+1 (Philips: one tick after WS changes).
  for (let i = 0; i < 64; i++) {
    const x = x0 + i * tw;
    const k = i - 1;
    const bit = k >= 0 && k < 32 ? (slot >>> (31 - k)) & 1 : 0;
    const data = k >= 0 && k < 24;
    g.fillStyle = data && i <= tick ? C.teal : C.dim;
    g.globalAlpha = data ? 1 : 0.45;
    g.fillRect(x + 1, bit ? yD : yD + 12, tw - 2, 4);
    g.globalAlpha = 1;
    if (data && i <= tick && tw > 8) T(x + tw / 2, yD + 28, String(bit), C.ink, small, "center");
  }
  g.fillStyle = C.pink;
  g.fillRect(x0 + tick * tw, yS - 6, 1.5, yD + 34 - yS);
  W(x0, yD + 46, tr("mics.frame.firstBit"), C.muted, small);
  W(x0 + 25 * tw, yD + 46, tr("mics.frame.padding"), C.muted, small);
  // What the board does with it.
  const got = Math.min(24, Math.max(0, tick));
  const partial = got ? slot >>> (32 - got) : 0;
  const y = 278;
  const soFar = tr("mics.read.soFar", { got });
  W(12, y, soFar, C.ink);
  // The bits themselves, after the sentence (W left the font set for measuring).
  if (got) T(26 + g.measureText(soFar).width, y, partial.toString(2).padStart(got, "0"), C.ink);
  if (tick >= 25) {
    const dbfs = 20 * Math.log10(Math.max(1, Math.abs(s24 >> 6)) / 32768);
    T(
      12,
      y + 20,
      `left slot = 0x${hex(slot, 8)}  →  >> 8 = ${s24} (24-bit, ±8 388 608)  →  >> 6 = ${s24 >> 6} (int16)`,
      C.teal,
    );
    W(
      12,
      y + 40,
      tr("mics.read.level", { dbfs, spl: dbfs + 111 }),
      C.muted,
      mono(10),
    );
  }
  W(
    12,
    y + 64,
    tr("mics.read.clock"),
    C.muted,
    mono(10),
  );
}
