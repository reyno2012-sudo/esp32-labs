import type { PinKind } from "@/domain/lesson";

/** The colour of a pin's role tag, the same on the pinout and in the lesson's "On the board" chips. */
export const roleFill = (kind?: PinKind) =>
  !kind ? "var(--copper)" : kind === "btn" ? "var(--w-btn)" : `var(--${kind})`;
