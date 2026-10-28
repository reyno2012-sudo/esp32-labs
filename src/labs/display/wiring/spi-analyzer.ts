// One real SPI transfer to the ST7789, as a logic analyzer shows it: CS low, the command 0x2C
// with DC low, then the pixel 0xF800 (one red pixel) with DC high.
import { MONO_FONT } from "@/lib/canvas";
import { definePalette } from "@/lib/palette";

export interface SpiByte {
  readonly v: number;
  readonly dc: 0 | 1;
  readonly label: string;
  /** What the byte means; the component words it (labs-display analyzer.notes). */
  readonly note: "command" | "high" | "low";
}

export const BYTES: readonly SpiByte[] = [
  { v: 0x2c, dc: 0, label: "0x2C", note: "command" },
  { v: 0xf8, dc: 1, label: "0xF8", note: "high" },
  { v: 0x00, dc: 1, label: "0x00", note: "low" },
];

/** One clock period on the bus. `bit` is null while nothing is clocked out. */
export interface Slot {
  readonly cs: 0 | 1;
  readonly dc: 0 | 1;
  readonly bit: 0 | 1 | null;
  /** Index into BYTES, -1 when idle. */
  readonly byte: number;
  /** Bit number 7..0 within the byte. */
  readonly k?: number;
}

export function buildSlots(bytes: readonly SpiByte[] = BYTES): Slot[] {
  const slots: Slot[] = [];
  const idle = (n: number, cs: 0 | 1) => {
    for (let i = 0; i < n; i++) slots.push({ cs, dc: slots.at(-1)?.dc ?? 0, bit: null, byte: -1 });
  };
  idle(3, 1);
  idle(1, 0);
  bytes.forEach((b, bi) => {
    for (let k = 7; k >= 0; k--)
      slots.push({ cs: 0, dc: b.dc, bit: (b.v >> k) & 1 ? 1 : 0, byte: bi, k });
    if (bi === 0) slots.push({ cs: 0, dc: 1, bit: null, byte: -1 });
  });
  idle(1, 0);
  idle(3, 1);
  return slots;
}

export const SLOTS = buildSlots();
export const MS_PER_SLOT = 220;
/** Where the playhead rests with reduced motion: two bits into the command byte. */
export const STILL_SLOT = SLOTS.findIndex((s) => s.byte === 0) + 2;

/** A caption line: a dim key, then its value. */
export type CaptionLine = readonly [key: string, value: string];

/** What the caption under the analyzer explains while the playhead is on a slot. */
export type SlotCaption =
  | { readonly kind: "bit"; readonly byte: SpiByte; readonly k: number; readonly bit: 0 | 1 }
  | { readonly kind: "ignored" }
  | { readonly kind: "listening" };

export function slotCaption(slot: Slot | undefined): SlotCaption {
  const b = slot && slot.bit !== null ? BYTES[slot.byte] : undefined;
  if (slot && b && slot.bit !== null) return { kind: "bit", byte: b, k: slot.k ?? 0, bit: slot.bit };
  return slot?.cs ? { kind: "ignored" } : { kind: "listening" };
}

export const analyzerPalette = definePalette({
  dim: "--term-dim",
  warn: "--term-warn",
  cs: "--w-cs",
  dc: "--w-dc",
  scl: "--w-scl",
  sda: "--w-sda",
  playhead: "--scope-amber",
});
type AnalyzerPalette = ReturnType<typeof analyzerPalette>;

const LX = 52;
const HI = 12;
const ROWS = [
  { name: "CS", c: "cs" },
  { name: "DC", c: "dc" },
  { name: "SCL", c: "scl" },
  { name: "SDA", c: "sda" },
] as const;
const rowY = (r: number) => 52 + r * 38;

/** The translated words drawn over the byte boxes, and the document's direction. */
export interface AnalyzerLabels {
  readonly data: string;
  readonly cmd: string;
  readonly dir: CanvasDirection;
}

/** Draws the four traces, the byte boxes and the playhead at slot position `pos` (fractional). */
export function drawAnalyzer(
  g: CanvasRenderingContext2D,
  C: AnalyzerPalette,
  pos: number,
  labels: AnalyzerLabels,
  slots: readonly Slot[] = SLOTS,
): void {
  const { width, height } = g.canvas;
  const SW = (width - LX - 8) / slots.length;
  g.clearRect(0, 0, width, height);
  g.font = `600 12px ${MONO_FONT}`;
  g.textBaseline = "middle";

  BYTES.forEach((b, bi) => {
    const x = LX + slots.findIndex((s) => s.byte === bi) * SW;
    g.strokeStyle = C.dim;
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, 8.5, SW * 8 - 1, 22);
    g.fillStyle = b.dc ? C.dc : C.warn;
    g.direction = labels.dir;
    g.textAlign = "left";
    g.fillText(`${b.label} ${b.dc ? labels.data : labels.cmd}`, x + 6, 20);
    g.direction = "ltr";
  });

  ROWS.forEach((r, ri) => {
    const y = rowY(ri);
    g.fillStyle = C.dim;
    g.fillText(r.name, 6, y);
    g.strokeStyle = C[r.c];
    g.lineWidth = 2;
    g.beginPath();
    slots.forEach((s, i) => {
      const x = LX + i * SW;
      if (r.name === "SCL") {
        const ya = y + HI;
        const yb = y - HI;
        if (s.bit === null) {
          if (i) g.lineTo(x, ya);
          else g.moveTo(x, ya);
          g.lineTo(x + SW, ya);
        } else {
          g.lineTo(x, ya);
          g.lineTo(x + SW / 2, ya);
          g.lineTo(x + SW / 2, yb);
          g.lineTo(x + SW, yb);
          g.lineTo(x + SW, ya);
        }
        return;
      }
      const level = r.name === "CS" ? s.cs : r.name === "DC" ? s.dc : (s.bit ?? 0);
      const yy = level ? y - HI : y + HI;
      if (i) g.lineTo(x, yy);
      else g.moveTo(x, yy);
      g.lineTo(x + SW, yy);
    });
    g.stroke();
  });

  g.font = `10px ${MONO_FONT}`;
  g.fillStyle = C.dim;
  slots.forEach((s, i) => {
    if (s.bit !== null) g.fillText(String(s.bit), LX + i * SW + SW / 2 - 3, rowY(3) + 26);
  });

  const px = LX + pos * SW;
  g.fillStyle = C.playhead;
  g.globalAlpha = 0.18;
  g.fillRect(px, 36, SW, height - 40);
  g.globalAlpha = 1;
  g.strokeStyle = C.playhead;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(px + 0.5, 36);
  g.lineTo(px + 0.5, height - 4);
  g.stroke();
}
