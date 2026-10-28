import type { LabState, ScreenSpec } from "@/labs/shared/lab-screen/types";
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import type { Mic } from "../model/mic";

export type NoteMark = "+" | "!" | "x" | "-";
export type NoteColour = "teal" | "amber" | "coral" | "muted";

/** What every sound lab's state has: the pretend microphone (and its speaker) and the footer note. */
export interface SoundState extends LabState {
  readonly mic: Mic;
  /** The serial monitor, once a preview has started (galleries have none). */
  term?: TerminalPrinter | undefined;
  /** The footer's latest note (SoundLab::note()). */
  note?: string;
  noteAt?: number;
  noteCol?: NoteColour;
  /** The DO lamp in the status bar. */
  doLamp?: boolean;
  /** The red REC dot in the status bar. */
  rec?: boolean;
  plotTimer?: ReturnType<typeof setInterval> | undefined;
}

/** One sound lab's screen: the engine's ScreenSpec plus its double-click labels and help rows. */
export interface SoundSpec<S extends SoundState> extends ScreenSpec<S> {
  /** What a double-click does on each view (the footer's left side). */
  readonly dbl: readonly string[];
  /** The lab's own commands for `help`: [usage, what it does]. */
  readonly commands: readonly (readonly [string, string])[];
}
