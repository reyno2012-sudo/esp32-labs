// A key's journey for B6: character → (board's layout) → key number → 8 bytes → (computer's
// layout) → character. Keyboards send key positions, never letters.

export type Layout = "us" | "de";
/** [modifier byte, HID key code]. */
export type KeyStroke = readonly [mod: number, key: number];

const SHIFT = 2;

export interface Layouts {
  /** Character → key stroke, per layout (the board's side). */
  readonly char: Readonly<Record<Layout, Readonly<Record<string, KeyStroke>>>>;
  /** "shift:key" → character, per layout (the computer's side). */
  readonly inv: Readonly<Record<Layout, Readonly<Record<string, string>>>>;
}

function build(): Layouts {
  const us: Record<string, KeyStroke> = {};
  const de: Record<string, KeyStroke> = {};
  const put = (m: Record<string, KeyStroke>, ch: string, mod: number, key: number) => {
    m[ch] = [mod, key];
  };
  [..."abcdefghijklmnopqrstuvwxyz"].forEach((c, i) => {
    put(us, c, 0, 4 + i);
    put(us, c.toUpperCase(), SHIFT, 4 + i);
  });
  [..."123456789"].forEach((c, i) => put(us, c, 0, 0x1e + i));
  put(us, "0", 0, 0x27);
  [..."!@#$%^&*("].forEach((c, i) => put(us, c, SHIFT, 0x1e + i));
  put(us, ")", SHIFT, 0x27);
  const usPunct: [string, number, number][] = [
    [" ", 0, 0x2c],
    ["-", 0, 0x2d],
    ["_", SHIFT, 0x2d],
    ["=", 0, 0x2e],
    ["+", SHIFT, 0x2e],
    [";", 0, 0x33],
    [":", SHIFT, 0x33],
    ["'", 0, 0x34],
    ['"', SHIFT, 0x34],
    [",", 0, 0x36],
    ["<", SHIFT, 0x36],
    [".", 0, 0x37],
    [">", SHIFT, 0x37],
    ["/", 0, 0x38],
    ["?", SHIFT, 0x38],
    ["[", 0, 0x2f],
    ["]", 0, 0x30],
    ["\\", 0, 0x31],
  ];
  usPunct.forEach(([c, m, k]) => put(us, c, m, k));
  Object.entries(us).forEach(([c, v]) => {
    if (/[a-xA-X0-9 ]/.test(c)) de[c] = v;
  });
  put(de, "y", 0, 0x1d);
  put(de, "Y", SHIFT, 0x1d);
  put(de, "z", 0, 0x1c);
  put(de, "Z", SHIFT, 0x1c);
  const dePunct: [string, number, number][] = [
    ["!", SHIFT, 0x1e],
    ['"', SHIFT, 0x1f],
    ["$", SHIFT, 0x21],
    ["%", SHIFT, 0x22],
    ["&", SHIFT, 0x23],
    ["/", SHIFT, 0x24],
    ["(", SHIFT, 0x25],
    [")", SHIFT, 0x26],
    ["=", SHIFT, 0x27],
    ["?", SHIFT, 0x2d],
    ["+", 0, 0x30],
    ["*", SHIFT, 0x30],
    ["#", 0, 0x31],
    ["'", SHIFT, 0x31],
    [",", 0, 0x36],
    [";", SHIFT, 0x36],
    [".", 0, 0x37],
    [":", SHIFT, 0x37],
    ["-", 0, 0x38],
    ["_", SHIFT, 0x38],
    ["<", 0, 0x64],
    [">", SHIFT, 0x64],
  ];
  dePunct.forEach(([c, m, k]) => put(de, c, m, k));
  // The computer's side: key number + shift → character.
  const inverse = (m: Record<string, KeyStroke>) => {
    const r: Record<string, string> = {};
    Object.entries(m).forEach(([c, [mod, key]]) => (r[`${mod & SHIFT}:${key}`] = c));
    return r;
  };
  const deInv = inverse(de);
  Object.assign(deInv, { "0:45": "ß", "0:47": "ü", "0:51": "ö", "0:52": "ä" });
  return { char: { us, de }, inv: { us: inverse(us), de: deInv } };
}

export const LAYOUTS: Layouts = build();

/** What the computer shows for a stroke, read with its own layout ("?" when nothing). */
export const hostChar = (stroke: KeyStroke, host: Layout): string =>
  LAYOUTS.inv[host][`${stroke[0] & SHIFT}:${stroke[1]}`] ?? "?";
