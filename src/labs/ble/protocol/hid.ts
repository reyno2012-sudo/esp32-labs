// HID over GATT for B8: three Report Maps, a report descriptor parser (the same rules as
// kit/lib/ble-kit/src/hid_report.h, plus a line of text per item), bit packing and key → character.

export const B8_MAPS = {
  combo: {
    label: "Keyboard + media keys",
    bytes: [
      0x05, 0x01, 0x09, 0x06, 0xa1, 0x01, 0x85, 0x01, 0x05, 0x07, 0x19, 0xe0, 0x29, 0xe7, 0x15,
      0x00, 0x25, 0x01, 0x75, 0x01, 0x95, 0x08, 0x81, 0x02, 0x75, 0x08, 0x95, 0x01, 0x81, 0x01,
      0x95, 0x06, 0x75, 0x08, 0x15, 0x00, 0x26, 0xff, 0x00, 0x19, 0x00, 0x2a, 0xff, 0x00, 0x81,
      0x00, 0xc0, 0x05, 0x0c, 0x09, 0x01, 0xa1, 0x01, 0x85, 0x03, 0x15, 0x00, 0x26, 0xff, 0x03,
      0x19, 0x00, 0x2a, 0xff, 0x03, 0x75, 0x10, 0x95, 0x01, 0x81, 0x00, 0xc0,
    ],
  },
  boot: {
    label: "Boot keyboard (HID spec)",
    bytes: [
      0x05, 0x01, 0x09, 0x06, 0xa1, 0x01, 0x05, 0x07, 0x19, 0xe0, 0x29, 0xe7, 0x15, 0x00, 0x25,
      0x01, 0x75, 0x01, 0x95, 0x08, 0x81, 0x02, 0x95, 0x01, 0x75, 0x08, 0x81, 0x01, 0x95, 0x05,
      0x75, 0x01, 0x05, 0x08, 0x19, 0x01, 0x29, 0x05, 0x91, 0x02, 0x95, 0x01, 0x75, 0x03, 0x91,
      0x01, 0x95, 0x06, 0x75, 0x08, 0x15, 0x00, 0x25, 0x65, 0x05, 0x07, 0x19, 0x00, 0x29, 0x65,
      0x81, 0x00, 0xc0,
    ],
  },
  mouse: {
    label: "5-button mouse, 12-bit X/Y",
    bytes: [
      0x05, 0x01, 0x09, 0x02, 0xa1, 0x01, 0x85, 0x02, 0x09, 0x01, 0xa1, 0x00, 0x05, 0x09, 0x19,
      0x01, 0x29, 0x05, 0x15, 0x00, 0x25, 0x01, 0x95, 0x05, 0x75, 0x01, 0x81, 0x02, 0x95, 0x01,
      0x75, 0x03, 0x81, 0x01, 0x05, 0x01, 0x09, 0x30, 0x09, 0x31, 0x16, 0x01, 0xf8, 0x26, 0xff,
      0x07, 0x75, 0x0c, 0x95, 0x02, 0x81, 0x06, 0x09, 0x38, 0x15, 0x81, 0x25, 0x7f, 0x75, 0x08,
      0x95, 0x01, 0x81, 0x06, 0xc0, 0xc0,
    ],
  },
} as const satisfies Record<string, { label: string; bytes: readonly number[] }>;

export type MapKey = keyof typeof B8_MAPS;
export const MAP_KEYS = Object.keys(B8_MAPS) as MapKey[];

export interface HidItem {
  /** Offset in the descriptor. */
  readonly at: number;
  readonly len: number;
  readonly text: string;
}

export interface HidField {
  readonly id: number;
  /** First bit in the report (bit 0 = LSB of byte 0). */
  readonly bit: number;
  readonly size: number;
  readonly count: number;
  readonly page: number;
  readonly usage: number;
  readonly usageMax?: number;
  readonly variable: boolean;
  readonly constant: boolean;
  readonly relative: boolean;
  readonly logMin: number;
  /** Index of the Input item that made it. */
  readonly item: number;
}

export interface ParsedHid {
  readonly items: HidItem[];
  readonly fields: HidField[];
  /** Report length in bits, per report ID. */
  readonly bits: Readonly<Record<number, number>>;
}

const PAGES: Readonly<Record<number, string>> = {
  1: "Generic Desktop",
  7: "Keyboard",
  8: "LEDs",
  9: "Button",
  12: "Consumer",
};
const USAGES: Readonly<Record<string, string>> = {
  "1:6": "Keyboard",
  "1:2": "Mouse",
  "1:1": "Pointer",
  "1:48": "X",
  "1:49": "Y",
  "1:56": "Wheel",
  "12:1": "Consumer Control",
};

export function b8ParseHid(bytes: readonly number[]): ParsedHid {
  const items: HidItem[] = [];
  const fields: HidField[] = [];
  const g = { page: 0, logMin: 0, logMax: 0, size: 0, count: 0, id: 0 };
  const bits: Record<number, number> = {};
  let usages: number[] = [];
  let uMin: number | null = null;
  let uMax: number | null = null;
  let i = 0;
  while (i < bytes.length) {
    const p = bytes[i] ?? 0;
    const size = (p & 3) === 3 ? 4 : p & 3;
    const type = (p >> 2) & 3;
    const tag = p >> 4;
    if (i + 1 + size > bytes.length) {
      items.push({ at: i, len: bytes.length - i, text: "runs past the end" });
      break;
    }
    let u = 0;
    for (let k = 0; k < size; k++) u |= (bytes[i + 1 + k] ?? 0) << (8 * k);
    u >>>= 0;
    const s = size && size < 4 && u & (1 << (8 * size - 1)) ? u - (1 << (8 * size)) : u;
    let text = "";
    const hexv = "0x" + u.toString(16).toUpperCase();
    if (type === 1) {
      if (tag === 0) {
        g.page = u;
        text = `Usage Page (${PAGES[u] ?? hexv})`;
      } else if (tag === 1) {
        g.logMin = s;
        text = `Logical Min (${s})`;
      } else if (tag === 2) {
        g.logMax = g.logMin < 0 ? s : u;
        text = `Logical Max (${g.logMax})`;
      } else if (tag === 7) {
        g.size = u;
        text = `Report Size (${u} bit${u === 1 ? "" : "s"})`;
      } else if (tag === 8) {
        g.id = u;
        text = `Report ID (${u})`;
      } else if (tag === 9) {
        g.count = u;
        text = `Report Count (${u})`;
      } else text = "Global item";
    } else if (type === 2) {
      if (tag === 0) {
        usages.push(u);
        text = `Usage (${USAGES[`${g.page}:${u}`] ?? hexv})`;
      } else if (tag === 1) {
        uMin = u;
        text = `Usage Min (${hexv})`;
      } else if (tag === 2) {
        uMax = u;
        text = `Usage Max (${hexv})`;
      }
    } else if (type === 0) {
      if (tag === 0xa)
        text = `Collection (${u === 1 ? "Application" : u === 0 ? "Physical" : hexv})`;
      else if (tag === 0xc) text = "End Collection";
      else if (tag === 0x9) text = "Output (the host sends these: LEDs)";
      else if (tag === 0x8) {
        const constant = Boolean(u & 1);
        const variable = Boolean(u & 2);
        const relative = Boolean(u & 4);
        text = `Input (${constant ? "Constant: padding" : variable ? "Data, Variable" : "Data, Array"}${relative ? ", Relative" : ""})`;
        const at = bits[g.id] ?? 0;
        const base = {
          id: g.id,
          page: g.page,
          constant,
          relative,
          logMin: g.logMin,
          item: items.length,
        };
        if (variable && !constant) {
          for (let k = 0; k < g.count; k++) {
            const usage = usages[k] ?? (uMin !== null ? uMin + k : (usages.at(-1) ?? 0));
            fields.push({
              ...base,
              bit: at + k * g.size,
              size: g.size,
              count: 1,
              usage,
              variable: true,
            });
          }
        } else {
          fields.push({
            ...base,
            bit: at,
            size: g.size,
            count: g.count,
            usage: uMin ?? usages[0] ?? 0,
            usageMax: uMax ?? 0,
            variable: false,
          });
        }
        bits[g.id] = at + g.size * g.count;
      }
      usages = [];
      uMin = uMax = null;
    }
    items.push({ at: i, len: 1 + size, text });
    i += 1 + size;
  }
  return { items, fields, bits };
}

/** Reads `size` bits from `bit` on (HID counts from the least significant bit). */
export function b8Extract(
  data: readonly number[],
  bit: number,
  size: number,
  signed: boolean,
): number {
  let v = 0;
  for (let b = 0; b < size; b++) {
    const k = bit + b;
    if ((data[k >> 3] ?? 0) & (1 << (k & 7))) v |= 1 << b;
  }
  v >>>= 0;
  if (signed && size < 32 && v & (1 << (size - 1))) v -= 2 ** size;
  return v;
}

/** Writes `value`'s low `size` bits at `bit` (into a zeroed report). */
export function b8Put(data: number[], bit: number, size: number, value: number): void {
  for (let b = 0; b < size; b++) {
    const k = bit + b;
    if ((value >> b) & 1) data[k >> 3] = (data[k >> 3] ?? 0) | (1 << (k & 7));
  }
}

const PUNCT: Readonly<Record<number, readonly [string, string, string, string, string]>> = {
  0x2d: ["-", "_", "ß", "?", "\\"],
  0x2f: ["[", "{", "ü", "Ü", ""],
  0x30: ["]", "}", "+", "*", "~"],
  0x33: [";", ":", "ö", "Ö", ""],
  0x34: ["'", '"', "ä", "Ä", ""],
  0x36: [",", "<", ",", ";", ""],
  0x37: [".", ">", ".", ":", ""],
  0x38: ["/", "?", "-", "_", ""],
};

/** Key code → what the screen shows, US or German: the same table as hid_report.h toChar(). */
export function b8Char(code: number, mods: number, de: boolean): string {
  const shift = Boolean(mods & 0x22);
  const altGr = Boolean(mods & 0x40);
  if (code >= 0x04 && code <= 0x1d) {
    let c = String.fromCharCode(97 + code - 4);
    if (de && c === "y") c = "z";
    else if (de && c === "z") c = "y";
    if (de && altGr) return c === "q" ? "@" : "";
    return shift ? c.toUpperCase() : c;
  }
  if (code === 0x2c) return " ";
  if (code === 0x28) return "⏎";
  if (code >= 0x1e && code <= 0x27) {
    const d = code === 0x27 ? 0 : code - 0x1d;
    if (de && altGr) return ({ 7: "{", 8: "[", 9: "]", 0: "}" } as Record<number, string>)[d] ?? "";
    if (!shift) return String(d);
    return (de ? '=!"§$%&/()' : ")!@#$%^&*(")[d] ?? "";
  }
  const p = PUNCT[code];
  if (!p) return "";
  return de ? (altGr ? p[4] : shift ? p[3] : p[2]) : shift ? p[1] : p[0];
}

/**
 * Builds report `id` from the parsed map: `value(field)` gives each field's value (or one per
 * slot). Padding (constant) fields always stay 0, as a real device sends them.
 */
export function buildReport(
  parsed: ParsedHid,
  id: number,
  value: (f: HidField) => number | readonly number[],
): number[] {
  const bitsLen = parsed.bits[id] ?? 0;
  const data: number[] = new Array<number>(Math.ceil(bitsLen / 8)).fill(0);
  parsed.fields
    .filter((f) => f.id === id && !f.constant)
    .forEach((f) => {
      const v = value(f);
      if (typeof v === "number") b8Put(data, f.bit, f.size, v & (2 ** f.size - 1));
      else v.forEach((x, i) => b8Put(data, f.bit + i * f.size, f.size, x));
    });
  return data;
}
