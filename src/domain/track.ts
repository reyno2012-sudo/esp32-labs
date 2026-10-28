import type { TrackId } from "./lesson";

/** A theme of lessons. `lessonIds` is the table of contents: order and membership. */
export interface Track {
  readonly id: TrackId;
  readonly title: string;
  readonly blurb: string;
  /** CSS custom property holding the track's colour, e.g. "--rfid". */
  readonly color: `--${string}`;
  readonly lessonIds: readonly string[];
  readonly planned?: boolean;
}
