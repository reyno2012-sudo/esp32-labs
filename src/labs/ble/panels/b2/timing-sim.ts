// B2 "When does a scanner hear it?": advertising events (channels 37, 38, 39, 0.4 ms apart, every
// interval plus advDelay) against a scanner listening on one channel per scan interval.

export interface TimingSettings {
  /** Advertising interval, ms. */
  readonly adv: number;
  /** Scan interval, ms. */
  readonly si: number;
  /** Scan window, ms. */
  readonly win: number;
  /** The random 0-10 ms advDelay. */
  readonly delay: boolean;
}

export interface AdvEvent {
  readonly t: number;
  /** Caught on channel 37, 38, 39. */
  readonly hit: readonly [boolean, boolean, boolean];
}

/** ms of simulated time across the canvas. */
export const SPAN = 1500;

/** Which channel (0-2 for 37-39) the scanner listens to at time t, or -1 between windows. */
export function scanAt(t: number, si: number, win: number): number {
  const k = Math.floor(t / si);
  return t - k * si < win ? ((k % 3) + 3) % 3 : -1;
}

/** Two clocks with no random delay and intervals that divide evenly stay in lockstep forever. */
export const lockstep = (s: TimingSettings): boolean =>
  !s.delay && (s.adv % s.si === 0 || s.si % s.adv === 0);

export class TimingSim {
  simT = 0;
  events: AdvEvent[] = [];
  nextEv = 0;
  caught = 0;
  total = 0;
  firstCatch: number | null = null;

  reset(): void {
    this.simT = 0;
    this.events = [];
    this.nextEv = 0;
    this.caught = 0;
    this.total = 0;
    this.firstCatch = null;
  }

  /** Advances simulated time and fires every advertising event up to it. */
  advance(dtMs: number, s: TimingSettings, random = Math.random): void {
    this.simT += dtMs;
    while (this.nextEv <= this.simT) {
      const at = this.nextEv;
      const hit = [0, 1, 2].map((c) => scanAt(at + c * 0.4, s.si, s.win) === c) as [
        boolean,
        boolean,
        boolean,
      ];
      if (hit.some(Boolean)) {
        this.caught++;
        if (this.firstCatch === null) this.firstCatch = at;
      }
      this.total++;
      this.events.push({ t: at, hit });
      this.nextEv += s.adv + (s.delay ? random() * 10 : 0);
    }
    this.events = this.events.filter((e) => this.simT - e.t < SPAN);
  }
}
