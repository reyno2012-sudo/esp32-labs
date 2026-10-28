import { describe, expect, it } from "vitest";
import { applyOverlay, checkOverlay, extractOverlay, type TextPolicy } from "./overlay";

const policy: TextPolicy = {
  text: new Set(["title", "steps", "rows"]),
  itemKey: ["id"],
};

const source = [
  {
    id: "02",
    title: "First <b>circuit</b>",
    cmd: "pio run -e 02-led",
    steps: ["Wire it.", "Flash it."],
    wiring: { rows: [["GPIO 4", "LED +", "red"]] },
    panels: [{ widget: "led", title: "PWM" }],
  },
];

describe("extractOverlay", () => {
  it("keeps only text fields, keyed by id or index", () => {
    expect(extractOverlay(source, policy)).toEqual({
      "02": {
        title: "First <b>circuit</b>",
        steps: ["Wire it.", "Flash it."],
        wiring: { rows: [["GPIO 4", "LED +", "red"]] },
        panels: { "0": { title: "PWM" } },
      },
    });
  });
});

describe("applyOverlay", () => {
  it("replaces text and never structure", () => {
    const [fr] = applyOverlay(
      source,
      { "02": { title: "Premier <b>circuit</b>", cmd: "rm -rf /", panels: { "0": { title: "MLI" } } } },
      policy,
    );
    expect(fr?.title).toBe("Premier <b>circuit</b>");
    expect(fr?.cmd).toBe("pio run -e 02-led");
    expect(fr?.panels[0]).toEqual({ widget: "led", title: "MLI" });
  });

  it("keeps the source where the translation is missing or out of shape", () => {
    const [fr] = applyOverlay(source, { "02": { steps: ["Câblez."] } }, policy);
    expect(fr?.steps).toEqual(["Wire it.", "Flash it."]);
    expect(applyOverlay(source, undefined, policy)).toEqual(source);
  });
});

describe("checkOverlay", () => {
  const en = extractOverlay(source, policy);

  it("accepts a partial, faithful translation", () => {
    expect(checkOverlay(en, { "02": { title: "Premier <b>circuit</b>" } })).toEqual([]);
  });

  it("reports unknown keys, broken shapes, markup and placeholders", () => {
    expect(
      checkOverlay(
        { a: "Hi {{name}}", ...en },
        {
          a: "Salut {{nom}}",
          "03": {},
          "02": { title: "Premier circuit", steps: ["Un."] },
        },
      ),
    ).toEqual([
      { path: "a", problem: "placeholder" },
      { path: "03", problem: "unknown" },
      { path: "02.title", problem: "markup" },
      { path: "02.steps", problem: "shape" },
    ]);
  });
});
