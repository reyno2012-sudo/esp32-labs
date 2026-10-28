// S1 Hear on the board's screen: scope, both mics, bias (or bits), comparator, numbers.
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import { setAtten } from "../../kit/shell";
import type { SoundSpec, SoundState } from "../../kit/types";
import type { Atten } from "../../model/level";
import type { Mic } from "../../model/mic";
import { drawS1 } from "./s1-draw";

export interface S1Strip {
  loud: Uint8Array;
  high: Uint8Array;
  head: number;
  slotPeak: number;
  slotT: number;
  risesSeen: number;
  rps: number;
  risesAt: number;
  risesThen: number;
}

export interface S1State extends SoundState {
  spanMs: number;
  trigger: boolean;
  frozen: boolean;
  shown: Float32Array;
  scale: number;
  strip: S1Strip;
  /** The other microphone, hearing the same room (the mics view). S1 opens it at start-up. */
  mic2: Mic;
  thresh: number;
  softHigh: boolean;
}

const NEXT_ATTEN: Readonly<Record<Atten, string>> = { 12: "6", 6: "2.5", 2.5: "0", 0: "12" };

const POT_HELP = [
  "Tuning the comparator (the blue trim pot, a small screwdriver):",
  "  1. Stay quiet. If the module's second LED (and DO) is on, turn the screw until it just goes off.",
  "  2. Clap. DO should flash with each clap: the comparator view shows DO under the loudness.",
  "  3. Lit all the time: turn it back a little. Never lights: turn it further toward the edge.",
  "  Which way is 'more sensitive' differs between module makers: watch the lamp, not the direction.",
];

function onCommand(line: string, st: S1State, term: TerminalPrinter): boolean {
  const [cmd = "", a = ""] = line.toLowerCase().split(/\s+/);
  if (cmd === "thresh") {
    const d = Number(a);
    if (!(d >= 3 && d <= 50))
      term.line(
        `[W] thresh <dB>, 3-50: the software comparator's line above the quiet (now ${st.thresh})`,
        "warn",
      );
    else {
      st.thresh = d;
      soundNote(st, term, "-", `software comparator at ${d} dB`);
    }
    return true;
  }
  if (cmd === "freeze") {
    st.frozen = a ? a !== "off" : !st.frozen;
    soundNote(st, term, "-", st.frozen ? "scope frozen (freeze again to go on)" : "scope running");
    return true;
  }
  if (cmd === "span") {
    const ms = Number(a);
    if (!(ms >= 2 && ms <= 120))
      term.line(`[W] span <ms>, 2-120 (now ${st.spanMs}). 20 ms = one cycle of 50 Hz`, "warn");
    else {
      st.spanMs = ms;
      st.frozen = false;
    }
    return true;
  }
  if (cmd === "trigger") {
    st.trigger = a ? a === "on" : !st.trigger;
    soundNote(
      st,
      term,
      "-",
      st.trigger ? "trigger on: a steady tone stands still" : "free-running",
    );
    return true;
  }
  if (cmd === "pot") {
    POT_HELP.forEach((l) => term.line(l));
    st.view = 3;
    return true;
  }
  if (cmd === "dump") {
    const n = a ? Number(a) : 320;
    if (!(n >= 16 && n <= 4096)) {
      term.line("[W] dump [n], 16-4096 samples (default 320 = 20 ms)", "warn");
      return true;
    }
    const s = st.mic.latest(n);
    term.line(
      `# ${n} samples at 16000 Hz, int16 after removing the bias (one ADC step = 16). Paste into a spreadsheet.`,
    );
    for (let i = 0; i < Math.min(n, 64); i += 16)
      term.line(Array.from(s.slice(i, i + 16), (v) => Math.round(v)).join(","));
    if (n > 64) term.line(`(the preview shows the first 64 of ${n})`);
    return true;
  }
  return false;
}

function tick(st: S1State, dt: number): void {
  const m2 = st.mic2;
  m2.digital = !st.mic.digital;
  m2.mode = st.mic.mode;
  m2.until = st.mic.until;
  m2.t = st.mic.t;
  m2.claps = st.mic.claps;
  m2.step(dt);
  // The INMP441 has no DO: a software comparator with 3 dB of hysteresis stands in for it.
  if (st.mic.digital) {
    const a = st.mic.level.instAbove();
    if (!st.softHigh && a >= st.thresh) {
      st.softHigh = true;
      st.mic.doRises++;
    } else if (st.softHigh && a < st.thresh - 3) st.softHigh = false;
    st.doLamp = st.softHigh;
  }
  const s = st.strip;
  const m = st.mic;
  if ((s.slotT += dt) >= 0.04) {
    s.slotT = 0;
    s.loud[s.head] = Math.min(255, s.slotPeak);
    s.high[s.head] = st.doLamp || m.doRises !== s.risesSeen ? 1 : 0;
    s.head = (s.head + 1) % 150;
    s.risesSeen = m.doRises;
    s.slotPeak = 0;
  }
  const now = performance.now();
  if (now - s.risesAt >= 1000) {
    s.rps = m.doRises - s.risesThen;
    s.risesThen = m.doRises;
    s.risesAt = now;
  }
}

export const S1: SoundSpec<S1State> = {
  views: ["scope", "mics", "bias", "comparator", "numbers"],
  dbl: ["freeze", "status", "atten next", "pot", "status"],
  commands: [
    ["freeze [off]", "hold the scope picture (double-click on scope)"],
    ["span <ms>", "time across the scope, 2-120 ms (default 20)"],
    ["trigger [on|off]", "line the wave up on a rising zero crossing"],
    ["pot", "how to tune the comparator (trim pot, or thresh)"],
    ["thresh <dB>", "the INMP441's software comparator line (default 15)"],
    ["dump [n]", "print the newest n samples as numbers"],
  ],
  captions: [
    (t) => t("labs-sound:s1.captions.scope"),
    (t) => t("labs-sound:s1.captions.mics"),
    (t) => t("labs-sound:s1.captions.bias"),
    (t) => t("labs-sound:s1.captions.comparator"),
    (t) => t("labs-sound:s1.captions.numbers"),
  ],
  actions: [
    {
      label: (_, t) => t("labs-sound:s1.actions.attenNext"),
      run(st, term) {
        if (st.mic.digital) {
          soundNote(st, term, "-", "INMP441: fixed 24-bit range, nothing to switch");
          return;
        }
        const n = NEXT_ATTEN[st.mic.atten];
        term.line(`> atten ${n}   (double-click)`);
        setAtten(st, term, n);
      },
    },
    { label: (_, t) => t("labs-sound:s1.actions.freeze"), run: (st, term) => void onCommand("freeze", st, term) },
    {
      label: (_, t) => t("labs-sound:s1.actions.potMoreSensitive"),
      run(st, term) {
        st.mic.potMv = Math.max(1, st.mic.potMv - 10);
        soundNote(st, term, "-", `(the pot: ${st.mic.potMv} mV above the bias)`);
      },
    },
    {
      label: (_, t) => t("labs-sound:s1.actions.potLessSensitive"),
      run(st, term) {
        st.mic.potMv = Math.min(150, st.mic.potMv + 10);
        soundNote(st, term, "-", `(the pot: ${st.mic.potMv} mV above the bias)`);
      },
    },
  ],
  init() {
    const st: S1State = {
      view: 0,
      mic: soundMic(),
      spanMs: 20,
      trigger: true,
      frozen: false,
      shown: new Float32Array(0),
      scale: 256,
      strip: {
        loud: new Uint8Array(150),
        high: new Uint8Array(150),
        head: 0,
        slotPeak: 0,
        slotT: 0,
        risesSeen: 0,
        rps: 0,
        risesAt: 0,
        risesThen: 0,
      },
      mic2: soundMic({ digital: true }),
      thresh: 15,
      softHigh: false,
    };
    st.mic.onFrame = () => {
      st.strip.slotPeak = Math.max(st.strip.slotPeak, st.mic.level.instAbove());
    };
    return st;
  },
  tick,
  onCommand,
  draw: drawS1,
};
