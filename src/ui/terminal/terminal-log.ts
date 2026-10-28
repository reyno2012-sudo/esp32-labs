// The simulated serial monitor's content, kept outside React so plain simulation code
// (command handlers, timers, frame loops) can print to it. <Terminal> subscribes to it.

export type Tone = "plain" | "info" | "warn" | "error" | "you";

export interface TerminalLine {
  readonly id: number;
  readonly stamp: string;
  readonly text: string;
  readonly tone: Tone;
}

/** What simulation code gets: print a line, or wipe the screen. */
export interface TerminalPrinter {
  line(text: string, tone?: Tone): void;
  clear(): void;
}

const MAX_LINES = 200;
// Stamps count from the session the guide's examples were captured in, like the real monitor.
const EPOCH = Date.UTC(2026, 9, 11, 14, 2, 0);

export class TerminalLog implements TerminalPrinter {
  #lines: readonly TerminalLine[] = [];
  #listeners = new Set<() => void>();
  #nextId = 0;
  readonly #start = performance.now();

  line = (text: string, tone: Tone = "plain"): void => {
    const stamp = new Date(EPOCH + (performance.now() - this.#start)).toISOString().slice(11, 23);
    const next = [...this.#lines, { id: this.#nextId++, stamp, text, tone }];
    this.#lines = next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    this.#emit();
  };

  clear = (): void => {
    this.#lines = [];
    this.#emit();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = (): readonly TerminalLine[] => this.#lines;

  #emit() {
    this.#listeners.forEach((l) => l());
  }
}
