import { describe, expect, it } from "vitest";
import { type ActiveLesson, resolveLesson, stepKey } from "./lesson";

const base: ActiveLesson = {
  kind: "lesson",
  id: "03b",
  track: "display",
  title: "Showcase",
  status: "built",
  heading: "Push the screen further",
  variants: [
    {
      key: "boot",
      label: "v1",
      short: "BOOT only",
      goal: "boot goal",
      steps: ["a"],
      previewMode: "boot",
    },
    {
      key: "button",
      label: "v2",
      short: "push button",
      goal: "button goal",
      steps: ["a", "b"],
      previewMode: "button",
    },
  ],
};

describe("resolveLesson", () => {
  it("applies the chosen variant over the base lesson", () => {
    const l = resolveLesson(base, "button");
    expect(l).toMatchObject({
      variantKey: "button",
      goal: "button goal",
      previewMode: "button",
      heading: "Push the screen further",
    });
    expect(l.steps).toHaveLength(2);
  });

  it("falls back to the first variant for an unknown key", () => {
    expect(resolveLesson(base, "nope").variantKey).toBe("boot");
  });

  it("keys ticks per variant, like the original guide", () => {
    expect(stepKey(resolveLesson(base, "button"), 1)).toBe("03b.button-1");
    expect(stepKey({ id: "R1" }, 0)).toBe("R1-0");
  });
});
