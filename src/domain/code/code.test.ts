import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n/i18n";
import { analyze } from "./analyze";
import { definitionsOf, explainLine } from "./explain";
import { createGlossary } from "./glossary";
import { lineText, tokenize } from "./tokenize";
import { autoStops, uncovered, writtenStops } from "./tour";

const SOURCE = `// Blink: a first program.
#include <Arduino.h>

namespace {
constexpr uint8_t kLed = 4;  // the pin

// Turns the LED on or off.
void show(bool on) {
  digitalWrite(kLed, on ? HIGH : LOW);
}
}  // namespace

void setup() { pinMode(kLed, OUTPUT); }

void loop() {
  show(true);
  delay(500);
}
`;

describe("tokenize", () => {
  it("keeps every character and splits multi-line tokens per line", () => {
    const src = 'const char *p = R"(a\nb)"; /* x\ny */ int n = 0x1F;';
    const lines = tokenize(src);
    expect(lines.map(lineText).join("\n")).toBe(src);
    expect(lines[1]?.[0]).toEqual({ kind: "string", text: 'b)"' });
    expect(lines[2]?.find((t) => t.kind === "number")?.text).toBe("0x1F");
  });

  it("reads a call with template arguments as a call", () => {
    expect(tokenize("std::min<uint32_t>(a, b)")[0]?.find((t) => t.text === "min")?.kind).toBe(
      "function",
    );
  });
});

describe("analyze", () => {
  const file = analyze(SOURCE);
  it("finds functions with their calls and the braces that close them", () => {
    const show = file.blocks.find((b) => b.name === "show");
    expect(show).toMatchObject({ kind: "function", start: 7, end: 9, calls: ["digitalWrite"] });
    expect(file.blocks.find((b) => b.name === "loop")?.calls).toEqual(["show", "delay"]);
  });

  it("does not take a default argument for an initialiser", () => {
    const f = analyze("void send(int code = 200) {\n  go(code);\n}\n");
    expect(f.blocks[0]).toMatchObject({ kind: "function", name: "send", end: 2 });
  });
});

describe("explainLine", () => {
  const file = analyze(SOURCE);
  const ctx = {
    file,
    defined: definitionsOf([{ path: "main.cpp", analysis: file }]),
    t: i18n.getFixedT("en", "code"),
  };
  const say = (line: number) => explainLine(ctx, line).text.replace(/<\/?code>/g, "`");

  it("says what lines do in plain words", () => {
    expect(say(4)).toContain("一个固定值，`kLed` = `4`");
    expect(say(7)).toContain("接收 `bool on`");
    expect(say(14)).toContain("一遍又一遍、永远");
    expect(say(17)).toContain("再运行一遍");
  });

  it("points a call at the function it runs", () => {
    expect(explainLine(ctx, 15).jump).toMatchObject({ name: "show", line: 7 });
  });
});

describe("tours", () => {
  const file = analyze(SOURCE);
  const ctx = {
    file,
    defined: definitionsOf([{ path: "main.cpp", analysis: file }]),
    t: i18n.getFixedT("en", "code"),
  };

  it("builds an automatic tour that leaves no line out", () => {
    const stops = autoStops("main.cpp", ctx, { lab: true });
    expect(stops.map((s) => s.title)).toContain("loop()：周而复始");
    expect(stops.find((s) => s.title === "show()")?.note).toBe("Turns the LED on or off.");
    expect(uncovered(file, stops)).toEqual([]);
  });

  it("resolves hand-written stops by text and reports missing anchors", () => {
    const { stops, problems } = writtenStops(
      {
        path: "main.cpp",
        stops: [
          { at: "void show", title: "Show", say: "s" },
          { at: "not in the file", title: "x", say: "x" },
        ],
      },
      file,
    );
    expect(stops[0]).toMatchObject({ start: 7, end: 10 }); // the block plus the "}  // namespace" after it
    expect(problems).toHaveLength(1);
  });
});

describe("glossary", () => {
  it("matches qualified calls before bare ones, and words", () => {
    const g = createGlossary([
      {
        id: "print",
        term: "print",
        topic: "arduino",
        kind: "api",
        match: { calls: ["Serial.printf"] },
        short: "p",
      },
      {
        id: "constexpr",
        term: "constexpr",
        topic: "modern",
        kind: "language",
        match: { words: ["constexpr"] },
        short: "c",
      },
    ]);
    expect(g.find(tokenize('constexpr int a = 1; Serial.printf("x");')[0] ?? [])).toEqual([
      "constexpr",
      "print",
    ]);
    expect(g.find(tokenize("printf(x);")[0] ?? [])).toEqual([]);
  });
});
