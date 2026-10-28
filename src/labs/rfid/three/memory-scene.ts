// R4's 3D model: the card's 16 sectors as cabinets of 4 blocks, each trailer with a lock.
import type * as Three from "three";
import type { Simulation } from "../../shared/simulation";
import { type Block, blockKind, type BlockKind, exampleCard } from "../protocol/card-memory";
import { palette3d, type Palette3d } from "./palette3d";
import type { Stage3d, ThreeModule } from "@/ui/stage3d/stage3d";

export interface MemoryState {
  sector: number;
  /** Sectors authenticated so far. */
  open: ReadonlySet<number>;
  /** The card after R5's writes. */
  after: boolean;
  blocks: Block[];
  /** The key flying to a lock: sector and start time (s). */
  anim: { readonly s: number; readonly t0: number } | null;
  /** The 3-pass handshake is on (the caption explains it). */
  handshake: boolean;
}

export const initialMemory = (): MemoryState => ({
  sector: 1,
  open: new Set(),
  after: false,
  blocks: exampleCard(false),
  anim: null,
  handshake: false,
});

const KIND_COLOR = (C: Palette3d) =>
  ({
    maker: C.warn,
    empty: C.line,
    data: C.ok,
    value: C.wSda,
    trailer: C.danger,
  }) as const satisfies Record<BlockKind, string>;

interface Cabinet {
  readonly g: Three.Group;
  readonly slabs: readonly Three.Mesh<Three.BoxGeometry, Three.MeshStandardMaterial>[];
  readonly lock: Three.Group;
  readonly shackle: Three.Mesh;
}

/** Picks the sector under a point in normalised device coordinates. */
export type SectorPicker = (ndcX: number, ndcY: number) => number | null;

/** The scene's labels, translated by the component. */
export interface MemoryLabels {
  readonly maker: string;
  readonly trailer: string;
  readonly last: string;
}

export function buildMemoryScene(
  T: ThreeModule,
  S: Stage3d,
  sim: Simulation<MemoryState>,
  labels: MemoryLabels,
): SectorPicker {
  const st = sim.state;
  const C = palette3d();
  const cabinets: Cabinet[] = [];
  const slabGeo = new T.BoxGeometry(2.0, 0.24, 1.3);
  const lockMat = new T.MeshStandardMaterial({
    color: new T.Color(C.gold),
    metalness: 0.7,
    roughness: 0.3,
  });
  const bodyGeo = new T.BoxGeometry(0.36, 0.28, 0.12);
  const shackleGeo = new T.TorusGeometry(0.12, 0.035, 8, 24, Math.PI);
  for (let s = 0; s < 16; s++) {
    const g = new T.Group();
    g.position.set(((s % 4) - 1.5) * 2.7, 0, (Math.floor(s / 4) - 1.5) * 2.0);
    const slabs = [0, 1, 2, 3].map((b) => {
      const m = new T.Mesh(
        slabGeo,
        new T.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.55,
          transparent: true,
          opacity: 1,
        }),
      );
      m.position.y = 0.2 + b * 0.32;
      m.userData = { sector: s, block: b };
      g.add(m);
      return m;
    });
    // The lock on the trailer: a body and a shackle that swings open.
    const lock = new T.Group();
    const shackle = new T.Mesh(shackleGeo, lockMat);
    shackle.position.y = 0.14;
    lock.add(new T.Mesh(bodyGeo, lockMat), shackle);
    lock.position.set(0, 0.2 + 3 * 0.32, 0.72);
    g.add(lock);
    S.scene.add(g);
    cabinets.push({ g, slabs, lock, shackle });
  }
  let painted: Block[] | null = null;
  const recolor = (blocks: Block[]) => {
    const colors = KIND_COLOR(palette3d());
    cabinets.forEach((c, s) =>
      c.slabs.forEach((m, b) =>
        m.material.color.set(colors[blockKind(blocks[s * 4 + b] ?? [], s * 4 + b)]),
      ),
    );
    painted = blocks;
  };
  const keyMat = new T.MeshStandardMaterial({
    color: new T.Color(C.gold),
    metalness: 0.8,
    roughness: 0.25,
    emissive: new T.Color(C.warn),
    emissiveIntensity: 0.2,
  });
  const key = new T.Group();
  key.add(new T.Mesh(new T.TorusGeometry(0.2, 0.05, 8, 24), keyMat));
  const shaft = new T.Mesh(new T.BoxGeometry(0.5, 0.06, 0.06), keyMat);
  shaft.position.x = 0.45;
  key.add(shaft);
  key.visible = false;
  S.scene.add(key);

  const cab = (s: number) => cabinets[s] ?? cabinets[0];
  const at = (s: number, x: number, y: number, z: number) => {
    const v = new T.Vector3(x, y, z);
    return cab(s)?.g.localToWorld(v) ?? v;
  };
  S.label(labels.maker, () => at(0, 0, 0.2, 0.7));
  S.label(labels.trailer, () => at(st.sector, 0, 1.3, 0));
  S.label(labels.last, () => at(15, 0, 1.3, 0));

  const black = new T.Color(0x000000);
  const lockAt = new T.Vector3();
  const from = new T.Vector3();
  S.onFrame((t) => {
    if (painted !== st.blocks) recolor(st.blocks);
    const P = palette3d();
    cabinets.forEach((c, s) => {
      const sel = s === st.sector;
      const open = st.open.has(s);
      const lift = sel ? 0.9 : 0;
      const spread = sel ? 1.7 : 1;
      c.g.position.y += (lift - c.g.position.y) * 0.12;
      c.slabs.forEach((m, b) => {
        m.position.y += (0.2 + b * 0.32 * spread - m.position.y) * 0.15;
        m.material.opacity = sel ? 1 : 0.4;
        if (open && sel) m.material.emissive.set(P.rfid);
        else m.material.emissive.copy(black);
        m.material.emissiveIntensity = open && sel ? 0.15 + 0.1 * Math.sin(t * 3 + b) : 0;
      });
      c.lock.position.y = 0.2 + 3 * 0.32 * spread;
      const swing = open ? -1.1 : 0;
      c.shackle.rotation.y += (swing - c.shackle.rotation.y) * 0.15;
    });
    // Authentication: the key flies from the camera side to the lock, turns, the lock opens.
    const anim = st.anim;
    if (!anim) return;
    const k = t - anim.t0;
    cab(anim.s)?.g.localToWorld(lockAt.set(0, 0.2 + 3 * 0.32 * 1.7, 1.0));
    from.copy(S.camera.position).lerp(lockAt, 0.55);
    key.visible = true;
    if (k < 1.2) key.position.lerpVectors(from, lockAt, S.reduce ? 1 : k / 1.2);
    else key.position.copy(lockAt);
    key.rotation.set(0, Math.PI / 2, k > 1.2 ? (Math.min(1, (k - 1.2) / 0.6) * Math.PI) / 2 : 0);
    if (k > 1.2 && !st.handshake && k < 2.2) sim.update((x) => (x.handshake = true));
    if (k > 2.2) {
      key.visible = false;
      sim.update((x) => {
        x.open = new Set([...x.open, anim.s]);
        x.anim = null;
        x.handshake = false;
      });
    }
  });

  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  const slabs = cabinets.flatMap((c) => c.slabs);
  return (x, y) => {
    ndc.set(x, y);
    ray.setFromCamera(ndc, S.camera);
    const hit = ray.intersectObjects(slabs)[0];
    const sector: unknown = hit?.object.userData.sector;
    return typeof sector === "number" ? sector : null;
  };
}
