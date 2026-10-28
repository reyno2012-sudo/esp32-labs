import { describe, expect, it } from "vitest";
import { INITIAL_SCROLL, nextScrollChrome, type ScrollMemory } from "./scroll-chrome";

const TRAVEL = 10;
// "Away" from 80px down, like a dock that sticks there.
const run = (ys: number[], from: ScrollMemory = INITIAL_SCROLL) =>
  ys.reduce((m, y) => nextScrollChrome(m, y, y > 80, TRAVEL), from);

describe("nextScrollChrome", () => {
  it("is the full form at the top", () => {
    expect(run([0, 30, 80])).toMatchObject({ away: false, hidden: false });
  });

  it("turns away once past the top, and hides while you scroll down", () => {
    expect(run([50, 120, 190])).toMatchObject({ away: true, hidden: true });
  });

  it("does not hide before it has left its place", () => {
    expect(run([20, 60, 79])).toMatchObject({ away: false, hidden: false });
  });

  it("comes back after a short scroll up", () => {
    expect(run([300, 400, 500, 480, 470])).toMatchObject({ away: true, hidden: false });
  });

  it("ignores jitter smaller than the travel", () => {
    const hidden = run([300, 400, 500]);
    expect(hidden.hidden).toBe(true);
    expect(run([495, 498, 494], hidden).hidden).toBe(true);
    expect(run([480], hidden).hidden).toBe(false);
  });

  it("is back to the full form at the top", () => {
    expect(run([300, 400, 500, 60])).toMatchObject({ away: false, hidden: false });
  });
});
