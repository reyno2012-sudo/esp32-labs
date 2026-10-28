// Scene 1: a flat-shaded torus, the same maths as labs/03b-showcase/src (back-face culling,
// painter's sort, one light).
import { mix, rgb } from "../color";
import { H, type SceneLabel, type ShowcaseColors, W } from "./scene-types";

const U = 24;
const V = 10;
const R = 1;
const r = 0.42;
const CAM = 3.4;
const F = 175;
const L = [-0.45, -0.6, -0.66] as const;

type Vec = readonly [number, number, number];

const POINTS: Vec[] = [];
const NORMALS: Vec[] = [];
for (let i = 0; i < U; i++) {
  for (let j = 0; j < V; j++) {
    const u = (i * 2 * Math.PI) / U;
    const v = (j * 2 * Math.PI) / V;
    const uc = ((i + 0.5) * 2 * Math.PI) / U;
    const vc = ((j + 0.5) * 2 * Math.PI) / V;
    POINTS.push([
      (R + r * Math.cos(v)) * Math.cos(u),
      (R + r * Math.cos(v)) * Math.sin(u),
      r * Math.sin(v),
    ]);
    NORMALS.push([Math.cos(vc) * Math.cos(uc), Math.cos(vc) * Math.sin(uc), Math.sin(vc)]);
  }
}

interface Projected {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotated: Vec;
}

export function drawTorus(g: CanvasRenderingContext2D, C: ShowcaseColors, t: number): SceneLabel {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, rgb(C.indigo));
  sky.addColorStop(1, rgb(C.night));
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const ca = Math.cos(t * 0.9);
  const sa = Math.sin(t * 0.9);
  const cb = Math.cos(t * 0.55);
  const sb = Math.sin(t * 0.55);
  const rot = ([x, y, z]: Vec): Vec => {
    const y1 = y * ca - z * sa;
    const z1 = y * sa + z * ca;
    return [x * cb + z1 * sb, y1, -x * sb + z1 * cb];
  };
  const P: Projected[] = POINTS.map((p) => {
    const q = rot(p);
    const z = q[2] + CAM;
    return { x: W / 2 + (q[0] * F) / z, y: H / 2 + (q[1] * F) / z, z, rotated: q };
  });

  const faces: { z: number; quad: readonly Projected[]; col: string }[] = [];
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      const ids = [
        i * V + j,
        ((i + 1) % U) * V + j,
        ((i + 1) % U) * V + ((j + 1) % V),
        i * V + ((j + 1) % V),
      ];
      const quad = ids.map((k) => P[k]).filter((p): p is Projected => p !== undefined);
      const normal = NORMALS[ids[0] ?? 0];
      const a = quad[0];
      if (!normal || !a || quad.length < 4) continue;
      const n = rot(normal);
      const ce = a.rotated;
      if (n[0] * ce[0] + n[1] * ce[1] + n[2] * (ce[2] + CAM) >= 0) continue;
      const k = (40 + 215 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2])) / 255;
      faces.push({
        z: quad.reduce((s, p) => s + p.z, 0),
        quad,
        col: rgb(mix(C.night, ((i >> 1) + j) % 2 === 0 ? C.amber : C.teal, k)),
      });
    }
  }
  faces.sort((x, y) => y.z - x.z);
  for (const f of faces) {
    g.beginPath();
    f.quad.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    g.fillStyle = f.col;
    g.fill();
    g.strokeStyle = f.col;
    g.lineWidth = 0.6;
    g.stroke();
  }
  return { text: `${U * V} faces, ${faces.length} drawn`, color: C.muted };
}
