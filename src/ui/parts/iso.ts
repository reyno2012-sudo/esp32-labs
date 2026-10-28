// A tiny isometric engine for the parts library: 3D points in, SVG path data out. Pure maths,
// no React. The icon's viewBox is 64 × 64; +x runs right-down, +y left-down, +z up, so the
// visible faces of a box are its top, its +y side ("left") and its +x side ("right").

export type P3 = readonly [x: number, y: number, z: number];
export type P2 = readonly [x: number, y: number];

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
/** Where (0, 0, 0) lands in the viewBox: a little below the middle, leaving room above. */
export const ORIGIN: P2 = [32, 36];

const r1 = (n: number) => Math.round(n * 10) / 10;

export function project([x, y, z]: P3): P2 {
  return [ORIGIN[0] + (x - y) * COS, ORIGIN[1] + (x + y) * SIN - z];
}

const xy = (p: P3) => project(p).map(r1).join(" ");

/** A closed polygon through 3D points. */
export const poly = (...pts: readonly P3[]): string => `M${pts.map(xy).join("L")}Z`;

/** An open polyline through 3D points (wires, legs, traces). */
export const line = (...pts: readonly P3[]): string => `M${pts.map(xy).join("L")}`;

export interface BoxFaces {
  readonly top: string;
  readonly left: string;
  readonly right: string;
}

/** The three visible faces of a box with its corner at (x, y, z) and size w × d × h. */
export function box(x: number, y: number, z: number, w: number, d: number, h: number): BoxFaces {
  const X = x + w;
  const Y = y + d;
  const Z = z + h;
  return {
    top: poly([x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]),
    left: poly([x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]),
    right: poly([X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]),
  };
}

/** A circle lying flat at height z, as an ellipse path (iso circles are 2:√3 ellipses). */
export function disc(cx: number, cy: number, z: number, r: number): string {
  const [x, y] = project([cx, cy, z]);
  const rx = r1(r * Math.SQRT2 * COS);
  const ry = r1(r * Math.SQRT2 * SIN);
  return `M${r1(x - rx)} ${r1(y)}a${rx} ${ry} 0 1 0 ${r1(2 * rx)} 0a${rx} ${ry} 0 1 0 ${r1(-2 * rx)} 0Z`;
}

export interface CylinderFaces {
  readonly top: string;
  readonly side: string;
}

/** An upright cylinder: its top disc and the band of its side you can see. */
export function cylinder(cx: number, cy: number, z: number, r: number, h: number): CylinderFaces {
  const [x, yBottom] = project([cx, cy, z]);
  const yTop = yBottom - h;
  const rx = r1(r * Math.SQRT2 * COS);
  const ry = r1(r * Math.SQRT2 * SIN);
  const l = r1(x - rx);
  const rr = r1(x + rx);
  return {
    top: disc(cx, cy, z + h, r),
    side: `M${l} ${r1(yTop)}L${l} ${r1(yBottom)}A${rx} ${ry} 0 0 0 ${rr} ${r1(yBottom)}L${rr} ${r1(yTop)}A${rx} ${ry} 0 0 1 ${l} ${r1(yTop)}Z`,
  };
}

/**
 * A circle in any plane: centre c, unit axes u and v spanning the plane. For faces of boxes,
 * speaker cones, dials.
 */
export function ring(c: P3, u: P3, v: P3, r: number, n = 28): string {
  const pts: P3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = r * Math.cos(a);
    const m = r * Math.sin(a);
    pts.push([c[0] + u[0] * k + v[0] * m, c[1] + u[1] * k + v[1] * m, c[2] + u[2] * k + v[2] * m]);
  }
  return poly(...pts);
}

/** The +y face plane ("left" side of a box): x across, z up. */
export const LEFT_FACE = { u: [1, 0, 0] as P3, v: [0, 0, 1] as P3 };
/** The +x face plane ("right" side): y across, z up. */
export const RIGHT_FACE = { u: [0, 1, 0] as P3, v: [0, 0, 1] as P3 };
/** Flat on the ground or on a top face. */
export const TOP_FACE = { u: [1, 0, 0] as P3, v: [0, 1, 0] as P3 };

/**
 * A 2D arc in viewBox units (waves, dials): angles in degrees, counter-clockwise from 3 o'clock,
 * as on a protractor.
 */
export function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const at = (deg: number): P2 => [
    r1(cx + r * Math.cos((deg * Math.PI) / 180)),
    r1(cy - r * Math.sin((deg * Math.PI) / 180)),
  ];
  const [x0, y0] = at(from);
  const [x1, y1] = at(to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 0 : 1;
  return `M${x0} ${y0}A${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}
