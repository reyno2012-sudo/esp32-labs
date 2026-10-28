import { describe, expect, it } from "vitest";
import type { LessonEntry } from "./lesson";
import { resolveLesson } from "./lesson";
import {
  continueLesson,
  entryLesson,
  isLessonDone,
  isLessonWorking,
  lessonState,
  neighbours,
  stepsTicked,
  tallyStates,
} from "./progress";

const lesson = (id: string, status: string, steps = ["one", "two"]): LessonEntry => ({
  kind: "lesson",
  id,
  track: "rfid",
  title: id,
  status,
  heading: id,
  steps,
});

describe("progress rules", () => {
  it("is done when every step is ticked", () => {
    expect(isLessonDone(lesson("R1", "built"), { "R1-0": true })).toBe(false);
    expect(isLessonDone(lesson("R1", "built"), { "R1-0": true, "R1-1": true })).toBe(true);
  });

  it("counts a lesson the board already runs as working", () => {
    expect(isLessonWorking(lesson("R1", "works on your board"), {})).toBe(true);
    expect(
      isLessonWorking(
        { kind: "planned", id: "W4", track: "wifi", title: "x", status: "planned" },
        {},
      ),
    ).toBe(false);
  });

  it("opens a track at its first lesson that isn't working yet", () => {
    const lessons = [
      lesson("R1", "works on your board"),
      lesson("R2", "built"),
      lesson("R3", "built"),
    ];
    expect(entryLesson(lessons, {})?.id).toBe("R2");
    expect(
      entryLesson(lessons, { "R2-0": true, "R2-1": true, "R3-0": true, "R3-1": true })?.id,
    ).toBe("R1");
  });

  it("names one state per lesson, your ticks first", () => {
    const planned: LessonEntry = {
      kind: "planned",
      id: "R9",
      track: "rfid",
      title: "x",
      status: "planned",
    };
    const lessons = [
      lesson("R1", "works on your board"),
      lesson("R2", "built, not flashed"),
      planned,
    ];
    expect(lessons.map((l) => lessonState(l, {}))).toEqual(["works", "built", "planned"]);
    expect(lessonState(lessons[1]!, { "R2-0": true, "R2-1": true })).toBe("done");
    expect(tallyStates(lessons, {})).toEqual({ done: 0, works: 1, built: 1, planned: 1 });
  });

  it("counts the ticked steps of the open variant only", () => {
    const base = lesson("R1", "built");
    if (base.kind !== "lesson") throw new Error("test lesson");
    expect(stepsTicked(resolveLesson(base), { "R1-1": true, "R2-0": true })).toBe(1);
  });

  it("finds the openable lessons around one, skipping planned ones", () => {
    const planned: LessonEntry = {
      kind: "planned",
      id: "R2",
      track: "rfid",
      title: "x",
      status: "planned",
    };
    const lessons = [lesson("R1", "built"), planned, lesson("R3", "built")];
    expect(neighbours(lessons, "R1")).toEqual({ prev: undefined, next: lessons[2] });
    expect(neighbours(lessons, "R3").prev?.id).toBe("R1");
    expect(neighbours(lessons, "Z9")).toEqual({});
  });

  it("continues with the last lesson you opened, else the first one not working", () => {
    const lessons = [lesson("R1", "works on your board"), lesson("R2", "built")];
    expect(continueLesson(lessons, "R1", {})?.id).toBe("R1");
    expect(continueLesson(lessons, null, {})?.id).toBe("R2");
    expect(continueLesson(lessons, "gone", {})?.id).toBe("R2");
  });
});
