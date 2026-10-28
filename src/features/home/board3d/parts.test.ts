import { describe, expect, it } from "vitest";
import type { ActiveLesson, LessonEntry } from "@/domain/lesson";
import { BOARD_PARTS, partLessons } from "./parts";

const lesson = (id: string, extra: Partial<ActiveLesson> = {}): ActiveLesson => ({
  kind: "lesson",
  id,
  track: "intro",
  title: id,
  heading: id,
  status: "built",
  steps: [],
  ...extra,
});

describe("partLessons", () => {
  const lessons: LessonEntry[] = [
    lesson("01", {
      usb: true,
      cmd: "pio run -e 01-hello",
      pins: [{ pin: "48", role: "RGB", side: "R" }],
    }),
    lesson("02", { cmd: "pio run -e 02-led", pins: [{ pin: "4", role: "LED +", side: "L" }] }),
    lesson("03b", {
      variants: [
        { key: "v1", label: "BOOT", short: "", pins: [{ pin: "0", role: "BTN", side: "R" }] },
      ],
    }),
    lesson("W1", { track: "wifi" }),
    { kind: "planned", id: "W9", track: "wifi", title: "x", status: "planned" },
  ];
  const ids = (part: Parameters<typeof partLessons>[0]) =>
    partLessons(part, lessons).map((l) => l.id);

  it("finds a part's lessons from their pins, flags, firmware and theme", () => {
    expect(ids("rgb")).toEqual(["01"]);
    expect(ids("usb")).toEqual(["01"]);
    expect(ids("headers")).toEqual(["02", "03b"]);
    expect(ids("buttons")).toEqual(["03b"]);
    expect(ids("module")).toEqual(["01", "02"]);
    expect(ids("antenna")).toEqual(["W1"]);
  });

  it("has one callout per part", () => {
    expect(new Set(BOARD_PARTS.map((p) => p.id)).size).toBe(BOARD_PARTS.length);
  });
});
