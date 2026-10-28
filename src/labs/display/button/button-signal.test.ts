import { describe, expect, it } from "vitest";
import { ButtonSignal, DEBOUNCE_MS, GAP_MS, LONG_MS, levelAt } from "./button-signal";

const fixed = () => 0.5; // 5 bounces when closing, 2 when opening

/** Steps the signal every ms from `from` to `to`. */
function run(s: ButtonSignal, from: number, to: number) {
  for (let t = from; t <= to; t++) s.step(t);
}

describe("push button signal (button.h rules)", () => {
  it("bounces on the raw pin but debounces to one clean press", () => {
    const s = new ButtonSignal(fixed);
    s.press(1000);
    expect(s.edges.filter((e) => e.t > 1000 && e.t < 1007).length).toBeGreaterThanOrEqual(6);
    run(s, 1000, 1000 + DEBOUNCE_MS + 5);
    expect(s.deb.at(-1)?.low).toBe(true);
    expect(levelAt(s.edges, 1010)).toBe(true);
  });

  it("reports a click after the double-click gap, with the bounces it filtered", () => {
    const s = new ButtonSignal(fixed);
    s.press(1000);
    run(s, 1000, 1100);
    s.release(1100);
    run(s, 1100, 1100 + DEBOUNCE_MS + GAP_MS + 10);
    expect(s.lastEvent).toEqual({ kind: "click", bounces: expect.any(Number) as number });
  });

  it("recognises double-clicks and long presses", () => {
    const s = new ButtonSignal(fixed);
    s.press(1000);
    run(s, 1000, 1080);
    s.release(1080);
    run(s, 1080, 1150);
    s.press(1150);
    run(s, 1150, 1230);
    s.release(1230);
    run(s, 1230, 1300);
    expect(s.lastEvent).toEqual({ kind: "double" });

    s.press(2000);
    run(s, 2000, 2000 + DEBOUNCE_MS + LONG_MS + 10);
    expect(s.lastEvent).toEqual({ kind: "long" });
  });
});
