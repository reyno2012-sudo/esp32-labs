import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { buildStory } from "./story";
import { buildSymbolIndex } from "./symbols";

// A lab in miniature: main.cpp drives a class that lives in a shared header.
const MAIN = `#include "lab.h"

Lab lab(42);

void setup() {
  lab.begin();
}

void loop() {
  lab.loop();
  tidy();
}

void tidy() { lab.n = 0; }
`;
const LAB = `#pragma once
class Lab {
 public:
  explicit Lab(int n) : n(n) {}
  void begin() {
    wake();
    Serial.println("ready");
  }
  void loop() {
    if (n) {
      wake();
    }
    step();
  }
  int n;

 private:
  void wake() {
    n++;
    n++;
    n++;
  }
  void step() {
    n--;
    n--;
    n--;
  }
};
`;

const files = [
  { path: "src/x/main.cpp", role: "lab" as const, analysis: analyze(MAIN) },
  { path: "lib/kit/src/lab.h", role: "shared" as const, analysis: analyze(LAB) },
];

describe("symbol index", () => {
  const index = buildSymbolIndex(files);
  it("follows a method call on a typed variable into another file", () => {
    const setup = index.entry("setup");
    expect(setup && index.callees(setup).map((c) => c.target.qualified)).toEqual(["Lab::begin"]);
    const loop = index.entry("loop");
    expect(loop && index.callees(loop).map((c) => c.target.qualified)).toEqual([
      "Lab::loop",
      "tidy",
    ]);
  });
  it("resolves a plain call inside a class to the class's own method", () => {
    const begin = index.functions.find((f) => f.qualified === "Lab::begin");
    expect(begin && index.callees(begin).map((c) => c.target.qualified)).toEqual(["Lab::wake"]);
  });
});

describe("story", () => {
  it("tells setup then loop, depth first, without repeating a scene", () => {
    const story = buildStory(buildSymbolIndex(files), {
      maxDepth: 3,
      maxScenes: 20,
      leftovers: true,
    });
    expect(story.acts.map((a) => a.id)).toEqual(["start", "forever"]);
    expect(story.scenes.map((s) => `${s.depth}:${s.fn.qualified}`)).toEqual([
      "0:setup",
      "1:Lab::begin",
      "2:Lab::wake",
      "0:loop",
      "1:Lab::loop",
      "2:Lab::step",
    ]);
    const lab = story.scenes.find((s) => s.fn.qualified === "Lab::loop");
    expect(lab?.seen.map((f) => f.name)).toEqual(["wake"]);
    expect(story.scenes.find((s) => s.fn.name === "loop")?.helpers.map((f) => f.name)).toEqual([
      "tidy",
    ]);
    expect(lab?.trail.map((f) => f.name)).toEqual(["loop"]);
  });

  it("stops at the depth and scene limits", () => {
    const story = buildStory(buildSymbolIndex(files), {
      maxDepth: 1,
      maxScenes: 3,
      leftovers: false,
    });
    expect(story.scenes.map((s) => s.fn.qualified)).toEqual(["setup", "Lab::begin", "loop"]);
  });
});
