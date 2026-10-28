// kit/lib/sound-kit/src/onsets.h in TypeScript: armed → loud → quiet → armed; a clap if it was short.

export interface OnsetConfig {
  riseDb: number;
  releaseDb: number;
  maxClapMs: number;
  quietMs: number;
}

export type OnsetKind = "onset" | "clap" | "long";

export interface OnsetEvent {
  readonly kind: OnsetKind;
  /** When the sound started (for clap/long) or now (for onset). */
  readonly ms: number;
  readonly len: number;
  /** Loudest dB above the quiet. */
  readonly db: number;
}

export type OnsetState = "armed" | "loud" | "quiet";

export class OnsetDetector {
  readonly cfg: OnsetConfig;
  state: OnsetState = "armed";
  start = 0;
  #quietSince = 0;
  #peak = 0;

  constructor(cfg: Partial<OnsetConfig> = {}) {
    this.cfg = { riseDb: 18, releaseDb: 8, maxClapMs: 160, quietMs: 40, ...cfg };
  }

  /** One frame: dB above the quiet at `ms`. Returns an event when one happens. */
  push(above: number, ms: number): OnsetEvent | null {
    const c = this.cfg;
    if (this.state === "armed") {
      if (above >= c.riseDb) {
        this.state = "loud";
        this.start = ms;
        this.#peak = above;
        return { kind: "onset", ms, len: 0, db: above };
      }
    } else if (this.state === "loud") {
      this.#peak = Math.max(this.#peak, above);
      if (above < c.releaseDb) {
        this.state = "quiet";
        this.#quietSince = ms;
        const len = ms - this.start;
        return { kind: len <= c.maxClapMs ? "clap" : "long", ms: this.start, len, db: this.#peak };
      }
    } else if (above >= c.releaseDb) this.#quietSince = ms;
    else if (ms - this.#quietSince >= c.quietMs) this.state = "armed";
    return null;
  }
}

/** Claps closer than `gapMs` form one pattern; a longer pause closes it. */
export class ClapGroups {
  gapMs: number;
  open: number[] = [];

  constructor(gapMs = 650) {
    this.gapMs = gapMs;
  }

  add(ms: number): void {
    this.open.push(ms);
  }

  /** The finished pattern (its claps' times), once the pause is long enough. */
  poll(ms: number): number[] | null {
    const last = this.open.at(-1);
    if (last === undefined || ms - last < this.gapMs) return null;
    const g = this.open;
    this.open = [];
    return g;
  }
}
