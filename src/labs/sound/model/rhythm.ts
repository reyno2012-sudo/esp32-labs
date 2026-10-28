// kit/lib/sound-kit/src/rhythm.h in TypeScript: knock rhythms as shares of the whole pattern, and the
// beat detector of S6's party.

/** The gaps between knocks as shares of the whole pattern (so speed doesn't matter). */
export function shares(r: readonly number[]): number[] {
  const first = r[0] ?? 0;
  const len = (r.at(-1) ?? 0) - first;
  return r.slice(1).map((v, i) => (len ? (v - (r[i] ?? 0)) / len : 0));
}

export interface RhythmMatch {
  readonly ok: boolean;
  /** 0-100. */
  readonly score: number;
  /** The worst gap's error, as a share of the pattern. */
  readonly worst: number;
  readonly why: string;
  readonly errs: readonly number[];
}

export function matchRhythm(
  secret: readonly number[],
  attempt: readonly number[],
  tol = 0.12,
): RhythmMatch {
  if (secret.length < 2) return { ok: false, score: 0, worst: 1, why: "no secret yet", errs: [] };
  if (attempt.length !== secret.length)
    return {
      ok: false,
      score: 0,
      worst: 1,
      why: attempt.length < secret.length ? "too few knocks" : "too many knocks",
      errs: [],
    };
  const a = shares(secret);
  const b = shares(attempt);
  const errs = a.map((x, i) => Math.abs(x - (b[i] ?? 0)));
  const worst = Math.max(...errs);
  const sum = errs.reduce((s, e) => s + e, 0);
  return {
    ok: worst <= tol,
    score: Math.round(Math.max(0, 100 - (sum / errs.length) * 400)),
    worst,
    why: worst <= tol ? "" : "the rhythm is off",
    errs,
  };
}

/** A beat: the short-term energy jumps over the long-term one, loud enough, not too soon. */
export class BeatDetector {
  ratio = 1.6;
  minAboveDb = 10;
  minGapMs = 280;
  beats = 0;
  #sE = 0;
  #lE = 0;
  #last = 0;
  #gaps: number[] = [];

  push(rms: number, above: number, ms: number): boolean {
    const e = rms * rms;
    this.#sE += 0.35 * (e - this.#sE);
    this.#lE += 0.004 * (e - this.#lE);
    if (!(
      this.#sE > this.ratio * this.#lE &&
      above >= this.minAboveDb &&
      ms - this.#last >= this.minGapMs
    ))
      return false;
    if (this.#last && ms - this.#last < 2000) {
      this.#gaps.push(ms - this.#last);
      if (this.#gaps.length > 8) this.#gaps.shift();
    }
    this.#last = ms;
    this.beats++;
    return true;
  }

  /** The tempo: the median gap of the last 8 beats; 0 until there are 4. */
  bpm(): number {
    if (this.#gaps.length < 4) return 0;
    const s = [...this.#gaps].sort((x, y) => x - y);
    return Math.round(60000 / (s[Math.floor(s.length / 2)] ?? 1));
  }
}
