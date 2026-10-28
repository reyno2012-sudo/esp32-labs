import type { LabState } from "@/labs/shared/lab-screen/types";
import type { TerminalPrinter, Tone } from "@/ui/terminal/terminal-log";

export type Radio = "off" | "scanning" | "advertising" | "connecting" | "connected";
/** Palette colours the footer and log marks use. */
export type Tint = "teal" | "amber" | "coral" | "blue" | "violet" | "muted";
/** The firmware's log marks: + good news, ! warning, x failure, < received, > sent, - info. */
export type Mark = "+" | "!" | "x" | "<" | ">" | "-";

/**
 * What the shared status bar reads, like kit/lib/ble-kit/src/ble_views.h does on the board. Every BLE
 * lab's state extends it.
 */
export interface BleState extends LabState {
  radio: Radio;
  encrypted?: boolean;
  bonded?: boolean;
  rssi?: number;
  footer?: string;
  footerCol?: Tint;
  /** A pairing code drawn over the view while it waits for a person. */
  passkey?: number;
  /** The passkey is a numeric comparison (yes/no) rather than one to type. */
  compare?: boolean;
  /** Simulated delays still pending; cleared when the preview goes away. */
  timers: ReturnType<typeof setTimeout>[];
}

export const MARK_TINT: Readonly<Record<Mark, Tint>> = {
  "+": "teal",
  "!": "amber",
  x: "coral",
  "<": "blue",
  ">": "violet",
  "-": "muted",
};

/** Runs `fn` after `ms`, like the board finishing something later; the kit cancels it on unmount. */
export function later(st: BleState, ms: number, fn: () => void): void {
  st.timers.push(setTimeout(fn, ms));
}

/** One line of the activity log: [time, mark, text]. */
export type LogLine = readonly [time: string, mark: Mark, text: string];

export interface LoggingState extends BleState {
  log: LogLine[];
}

const stamp = () => (performance.now() / 1000).toFixed(1).padStart(7);

/** Adds a line to the board's activity log and footer (no serial output). */
export function pushLog(st: LoggingState, mark: Mark, text: string): void {
  st.log.push([stamp(), mark, text]);
  if (st.log.length > 30) st.log.shift();
  st.footer = `${mark} ${text}`;
  st.footerCol = MARK_TINT[mark];
}

const TONE: Readonly<Record<Mark, Tone>> = {
  "+": "info",
  "!": "warn",
  x: "warn",
  "<": "plain",
  ">": "plain",
  "-": "plain",
};

/** The firmware's BLE_NOTE: one line in the activity log, the footer and the serial monitor. */
export function bleSimLog(st: LoggingState, term: TerminalPrinter, mark: Mark, text: string): void {
  pushLog(st, mark, text);
  term.line(`  ${mark} ${text}`, TONE[mark]);
}
