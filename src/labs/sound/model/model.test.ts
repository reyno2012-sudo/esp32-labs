import { describe, expect, it } from "vitest";
import { Fft } from "./fft";
import { LevelMeter, sndDb } from "./level";
import { Mic } from "./mic";
import { OnsetDetector } from "./onsets";
import { matchRhythm } from "./rhythm";
import { VoiceTrigger } from "./trigger";
import { midiHz, noteOf, parseTune } from "./tune";

describe("sound-kit maths", () => {
  it("parses tunes the way the board writes them", () => {
    expect(midiHz("A4")).toBeCloseTo(440);
    expect(midiHz("C#5")).toBeCloseTo(554.37, 1);
    expect(midiHz("x")).toBe(0);
    const [c, rest, dotted] = parseTune("C5/16 r/4 E5/4.", 120);
    expect(c).toMatchObject({ name: "C5", ms: 125 });
    expect(rest?.hz).toBe(0);
    expect(dotted?.ms).toBe(750);
    expect(noteOf(446)).toMatchObject({ name: "A4", midi: 69 });
    expect(noteOf(446).cents).toBeCloseTo(23.4, 0);
  });

  it("measures dBFS and learns the quiet", () => {
    expect(sndDb(32768)).toBeCloseTo(0);
    expect(sndDb(16384)).toBeCloseTo(-6.02, 1);
    const L = new LevelMeter();
    for (let f = 0; f < 200; f++) L.push(20, f * 4);
    expect(L.learning()).toBe(false);
    expect(L.above()).toBeLessThan(1);
    for (let f = 200; f < 300; f++) L.push(2000, f * 4);
    expect(L.above()).toBeGreaterThan(30);
  });

  it("tells a clap from a word", () => {
    const det = new OnsetDetector();
    const events = [];
    // A 60 ms bang, quiet, then a 300 ms word.
    for (let f = 0; f < 200; f++) {
      const ms = f * 4;
      const above = (ms >= 100 && ms < 160) || (ms >= 400 && ms < 700) ? 30 : 0;
      const e = det.push(above, ms);
      if (e && e.kind !== "onset") events.push(e);
    }
    expect(events.map((e) => [e.kind, e.len])).toEqual([
      ["clap", 60],
      ["long", 300],
    ]);
  });

  it("keeps a sentence with its pre-roll and drops a bang", () => {
    const tr = new VoiceTrigger();
    tr.arm(true);
    const results = [];
    for (let ms = 0; ms < 9000; ms += 20) {
      const above = (ms >= 1500 && ms < 1560) || (ms >= 3200 && ms < 6000) ? 30 : 0;
      const r = tr.push(above, ms);
      if (r && r.action !== "start") results.push(r);
    }
    expect(results.map((r) => r.action)).toEqual(["drop", "save"]);
    expect(results[1]).toMatchObject({ from: 2700, to: 6480 });
  });

  it("finds a whistle's pitch between bins", () => {
    const fft = new Fft(512);
    const s = Float32Array.from(
      { length: 512 },
      (_, i) => 9000 * Math.sin((2 * Math.PI * 1763 * i) / 16000),
    );
    fft.run(s);
    const p = fft.peak(16000, 80, 4000);
    expect(p.hz).toBeGreaterThan(1755);
    expect(p.hz).toBeLessThan(1771);
    expect(p.clarity).toBeGreaterThan(12);
  });

  it("matches a knock rhythm at any speed", () => {
    const secret = [0, 200, 400, 1000, 1200];
    expect(
      matchRhythm(
        secret,
        secret.map((v) => v * 1.5),
      ).ok,
    ).toBe(true);
    expect(matchRhythm(secret, [0, 600, 800, 1000, 1200])).toMatchObject({
      ok: false,
      why: "the rhythm is off",
    });
    expect(matchRhythm(secret, [0, 100]).why).toBe("too few knocks");
  });

  it("samples a clap far above a whisper on the pretend KY-037", () => {
    const mic = new Mic();
    for (let i = 0; i < 8; i++) mic.step(0.1); // learn the quiet (each call samples at most 0.25 s)
    mic.clap();
    mic.step(0.05);
    expect(mic.level.peak - mic.level.floor).toBeGreaterThan(30);
    expect(mic.doRises).toBeGreaterThan(0);
  });
});
