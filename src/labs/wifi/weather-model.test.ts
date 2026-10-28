import { describe, expect, it } from "vitest";
import { ledBody, wrapText } from "./phone-screen";
import {
  askOracle,
  HAIKU,
  initWeather,
  oracleAnswered,
  typedLines,
  UMBRELLA,
} from "./weather-model";
import { mixColor } from "./weather-draw";

describe("wifi-lab-w3 oracle", () => {
  it("asks once at a time and switches to the oracle view", () => {
    const st = initWeather();
    const lines = askOracle(st, UMBRELLA, 100, "ask should I take an umbrella?");
    expect(lines?.at(-1)?.[0]).toContain("asking oracle: should I take an umbrella?");
    expect(st.view).toBe(3);
    expect(askOracle(st, HAIKU, 200)).toBeNull();
    oracleAnswered(st, UMBRELLA, 2500);
    expect(st).toMatchObject({ asking: 0, answer: UMBRELLA, footer: "ai 2840 ms 1.4 KB" });
  });

  it("types the answer out at 35 characters a second", () => {
    expect(typedLines(["abcdef", "ghij"], 0)).toEqual([]);
    expect(typedLines(["abcdef", "ghij"], 200)).toEqual(["abcdef", "g"]);
  });
});

describe("helpers", () => {
  it("wraps words to the width, at most three lines", () => {
    expect(wrapText((t) => t.length, "aa bb cc dd ee", 5)).toEqual(["aa bb", "cc dd", "ee"]);
    expect(wrapText((t) => t.length, "a b c d", 1)).toHaveLength(3);
  });

  it("turns a picked colour into the LED request body", () => {
    expect(ledBody("#00a078")).toBe('{"r":0,"g":160,"b":120}');
  });

  it("mixes colours, falling back to the first", () => {
    expect(mixColor("#000000", "#ffffff", 0.5)).toBe("rgb(128, 128, 128)");
    expect(mixColor("var(--x)", "#ffffff", 0.5)).toBe("var(--x)");
  });
});
