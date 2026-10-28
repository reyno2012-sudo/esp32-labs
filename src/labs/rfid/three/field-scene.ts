// R2's 3D model: the RC522 board, its antenna, the field lines, a card above it, and one WUPA.
import type * as Three from "three";
import type { Simulation } from "../../shared/simulation";
import { FIELD, isHeard, isPowered, WUPA_SYMBOLS } from "../protocol/field";
import { palette3d } from "./palette3d";
import { roundedRect, type Stage3d, type ThreeModule } from "@/ui/stage3d/stage3d";

export interface Talk {
  readonly t0: number;
  readonly powered: boolean;
  readonly heard: boolean;
}

export interface FieldState {
  dist: number;
  /** Index into FIELD.gains. */
  gain: number;
  talk: Talk | null;
  slice: boolean;
  /** WUPA symbol on the air right now, -1 = none. */
  sym: number;
  /** The caption on show: field3d.captions.<cap>. */
  cap: FieldCaption;
}

export type FieldCaption = "field" | "send" | "wake" | "dark" | "answer" | "quiet";

export const initialField = (): FieldState => ({
  dist: 25,
  gain: 2,
  talk: null,
  slice: false,
  sym: -1,
  cap: "field",
});
export const dbOf = (st: FieldState) => FIELD.gains[st.gain] ?? 33;

type Phase = "idle" | "send" | "wait" | "answer" | "done";

function phaseCaption(phase: Phase, talk: Talk): FieldCaption | null {
  if (phase === "send") return "send";
  if (phase === "wait") return talk.powered ? "wake" : "dark";
  if (phase === "answer" && talk.powered) return talk.heard ? "answer" : "quiet";
  return null;
}

/** The scene's labels, translated by the component. */
export interface FieldLabels {
  readonly coil: string;
  readonly chip: string;
  readonly pins: string;
  readonly cardCoil: string;
  readonly cardChip: string;
}

// Talk timeline (seconds from the click): WUPA symbols, the card's wait, the answer.
const SYM = 0.32;
const T_FDT = WUPA_SYMBOLS.length * SYM;
const T_ANS = T_FDT + 0.7;
const T_END = T_ANS + 2.2;
const DOTS_PER = 7;
const AX = 0.7; // antenna centre

interface FieldLine {
  readonly mat: Three.LineBasicMaterial;
  readonly pts: readonly Three.Vector3[];
  readonly phi: number;
  readonly u: readonly number[];
}

/** Builds the scene on the stage and animates it from `sim.state`. */
export function buildFieldScene(
  T: ThreeModule,
  S: Stage3d,
  sim: Simulation<FieldState>,
  labels: FieldLabels,
): void {
  const C = palette3d();
  const st = sim.state;
  const col = (c: string) => new T.Color(c);
  const std = (c: string, extra: Three.MeshStandardMaterialParameters = {}) =>
    new T.MeshStandardMaterial({ color: col(c), roughness: 0.6, metalness: 0.1, ...extra });
  const add = <O extends Three.Object3D>(o: O) => {
    S.scene.add(o);
    return o;
  };
  // Board: 60 x 40 mm, 1 unit = 10 mm, top face at y = 0.
  add(new T.Mesh(new T.BoxGeometry(6, 0.16, 4), std(C.rc522))).position.y = -0.08;
  const copper = new T.LineBasicMaterial({ color: col(C.copper) });
  for (let k = 0; k < 4; k++)
    add(
      new T.LineLoop(
        new T.BufferGeometry().setFromPoints(
          roundedRect(T, AX, 0.01, 0, 2.05 - k * 0.14, 1.75 - k * 0.14, 0.35),
        ),
        copper,
      ),
    );
  const glowMat = new T.MeshBasicMaterial({
    color: col(C.rfid),
    transparent: true,
    opacity: 0,
    side: T.DoubleSide,
  });
  const antennaGlow = add(new T.Mesh(new T.RingGeometry(1.2, 1.55, 48), glowMat));
  antennaGlow.rotation.x = -Math.PI / 2;
  antennaGlow.position.set(AX, 0.02, 0);
  add(new T.Mesh(new T.BoxGeometry(0.5, 0.1, 0.5), std(C.pcb, { roughness: 0.4 }))).position.set(
    -1.9,
    0.05,
    0.4,
  );
  const chipLedMat = new T.MeshBasicMaterial({ color: col(C.rfid) });
  add(new T.Mesh(new T.BoxGeometry(0.16, 0.02, 0.16), chipLedMat)).position.set(-1.9, 0.11, 0.4);
  add(
    new T.Mesh(
      new T.BoxGeometry(0.42, 0.14, 0.18),
      std(C.silkDim, { metalness: 0.7, roughness: 0.3 }),
    ),
  ).position.set(-1.9, 0.07, -0.5);
  const pinMat = std(C.gold, { metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 8; i++) {
    const p = add(new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.6), pinMat));
    p.position.set(-2.75, 0.05, -1.4 + i * 0.4);
    p.rotation.y = Math.PI / 2;
  }
  // Card: 85.6 x 54 x 0.8 mm, with its own coil and chip (drawn as if the card were glass).
  const card = add(new T.Group());
  card.add(
    new T.Mesh(
      new T.BoxGeometry(8.56, 0.08, 5.4),
      std(C.cardWhite, { transparent: true, opacity: 0.82, roughness: 0.3 }),
    ),
  );
  const cardCoilMat = new T.LineBasicMaterial({
    color: col(C.copper),
    transparent: true,
    opacity: 0.9,
  });
  for (let k = 0; k < 4; k++)
    card.add(
      new T.LineLoop(
        new T.BufferGeometry().setFromPoints(
          roundedRect(T, 0, 0.05, 0, 3.75 - k * 0.12, 2.25 - k * 0.12, 0.4),
        ),
        cardCoilMat,
      ),
    );
  const cardChipMat = new T.MeshStandardMaterial({
    color: col(C.gold),
    emissive: col(C.rfid),
    emissiveIntensity: 0,
    metalness: 0.6,
    roughness: 0.35,
  });
  const cardChip = new T.Mesh(new T.BoxGeometry(0.5, 0.06, 0.5), cardChipMat);
  cardChip.position.set(2.9, 0.06, 1.4);
  card.add(cardChip);
  // Field lines: dipole lines r = L sin²θ around the antenna's axis, in 6 vertical planes.
  const lines: FieldLine[] = [];
  const lineMatBase = new T.LineBasicMaterial({
    color: col(C.wSda),
    transparent: true,
    opacity: 0.55,
  });
  [2.6, 3.7, 5.2].forEach((L, li) => {
    for (let k = 0; k < 6; k++) {
      const phi = (k / 6) * Math.PI * 2 + li * 0.3;
      const pts: Three.Vector3[] = [];
      for (let i = 0; i <= 80; i++) {
        const th = 0.14 + (i / 80) * (Math.PI - 0.28);
        const r = L * Math.sin(th) ** 2;
        pts.push(
          new T.Vector3(
            AX + r * Math.sin(th) * Math.cos(phi),
            r * Math.cos(th),
            r * Math.sin(th) * Math.sin(phi),
          ),
        );
      }
      const mat = lineMatBase.clone();
      add(new T.Line(new T.BufferGeometry().setFromPoints(pts), mat));
      lines.push({ mat, pts, phi, u: Array.from({ length: DOTS_PER }, (_, d) => d / DOTS_PER) });
    }
  });
  lineMatBase.dispose();
  const dotPos = new Float32Array(lines.length * DOTS_PER * 3);
  const dotGeo = new T.BufferGeometry();
  const dotAttr = new T.BufferAttribute(dotPos, 3);
  dotGeo.setAttribute("position", dotAttr);
  const dotMat = new T.PointsMaterial({
    color: col(C.wSda),
    size: 0.16,
    transparent: true,
    opacity: 0.95,
  });
  add(new T.Points(dotGeo, dotMat));
  // The card's answer: rings that travel from the card to the antenna.
  const rings = Array.from({ length: 4 }, () => {
    const mat = new T.MeshBasicMaterial({ color: col(C.copper), transparent: true, opacity: 0 });
    const m = add(new T.Mesh(new T.TorusGeometry(1.6, 0.03, 8, 48), mat));
    m.rotation.x = Math.PI / 2;
    return { m, mat };
  });
  const cardY = () => st.dist / 10 + 0.12;
  S.label(labels.coil, new T.Vector3(AX + 2.0, 0.05, 1.6));
  S.label(labels.chip, new T.Vector3(-1.9, 0.15, 0.4));
  S.label(labels.pins, new T.Vector3(-2.75, 0.1, -1.4));
  const coilAt = new T.Vector3();
  const chipAt = new T.Vector3();
  S.label(labels.cardCoil, () => coilAt.set(AX + 3.75, cardY() + 0.05, -2.25));
  S.label(labels.cardChip, () => chipAt.set(AX + 2.9, cardY() + 0.1, 1.4));

  let flow = 0;
  let lastPhase: Phase = "idle";
  S.onFrame((t, dt) => {
    const P = palette3d();
    card.position.set(AX, cardY(), 0);
    let fieldOn = 1;
    let answer = 0;
    let phase: Phase = "idle";
    const talk = st.talk;
    if (talk) {
      const k = t - talk.t0;
      let sym = -1;
      if (k < T_FDT) {
        const i = Math.floor(k / SYM);
        const f = (k % SYM) / SYM;
        const s = WUPA_SYMBOLS[i]?.s;
        // 100 % ASK: a short pause in the field at the symbol's position.
        fieldOn = (s === "Z" && f < 0.28) || (s === "X" && f > 0.5 && f < 0.78) ? 0.04 : 1;
        sym = i;
        phase = "send";
      } else if (k < T_ANS) phase = "wait";
      else if (k < T_END) {
        phase = "answer";
        answer = talk.powered ? 1 : 0;
      } else phase = "done";
      if (sym !== st.sym || phase === "done")
        sim.update((s) => {
          s.sym = sym;
          if (phase === "done") s.talk = null;
        });
      if (phase !== lastPhase) {
        const cap = phaseCaption(phase, talk);
        if (cap) sim.update((s) => (s.cap = cap));
        lastPhase = phase;
      }
    }
    // Field lines: brightness from the field strength; flow reverses every 2 s (the real field 27 million times a second).
    flow += S.reduce ? 0 : dt * 0.09 * Math.cos((t * Math.PI) / 2);
    let n = 0;
    for (const ln of lines) {
      const inSlice = !st.slice || Math.abs(Math.sin(ln.phi)) < 0.2;
      ln.mat.opacity = inSlice ? 0.5 * fieldOn : 0;
      for (let d = 0; d < DOTS_PER; d++) {
        const u = ((((ln.u[d] ?? 0) + flow) % 1) + 1) % 1;
        const p = ln.pts[Math.min(ln.pts.length - 1, Math.floor(u * (ln.pts.length - 1)))];
        dotPos[n++] = p?.x ?? 0;
        dotPos[n++] = inSlice ? (p?.y ?? 0) : -50;
        dotPos[n++] = p?.z ?? 0;
      }
    }
    dotAttr.needsUpdate = true;
    dotMat.opacity = 0.9 * fieldOn;
    const lit = isPowered(st.dist) ? 0.35 + 0.25 * Math.sin(t * 4) : 0;
    cardChipMat.emissiveIntensity = talk && phase !== "idle" && talk.powered ? 1.2 : lit;
    cardCoilMat.opacity = answer ? 0.45 + 0.55 * Math.abs(Math.sin(t * 30)) : 0.9;
    rings.forEach(({ m, mat }, i) => {
      if (!answer) {
        mat.opacity = 0;
        return;
      }
      const k = (t * 0.9 + i / rings.length) % 1;
      const reach = talk?.heard ? 1 : 0.55; // a quiet answer fades before it reaches the antenna
      m.position.set(AX, cardY() * (1 - k * reach), 0);
      m.scale.setScalar(1 + k * 0.4);
      mat.opacity = (1 - k / reach) * 0.8 * (k < reach ? 1 : 0);
    });
    const ok = phase === "answer" && Boolean(talk?.heard);
    glowMat.opacity = ok ? 0.35 + 0.3 * Math.sin(t * 12) : 0;
    chipLedMat.color.set(ok ? P.ok : P.rfid);
  });
}

/** Starts one wake-up from the current height and gain. */
export function sendWupa(st: FieldState, nowSeconds: number): void {
  st.talk = { t0: nowSeconds, powered: isPowered(st.dist), heard: isHeard(st.dist, dbOf(st)) };
}
