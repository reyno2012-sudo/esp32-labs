import { describe, expect, it } from "vitest";
import { type ActiveLesson, resolveLesson } from "./lesson";
import { lessonSections } from "./lesson-sections";

const base: ActiveLesson = {
  kind: "lesson",
  id: "02",
  track: "intro",
  title: "First circuit",
  heading: "An LED",
  status: "built",
  steps: ["wire it"],
};

describe("lessonSections", () => {
  it("lists only the parts a lesson has, goal first and steps always", () => {
    expect(lessonSections(resolveLesson(base)).map((s) => s.kind)).toEqual(["goal", "steps"]);
  });

  it("gives each part a unique id, in page order", () => {
    const full = resolveLesson({
      ...base,
      panels: [
        { title: "PWM", widget: "led" },
        { title: "States", widget: "led" },
      ],
      wiring: { rows: [["GPIO 4", "resistor", "first leg"]] },
      commands: [{ command: "on", card: "any", does: "on", see: "lit" }],
      preview: { widget: "led" },
    });
    const sections = lessonSections(full);
    expect(sections.map((s) => s.kind)).toEqual([
      "goal",
      "explain",
      "explain",
      "wiring",
      "commands",
      "steps",
      "preview",
    ]);
    expect(sections[3]).not.toHaveProperty("title");
    expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
    expect(sections[2]).toMatchObject({ title: "States", number: 2, panel: 1 });
  });
});
