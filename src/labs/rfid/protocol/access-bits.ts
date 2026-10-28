// MIFARE Classic access conditions: bytes 6-8 of a sector trailer hold three bits (C1 C2 C3) per
// block, each stored twice, once inverted, so the card can tell a broken trailer.

/** Condition 0..7 → its explanation key (access.data.<id> or access.trailer.<id>). */
export const RULE_IDS = ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7"] as const;
export type RuleId = (typeof RULE_IDS)[number];
export const ruleId = (c: number): RuleId => RULE_IDS[c] ?? "c0";

/** Per block 0..3 (3 = the trailer), the condition C1C2C3 as a number 0..7. */
export type Conditions = readonly [number, number, number, number];

/** Labelled access.presets.<key>. */
export const PRESETS = {
  factory: [0, 0, 0, 1],
  values: [0, 6, 6, 3],
  readOnly: [2, 2, 2, 6],
} as const satisfies Readonly<Record<string, Conditions>>;
export type PresetKey = keyof typeof PRESETS;

/** [C1, C2, C3] of one block. */
export const bitsOf = (cond: Conditions, block: number): [number, number, number] => {
  const c = cond[block] ?? 0;
  return [(c >> 2) & 1, (c >> 1) & 1, c & 1];
};

/** Conditions → trailer bytes 6, 7, 8. */
export function encodeAccess(cond: Conditions): [number, number, number] {
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  for (let b = 0; b < 4; b++) {
    const [x, y, z] = bitsOf(cond, b);
    c1 |= x << b;
    c2 |= y << b;
    c3 |= z << b;
  }
  return [
    ((~c2 & 15) << 4) | (~c1 & 15),
    ((c1 & 15) << 4) | (~c3 & 15),
    ((c3 & 15) << 4) | (c2 & 15),
  ];
}

/** Trailer bytes 6-8 → conditions, or null when the inverted copies don't match. */
export function decodeAccess([b6, b7, b8]: readonly [number, number, number]): Conditions | null {
  const c1 = b7 >> 4;
  const c2 = b8 & 15;
  const c3 = b8 >> 4;
  const ok = (b6 & 15) === (~c1 & 15) && b6 >> 4 === (~c2 & 15) && (b7 & 15) === (~c3 & 15);
  if (!ok) return null;
  const at = (b: number) => (((c1 >> b) & 1) << 2) | (((c2 >> b) & 1) << 1) | ((c3 >> b) & 1);
  return [at(0), at(1), at(2), at(3)];
}

/** Which (Cn, block, inverted) each bit of bytes 6-8 holds, bit 7 first. */
export const BIT_MAP: readonly (readonly (readonly [number, number, boolean])[])[] = [
  [
    [2, 3, true],
    [2, 2, true],
    [2, 1, true],
    [2, 0, true],
    [1, 3, true],
    [1, 2, true],
    [1, 1, true],
    [1, 0, true],
  ],
  [
    [1, 3, false],
    [1, 2, false],
    [1, 1, false],
    [1, 0, false],
    [3, 3, true],
    [3, 2, true],
    [3, 1, true],
    [3, 0, true],
  ],
  [
    [3, 3, false],
    [3, 2, false],
    [3, 1, false],
    [3, 0, false],
    [2, 3, false],
    [2, 2, false],
    [2, 1, false],
    [2, 0, false],
  ],
];

/** Trailer settings after which no key can ever change the sector again. */
export const locksForever = (trailer: number) => [2, 6, 7].includes(trailer);

/** A copy of `cond` with one block's condition replaced. */
export function withCondition(cond: Conditions, block: number, value: number): Conditions {
  const next: [number, number, number, number] = [...cond];
  next[block] = value;
  return next;
}
