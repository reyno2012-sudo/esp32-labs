import { describe, expect, it } from "vitest";
import { cubicAtFraction, cubicLength } from "./bezier";
import { BYTES, buildSlots, slotCaption } from "./spi-analyzer";

describe("SPI transfer on the logic analyzer", () => {
  const slots = buildSlots();

  it("clocks out 0x2C as a command, then 0xF800 as data, MSB first", () => {
    const bits = (byte: number) =>
      slots
        .filter((s) => s.byte === byte)
        .map((s) => s.bit)
        .join("");
    expect([bits(0), bits(1), bits(2)]).toEqual(["00101100", "11111000", "00000000"]);
    expect(slots.filter((s) => s.byte === 0).every((s) => s.dc === 0)).toBe(true);
    expect(slots.filter((s) => s.byte > 0).every((s) => s.dc === 1)).toBe(true);
    expect([slots[0]?.cs, slots.at(-1)?.cs]).toEqual([1, 1]);
  });

  it("captions the bit under the playhead", () => {
    const first = slots.find((s) => s.byte === 0);
    expect(slotCaption(first)).toEqual({ kind: "bit", byte: BYTES[0], k: 7, bit: 0 });
    expect(slotCaption(slots[0])).toEqual({ kind: "ignored" });
  });
});

describe("wire curves", () => {
  const line = { from: [0, 0], c1: [10, 0], c2: [20, 0], to: [30, 0] } as const;

  it("measures and walks a curve by arc length", () => {
    expect(cubicLength(line)).toBeCloseTo(30, 5);
    expect(cubicAtFraction(line, 0.5)[0]).toBeCloseTo(15, 1);
    expect(cubicAtFraction(line, 1)).toEqual([30, 0]);
  });
});
