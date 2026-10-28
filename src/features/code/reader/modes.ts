import type { ComponentType } from "react";
import { ExploreMode } from "./modes/ExploreMode";
import { StoryMode } from "./modes/StoryMode";
import { TourMode } from "./modes/TourMode";
import type { ModeId } from "./reader-context";

// The ways to read a lab's code. Adding one = a component that renders a ReaderFrame, plus an
// entry here; the shell, toolbar and URL handling pick it up.
// Each mode's label and hint (the mode switch's tooltip) live in the catalogue: modes.<id>.
export interface ReaderModeInfo {
  readonly id: ModeId;
  /** Offered in the Simple view too. */
  readonly simple: boolean;
  readonly Component: ComponentType;
}

export const READER_MODES: readonly ReaderModeInfo[] = [
  {
    id: "tour",
    simple: true,
    Component: TourMode,
  },
  {
    id: "story",
    simple: true,
    Component: StoryMode,
  },
  {
    id: "explore",
    simple: false,
    Component: ExploreMode,
  },
];

export const modesFor = (simple: boolean) => READER_MODES.filter((m) => !simple || m.simple);
