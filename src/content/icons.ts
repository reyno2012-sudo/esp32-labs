import type { TrackId } from "@/domain/lesson";
import type { PartName } from "@/ui/parts/registry";

// What each theme and each lesson is about, as the part it centres on (from the parts
// library, src/ui/parts). Shown on the labs map, the theme pills, the lesson header and the
// next-lesson card; the content test checks every lesson has one.

export const TRACK_PART: Record<TrackId, PartName> = {
  intro: "devkit",
  display: "tft",
  wifi: "router",
  rfid: "reader",
  sensors: "sensor",
  ble: "bluetooth",
  sound: "speaker",
};

export const LESSON_PART: Readonly<Record<string, PartName>> = {
  "00": "cable",
  "01": "rgb-led",
  "02": "led",
  "03": "tft",
  "03b": "showcase",
  W1: "router",
  W2: "phone-wifi",
  W3: "cloud",
  W4: "tower",
  W5: "notebook",
  R1: "reader",
  R2: "card",
  R3: "cards",
  R4: "memory",
  R5: "coins",
  R6: "range",
  R7: "keyfob",
  R8: "keyfobs",
  B1: "radar",
  B2: "beacon",
  B3: "chat",
  B4: "padlock",
  B5: "phone-ble",
  B6: "keyboard",
  B7: "note",
  B8: "mouse",
  S1: "mic",
  S2: "meter",
  S3: "burst",
  S4: "cassette",
  S5: "equalizer",
  S6: "gamepad",
  S7: "speaker",
  S8: "knob",
};

/** A lesson's part, falling back to its theme's. */
export const lessonPart = (id: string, track: TrackId): PartName =>
  LESSON_PART[id] ?? TRACK_PART[track];
