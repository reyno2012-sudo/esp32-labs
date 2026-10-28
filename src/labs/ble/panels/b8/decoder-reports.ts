// The reports the decoder panel sends, built from a parsed Report Map.
import { buildReport, type HidField, type ParsedHid } from "../../protocol/hid";

/** A keyboard report: modifier bits from `mods`, the key codes in the array field. */
export const keyReport = (
  parsed: ParsedHid,
  id: number,
  mods: number,
  keys: readonly number[],
): number[] =>
  buildReport(parsed, id, (f) =>
    f.page === 7 && f.variable ? (mods >> (f.usage - 0xe0)) & 1 : f.page === 7 ? keys : 0,
  );

/** A consumer-control (media key) report. */
export const mediaReport = (parsed: ParsedHid, usage: number): number[] =>
  buildReport(parsed, 3, (f) => (f.page === 12 ? usage : 0));

/** A mouse report: buttons, relative X and Y, the wheel. */
export const mouseReport = (
  parsed: ParsedHid,
  dx: number,
  dy: number,
  buttons: number,
  wheel: number,
): number[] =>
  buildReport(parsed, 2, (f) =>
    f.page === 9
      ? (buttons >> (f.usage - 1)) & 1
      : f.page === 1
        ? f.usage === 0x30
          ? dx
          : f.usage === 0x31
            ? dy
            : wheel
        : 0,
  );

/** Which fields light up in turn: modifiers only when held (Left Ctrl always, to show where they live). */
export function fieldOrder(fields: readonly HidField[], mods: number): number[] {
  return fields.flatMap((f, i) =>
    !(f.page === 7 && f.variable && !((mods >> (f.usage - 0xe0)) & 1)) || f.usage === 0xe0
      ? [i]
      : [],
  );
}

/** Timing of one report's animation, ms. */
export const FLY_MS = 380;
export const FIELD_MS = 420;
