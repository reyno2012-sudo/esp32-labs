import type { ActiveLesson, LessonEntry, PinUse } from "@/domain/lesson";
import type { PartName } from "@/ui/parts/registry";

// The parts of the DevKitC the board explorer points at, and which lessons use each one. The
// lessons are found from the content itself (pins, USB, BOOT, firmware, theme), so a new lesson
// shows up under its parts without touching this file. Each callout's title and text live in the
// "home" catalogue (board.parts.<id>).

export type PartId = "usb" | "buttons" | "rgb" | "module" | "antenna" | "headers";

export interface BoardPart {
  readonly id: PartId;
  readonly part: PartName;
  /** Which side of the model the callout sits on, on wide screens. */
  readonly side: "left" | "right";
}

export const BOARD_PARTS: readonly BoardPart[] = [
  {
    id: "usb",
    part: "usbc",
    side: "left",
  },
  {
    id: "buttons",
    part: "button",
    side: "left",
  },
  {
    id: "rgb",
    part: "rgb-led",
    side: "left",
  },
  {
    id: "module",
    part: "module",
    side: "right",
  },
  {
    id: "antenna",
    part: "antenna",
    side: "right",
  },
  {
    id: "headers",
    part: "header",
    side: "right",
  },
];

/** Every pin a lesson can use, across its variants. */
const pinsOf = (l: ActiveLesson): readonly PinUse[] => [
  ...(l.pins ?? []),
  ...(l.variants ?? []).flatMap((v) => v.pins ?? []),
];

const USES: Record<PartId, (l: ActiveLesson) => boolean> = {
  usb: (l) => Boolean(l.usb),
  buttons: (l) => Boolean(l.boot) || pinsOf(l).some((p) => p.pin === "0"),
  rgb: (l) => pinsOf(l).some((p) => p.pin === "48"),
  module: (l) => /(?:^|\s)-e\s/.test(l.cmd ?? ""),
  antenna: (l) => l.track === "wifi" || l.track === "ble",
  headers: (l) => pinsOf(l).some((p) => p.pin !== "48"),
};

/** The open lessons that use a part, in table-of-contents order. */
export function partLessons(part: PartId, lessons: readonly LessonEntry[]): ActiveLesson[] {
  return lessons.filter((l): l is ActiveLesson => l.kind === "lesson" && USES[part](l));
}
