// Cubic Bézier wires: their SVG path, length and points along them, computed here instead of
// measured from the DOM (getTotalLength), so the drawings render in one pass.

export type Point = readonly [x: number, y: number];

export interface Cubic {
  readonly from: Point;
  readonly c1: Point;
  readonly c2: Point;
  readonly to: Point;
}

const SAMPLES = 64;

export const cubicPath = ({ from, c1, c2, to }: Cubic) =>
  `M${from[0]} ${from[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${to[0]} ${to[1]}`;

/** The point at parameter t (0..1). */
export function cubicAt({ from, c1, c2, to }: Cubic, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * from[0] + b * c1[0] + c * c2[0] + d * to[0],
    a * from[1] + b * c1[1] + c * c2[1] + d * to[1],
  ];
}

/** Cumulative arc length at each of SAMPLES + 1 evenly spaced parameters. */
function arcTable(c: Cubic): number[] {
  const table = [0];
  let prev = c.from;
  let total = 0;
  for (let i = 1; i <= SAMPLES; i++) {
    const p = cubicAt(c, i / SAMPLES);
    total += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    table.push(total);
    prev = p;
  }
  return table;
}

/** Arc length, to well under a pixel for these wires. */
export const cubicLength = (c: Cubic) => arcTable(c)[SAMPLES] ?? 0;

/** The point a fraction k (0..1) of the way along the curve, by arc length. */
export function cubicAtFraction(c: Cubic, k: number): Point {
  const table = arcTable(c);
  const target = Math.min(1, Math.max(0, k)) * (table[SAMPLES] ?? 0);
  let i = 1;
  while (i < SAMPLES && (table[i] ?? 0) < target) i++;
  const lo = table[i - 1] ?? 0;
  const hi = table[i] ?? lo;
  const f = hi > lo ? (target - lo) / (hi - lo) : 0;
  return cubicAt(c, (i - 1 + f) / SAMPLES);
}
