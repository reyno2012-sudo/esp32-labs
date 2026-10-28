import { describe, expect, it } from "vitest";
import { box, cylinder, line, ORIGIN, poly, project } from "./iso";

describe("iso", () => {
  it("puts the origin at ORIGIN, x right-down, y left-down, z up", () => {
    expect(project([0, 0, 0])).toEqual(ORIGIN);
    const [x1, y1] = project([10, 0, 0]);
    expect(x1).toBeGreaterThan(ORIGIN[0]);
    expect(y1).toBeGreaterThan(ORIGIN[1]);
    const [x2, y2] = project([0, 10, 0]);
    expect(x2).toBeLessThan(ORIGIN[0]);
    expect(y2).toBeGreaterThan(ORIGIN[1]);
    expect(project([0, 0, 5])[1]).toBe(ORIGIN[1] - 5);
  });

  it("builds closed faces and open lines", () => {
    expect(poly([0, 0, 0], [1, 0, 0], [0, 1, 0])).toMatch(/^M.*Z$/);
    expect(line([0, 0, 0], [1, 0, 0])).not.toMatch(/Z$/);
    const faces = box(0, 0, 0, 4, 4, 4);
    expect(Object.keys(faces)).toEqual(["top", "left", "right"]);
    expect(faces.top.split("L")).toHaveLength(4);
  });

  it("draws a cylinder's top as an ellipse and its side as a band", () => {
    const c = cylinder(0, 0, 0, 5, 3);
    expect(c.top).toContain("a");
    expect(c.side).toContain("A");
  });
});
