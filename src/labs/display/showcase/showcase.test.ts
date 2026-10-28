import { describe, expect, it } from "vitest";
import { hsv, mix, parseColor } from "../color";
import {
  autoLines,
  releaseGesture,
  showcaseMode,
  showSceneLine,
  wrapScene,
} from "./showcase-firmware";

describe("showcase controls", () => {
  it("cycles through the four scenes both ways", () => {
    expect([wrapScene(4), wrapScene(-1)]).toEqual([0, 3]);
    expect(showSceneLine(3)[0]).toBe("[I][main.cpp:70] showScene(): scene 4/4: Live dashboard");
  });

  it("treats a 0.6 s hold as a long press and logs the right firmware", () => {
    expect([releaseGesture(599), releaseGesture(600)]).toEqual(["click", "long"]);
    expect(showcaseMode("button")).toBe("button");
    expect(showcaseMode(undefined)).toBe("boot");
    expect(autoLines("button", false).map(([t]) => t)).toEqual([
      "[I][with_button.cpp:24] toAction(): button: long press",
      "[I][main.cpp:170] pollControls(): auto-cycle off",
    ]);
  });
});

describe("scene colours", () => {
  it("parses token colours and blends them", () => {
    expect(parseColor("#0c121c")).toEqual([12, 18, 28]);
    expect(parseColor("rgb(255 128 0)")).toEqual([255, 128, 0]);
    expect(mix([0, 0, 0], [255, 100, 10], 0.5)).toEqual([128, 50, 5]);
    expect(hsv(0, 1, 1)).toEqual([255, 0, 0]);
  });
});
