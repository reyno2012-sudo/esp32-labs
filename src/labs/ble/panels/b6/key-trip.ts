// B6 "A key press, from button to letter": characters queued, sent one by one as key numbers,
// read back by the computer with its own layout.
import { hostChar, type Layout, LAYOUTS } from "../../protocol/keyboard-layout";

export interface Trip {
  readonly ch: string;
  readonly mod: number;
  readonly key: number;
  /** What the computer shows for it. */
  readonly out: string;
}

/** One key's trip lasts this long (ms). */
export const TRIP_MS = 1400;

export class KeyTrip {
  queue: string[] = [];
  typed = "";
  cur: Trip | null = null;
  t0 = 0;
  board: Layout = "us";
  host: Layout = "de";

  /** Starts over with new layouts: clears the computer's line and queues `text`. */
  retype(text: string, board: Layout, host: Layout, now: number): string {
    this.typed = "";
    this.board = board;
    this.host = host;
    return this.start(text, now);
  }

  /** Queues `text`; returns the characters the board's layout can't type. */
  start(text: string, now: number): string {
    this.queue = [...text];
    const skipped = this.queue.filter((c) => !LAYOUTS.char[this.board][c]).join("");
    if (!this.cur) this.next(now);
    return skipped;
  }

  clear(): void {
    this.typed = "";
    this.queue = [];
    this.cur = null;
  }

  /** Progress of the current key, 0..1 (1 when idle). Moves to the next key when one lands. */
  progress(now: number, duration = TRIP_MS): number {
    if (!this.cur) return 1;
    const k = Math.min(1, (now - this.t0) / duration);
    return k;
  }

  /** Called once a key has landed: adds its character and starts the next. */
  land(now: number): void {
    if (!this.cur) return;
    this.typed += this.cur.out;
    this.next(now);
  }

  private next(now: number) {
    while (this.queue.length) {
      const ch = this.queue.shift() ?? "";
      const stroke = LAYOUTS.char[this.board][ch];
      if (!stroke) continue;
      this.cur = { ch, mod: stroke[0], key: stroke[1], out: hostChar(stroke, this.host) };
      this.t0 = now;
      return;
    }
    this.cur = null;
  }
}
