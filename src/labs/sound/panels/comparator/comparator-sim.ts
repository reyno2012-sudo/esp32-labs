// The comparator panel's pretend room: an 8 s loop of quiet, talk, claps and a whistle, heard by a
// KY-037 whose DO pin is drawn against AO, 4 s across.
import { Mic } from "../../model/mic";

export const COLS = 560;
const PER_COL = 4000 / COLS; // ms of sound per column: the strip shows 4 s

export class ComparatorSim {
  readonly mic = new Mic({ potMv: 10 });
  /** Per column: min and max mV of AO minus the bias. */
  readonly mvCol = new Float32Array(COLS * 2);
  /** Per column: DO was high. */
  readonly doCol = new Uint8Array(COLS);
  head = 0;
  /** Rising edges in the last second. */
  rps = 0;
  #loopT = 0;
  #fired = new Set<number>();
  #colAcc = 0;
  #colLo = 1e9;
  #colHi = -1e9;
  #colDo = 0;
  #rises = 0;
  #risesAt = 0;
  readonly #script: readonly (readonly [number, () => void])[];

  constructor() {
    const mic = this.mic;
    this.#script = [
      [0.4, () => mic.say("quiet")],
      [1, () => mic.say("talk", 1.8)],
      [3.4, () => mic.clap()],
      [5, () => mic.clap()],
      [5.3, () => mic.clap()],
      [6, () => mic.say("whistle", 1.4)],
    ];
    mic.onFrame = (f) => {
      const s = mic.latest(64);
      for (let i = 0; i < 64; i++) {
        const mv = ((s[i] ?? 0) / 16) * mic.mvPerStep();
        this.#colLo = Math.min(this.#colLo, mv);
        this.#colHi = Math.max(this.#colHi, mv);
      }
      this.#colDo |= f.do ? 1 : 0;
      this.#colAcc += 4;
      if (this.#colAcc >= PER_COL) {
        this.mvCol[this.head * 2] = this.#colLo;
        this.mvCol[this.head * 2 + 1] = this.#colHi;
        this.doCol[this.head] = this.#colDo;
        this.head = (this.head + 1) % COLS;
        this.#colAcc -= PER_COL;
        this.#colLo = 1e9;
        this.#colHi = -1e9;
        this.#colDo = 0;
      }
    };
  }

  step(dt: number, t: number): void {
    this.#loopT += dt;
    if (this.#loopT > 8) {
      this.#loopT = 0;
      this.#fired.clear();
    }
    this.#script.forEach(([at, fn], i) => {
      if (this.#loopT >= at && !this.#fired.has(i)) {
        this.#fired.add(i);
        fn();
      }
    });
    const before = this.mic.doRises;
    this.mic.step(dt);
    this.#rises += this.mic.doRises - before;
    if (t - this.#risesAt >= 1) {
      this.rps = this.#rises;
      this.#rises = 0;
      this.#risesAt = t;
    }
  }
}

/** A square-root scale: a 5 mV voice and a 200 mV clap both fit (the real wave is 40 times taller for the clap). */
export const yMv = (mv: number) =>
  120 - Math.sign(mv) * Math.sqrt(Math.min(200, Math.abs(mv)) / 200) * 95;

/** The pot value for a pointer at canvas height y (0..290), inverse of yMv. */
export function potFromY(y: number): number {
  const k = Math.max(0, (120 - y) / 95);
  return Math.round(Math.max(1, Math.min(120, k * k * 200)));
}
