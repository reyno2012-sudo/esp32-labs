import type { Rich } from "@/domain/lesson";

// Hand-written tours: for the labs where words matter most (the first ones), a person writes the
// stops instead of the automatic tour built from the code's own comments. Stops point at code by
// the text a line contains, not by line number, so they survive edits; a test checks every anchor.

export interface QuizSpec {
  /** Asked before the explanation, when "Guess first" is on. */
  readonly question: Rich;
  readonly options: readonly Rich[];
  /** Index of the right option. */
  readonly answer: number;
  /** Shown after answering, right or wrong. */
  readonly why: Rich;
}

export interface TourStopSpec {
  /** Text the stop's first line contains; searched from the previous stop's first line onwards. */
  readonly at: string;
  /**
   * Text the stop's last line contains, searched from `at`. Without it the stop covers the block
   * that opens on `at`'s line (a whole function), or else that one line.
   */
  readonly to?: string;
  readonly title: string;
  /** What these lines do, in plain words. Everyone reads this. */
  readonly say: Rich;
  /** The precise story, shown at the Deep dive level (or behind "More"). */
  readonly deep?: Rich;
  readonly quiz?: QuizSpec;
  /** Part of the short Beginner tour. Default true; set false for detail stops. */
  readonly essential?: boolean;
}

export interface FileTourSpec {
  /** Path as in the firmware manifest, e.g. "labs/02-led/src/main.cpp". */
  readonly path: string;
  readonly stops: readonly TourStopSpec[];
}

export interface LabTourSpec {
  /** PlatformIO environment, e.g. "02-led". */
  readonly env: string;
  /** Two or three sentences: what the program does as a whole, before any code. */
  readonly bigPicture: Rich;
  readonly files: readonly FileTourSpec[];
}
