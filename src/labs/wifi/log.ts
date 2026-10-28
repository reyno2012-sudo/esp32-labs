import type { TerminalLog, Tone } from "@/ui/terminal/terminal-log";

/** One line the pretend firmware prints on the serial monitor. */
export type LogLine = readonly [string, Tone];

/** Writes the pretend firmware's lines to a serial monitor. */
export function printLog(term: TerminalLog, lines: readonly LogLine[]): void {
  for (const [text, tone] of lines) term.line(text, tone);
}
