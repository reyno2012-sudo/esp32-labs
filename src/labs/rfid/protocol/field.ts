// R2's field model. A simple, honest one: on-axis field of a 20 mm loop,
// B(z) = (a²/(a²+z²))^1.5 (1 at the antenna). The card wakes above NEED; the reader hears the
// card's answer (∝ B²) above a level set by the gain.

export const FIELD = {
  a: 20,
  need: 0.12,
  /** RFCfgReg gain settings the slider offers, in dB. */
  gains: [18, 23, 33, 38, 43, 48],
  B: (z: number) => Math.pow(400 / (400 + z * z), 1.5),
  hear: (db: number) => Math.sqrt(0.081 * Math.pow(10, -(db - 18) / 20)),
} as const;

export const isPowered = (dist: number) => FIELD.B(dist) >= FIELD.need;
export const isHeard = (dist: number, db: number) => FIELD.B(dist) >= FIELD.hear(db);

/** The height (mm) up to which a card both wakes and is heard at this gain. */
export function rangeAt(db: number): number {
  let z = 0;
  while (z < 120 && FIELD.B(z) >= Math.max(FIELD.need, FIELD.hear(db))) z += 0.5;
  return z;
}

export interface AirSymbol {
  /** Modified Miller: Z = pause at the start, X = pause mid-bit, Y = no pause. */
  readonly s: "X" | "Y" | "Z";
  /** What the symbol carries: the start, data bit `bit` (= `value`), the closing 0, the end. */
  readonly what: "start" | "bit" | "end0" | "end";
  readonly bit?: number;
  readonly value?: number;
}

/** WUPA (52h, 7 bits, LSB first) in modified Miller. */
export const WUPA_SYMBOLS: readonly AirSymbol[] = (() => {
  const bits = [0, 1, 0, 0, 1, 0, 1];
  const out: AirSymbol[] = [{ s: "Z", what: "start" }];
  let prev = 0;
  bits.forEach((b, i) => {
    out.push({ s: b ? "X" : prev === 1 ? "Y" : "Z", what: "bit", bit: i, value: b });
    prev = b;
  });
  out.push({ s: prev === 1 ? "Y" : "Z", what: "end0" }, { s: "Y", what: "end" });
  return out;
})();
