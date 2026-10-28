import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import type { NoteColour, NoteMark, SoundState } from "./types";

const COLOUR: Readonly<Record<NoteMark, NoteColour>> = {
  "+": "teal",
  "!": "amber",
  x: "coral",
  "-": "muted",
};

/** A note: the footer's right side and the serial monitor, like SoundLab::note(). */
export function soundNote(
  st: SoundState,
  term: TerminalPrinter | undefined,
  mark: NoteMark,
  text: string,
): void {
  st.note = text;
  st.noteAt = performance.now();
  st.noteCol = COLOUR[mark];
  term?.line(
    `  ${mark} ${text}`,
    mark === "+" ? "info" : mark === "!" || mark === "x" ? "warn" : "plain",
  );
}
