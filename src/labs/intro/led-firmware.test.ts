import { describe, expect, it } from "vitest";
import { duty, handleCommand, initialLed } from "./led-firmware";

describe("lesson 02 LED firmware", () => {
  const start = initialLed(0);

  it("blinks at the requested speed and validates it", () => {
    const { state } = handleCommand(start, "blink 200", 1000);
    expect(state).toMatchObject({ mode: "blink", blinkMs: 200, since: 1000 });
    expect([duty(state, 0), duty(state, 250)]).toEqual([255, 0]);
    expect(handleCommand(start, "blink 5", 0).lines[0]?.[1]).toBe("warn");
  });

  it("dims with level and answers unknown commands", () => {
    const { state } = handleCommand(handleCommand(start, "on", 0).state, "level 30", 0);
    expect(duty(state, 123)).toBe(30);
    expect(handleCommand(start, "dance", 0).lines[0]?.[0]).toContain("unknown command 'dance'");
  });

  it("fades along a squared triangle", () => {
    expect([duty(start, 0), duty(start, 1000), duty(start, 2000)]).toEqual([0, 255, 0]);
  });
});
