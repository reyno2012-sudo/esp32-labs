import { describe, expect, it } from "vitest";
import { overEnglish } from "./over-english";

describe("overEnglish", () => {
  it("keeps English wherever the translation has no string", () => {
    const en = { label: "Wake", steps: [{ title: "a", text: "b" }, { title: "c", text: "d" }] };
    const fr = { label: "Réveil", steps: [{ title: "A" }], extra: "x" };
    expect(overEnglish(en, fr)).toEqual({
      label: "Réveil",
      steps: [
        { title: "A", text: "b" },
        { title: "c", text: "d" },
      ],
    });
  });

  it("ignores a translation of the wrong shape", () => {
    expect(overEnglish({ a: ["x"] }, { a: "y" })).toEqual({ a: ["x"] });
    expect(overEnglish("x", undefined)).toBe("x");
  });
});
