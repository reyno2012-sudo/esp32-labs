// The push button on GPIO 5 as the pin sees it: each press and release bounces for a few
// fractions of a millisecond, and the firmware's debouncer (same rules as button.h) only
// trusts a level after 25 ms of quiet, then turns presses into click, double-click and long press.

export interface Edge {
  /** performance.now() time, ms. */
  readonly t: number;
  /** true = LOW (pressed, joined to GND). */
  readonly low: boolean;
}

/** A recognised gesture; the component words it (labs-display button.gestures.*). */
export type Gesture =
  | { readonly kind: "click"; readonly bounces: number }
  | { readonly kind: "double" }
  | { readonly kind: "long" };

export const DEBOUNCE_MS = 25;
export const LONG_MS = 600;
export const GAP_MS = 280;
/** How much history the scope keeps (it shows the last 1.2 s). */
const KEEP_MS = 3000;

const START: Edge = { t: -1e9, low: false };

export class ButtonSignal {
  /** Raw pin edges, bounces included. */
  edges: Edge[] = [START];
  /** What the debouncer trusts. */
  deb: Edge[] = [START];
  /** When the last press started (for the zoom box), null before the first press. */
  lastPressT: number | null = null;
  /** The last recognised gesture, null before the first one. */
  lastEvent: Gesture | null = null;

  #down = false;
  #clicks = 0;
  #releasedAt = 0;
  #pressedAt = 0;
  #longFired = false;
  #bounceCount = 0;
  #edgesAtRest = 0;
  #totalEdges = 0;
  readonly #random: () => number;

  constructor(random: () => number = Math.random) {
    this.#random = random;
  }

  #rawLow = () => this.edges.at(-1)?.low ?? false;
  #debLow = () => this.deb.at(-1)?.low ?? false;

  /** The contacts chatter: 3–6 bounces when closing, 1–3 when opening, then settle. */
  #bounceTo(low: boolean, now: number) {
    let t = now;
    let cur = this.#rawLow();
    const n = low ? 3 + Math.floor(this.#random() * 4) : 1 + Math.floor(this.#random() * 3);
    for (let k = 0; k < n * 2; k++) {
      t += 0.08 + this.#random() * 0.45;
      cur = !cur;
      this.edges.push({ t, low: cur });
      this.#totalEdges++;
    }
    if (cur !== low) {
      t += 0.3;
      this.edges.push({ t, low });
      this.#totalEdges++;
    }
    if (low) this.lastPressT = now;
  }

  press(now: number): void {
    if (this.#down) return;
    this.#down = true;
    this.#bounceTo(true, now);
  }

  release(now: number): void {
    if (!this.#down) return;
    this.#down = false;
    this.#bounceTo(false, now);
  }

  /** Advances the debouncer and gesture detector to `now`; returns the raw level (true = LOW). */
  step(now: number): boolean {
    let last = START;
    for (const e of this.edges) if (e.t <= now) last = e;
    if (last.low !== this.#debLow() && now - last.t >= DEBOUNCE_MS) {
      this.deb.push({ t: last.t + DEBOUNCE_MS, low: last.low });
      if (last.low) {
        this.#pressedAt = now;
        this.#longFired = false;
      } else {
        const n = this.#totalEdges - this.#edgesAtRest;
        this.#edgesAtRest = this.#totalEdges;
        this.#bounceCount = Math.max(0, n - 2);
        if (!this.#longFired) {
          this.#clicks++;
          this.#releasedAt = now;
        }
      }
    }
    const debLow = this.#debLow();
    if (debLow && !this.#longFired && now - this.#pressedAt >= LONG_MS) {
      this.#longFired = true;
      this.#clicks = 0;
      this.lastEvent = { kind: "long" };
    }
    if (!debLow && this.#clicks >= 2) {
      this.#clicks = 0;
      this.lastEvent = { kind: "double" };
    }
    if (!debLow && this.#clicks === 1 && now - this.#releasedAt >= GAP_MS) {
      this.#clicks = 0;
      this.lastEvent = { kind: "click", bounces: this.#bounceCount };
    }
    this.#forget(now);
    return last.low;
  }

  /** Drops old edges, but keeps the first, the newest and the last press for the zoom box. */
  #forget(now: number) {
    const cutoff = Math.min(
      now - KEEP_MS,
      this.lastPressT === null ? Infinity : this.lastPressT - 1,
    );
    const prune = (list: Edge[]) =>
      list.filter((e, i) => i === 0 || e.t >= cutoff || i === list.length - 1);
    if (this.edges.length > 2 && (this.edges[1]?.t ?? Infinity) < cutoff)
      this.edges = prune(this.edges);
    if (this.deb.length > 2 && (this.deb[1]?.t ?? Infinity) < cutoff) this.deb = prune(this.deb);
  }
}

/** The pin's level at time t in an edge list. */
export function levelAt(list: readonly Edge[], t: number): boolean {
  let level = list[0]?.low ?? false;
  for (const e of list) {
    if (e.t <= t) level = e.low;
    else break;
  }
  return level;
}
