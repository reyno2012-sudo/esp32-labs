// ISO 14443-3 bit-frame anticollision between two cards, as a walk the R3 panel steps through.
import { bccOf, hx, hxs, type Uid } from "./bytes";

export type Who = "A" | "B";

export interface WalkModel {
  readonly a: Uid;
  readonly b: Uid;
  /** UID bits in the order they travel: byte 0 bit 0 first. */
  readonly A: readonly number[];
  readonly B: readonly number[];
  /** First differing bit, 1-based; 0 = identical UIDs. */
  readonly p: number;
  /** The card with a 1 at bit p: the walk picks 1, so it is found first. */
  readonly winner: Who;
}

export type WalkStepId =
  | "identical"
  | "wake"
  | "all"
  | "pick"
  | "rest"
  | "select"
  | "halt"
  | "second";

/** One step of the walk: which explanation (anticoll.steps.<id>) and the numbers it quotes. */
export interface WalkStep {
  readonly id: WalkStepId;
  readonly values: Readonly<Record<string, string | number>>;
}

export const travelOrder = (u: Uid) =>
  u.flatMap((byte) => Array.from({ length: 8 }, (_, j) => (byte >> j) & 1));

export function walkModel(a: Uid, b: Uid): WalkModel {
  const A = travelOrder(a);
  const B = travelOrder(b);
  const p = A.findIndex((x, i) => x !== B[i]) + 1;
  const winner: Who = p && A[p - 1] === 1 ? "A" : "B";
  return { a, b, A, B, p, winner };
}

export function walkSteps(m: WalkModel): WalkStep[] {
  if (!m.p) return [{ id: "identical", values: {} }];
  const W = m.winner;
  const wu = W === "A" ? m.a : m.b;
  const values = {
    p: m.p,
    shared: m.p - 1,
    after: m.p + 1,
    nvb: hx(((2 + Math.floor(m.p / 8)) << 4) | (m.p % 8)),
    bytes: 2 + Math.floor(m.p / 8),
    bits: m.p % 8,
    bitIn: (m.p - 1) % 8,
    byte: Math.floor((m.p - 1) / 8),
    winner: W,
    loser: W === "A" ? "B" : "A",
    winnerUid: hxs(wu),
    loserUid: hxs(W === "A" ? m.b : m.a),
    bcc: hx(bccOf(wu)),
  };
  const ids: readonly WalkStepId[] = ["wake", "all", "pick", "rest", "select", "halt", "second"];
  return ids.map((id) => ({ id, values }));
}

export type HeardKind = "got" | "coll" | "sent" | "pick" | "";

/** What the reader hears of bit i at a step: a style and the text in the cell. */
export function heardBit(
  m: WalkModel,
  step: number,
  i: number,
): readonly [HeardKind, string] | null {
  const p = m.p;
  if (!p || step === 0) return null;
  const s = (v: number | undefined) => String(v ?? 0);
  if (step === 1) return i < p - 1 ? ["got", s(m.A[i])] : i === p - 1 ? ["coll", "×"] : ["", "0"];
  const w = m.winner === "A" ? m.A : m.B;
  const l = m.winner === "A" ? m.B : m.A;
  if (step === 2) return i < p - 1 ? ["sent", s(w[i])] : i === p - 1 ? ["pick", "1"] : ["", "·"];
  if (step <= 4) return i < p ? ["sent", s(w[i])] : ["got", s(w[i])];
  if (step === 5) return ["", "·"];
  return ["got", s(l[i])];
}

/** Whether a card has gone quiet at this step (lost the walk, or halted). */
export const isSilent = (m: WalkModel, step: number, who: Who) =>
  (step >= 2 && step <= 4 && who !== m.winner) || (step >= 5 && who === m.winner);
