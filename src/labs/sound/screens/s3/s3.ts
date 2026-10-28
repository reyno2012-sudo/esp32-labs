// S3 Clap control on the board's screen: timeline, lamp, patterns, tune (learn).
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import type { SoundSpec, SoundState } from "../../kit/types";
import { ClapGroups, OnsetDetector, type OnsetEvent } from "../../model/onsets";
import { CHIME } from "../../model/tune";
import { drawS3 } from "./s3-draw";

export type S3Action = "tune" | "none" | "led" | "colour" | "dark" | "screen" | "view" | "party";

export const S3_ACTIONS: Readonly<Record<S3Action, string>> = {
  tune: "play twinkle on the speaker",
  none: "nothing",
  led: "toggle the LED on GPIO 4",
  colour: "next colour on the RGB LED",
  dark: "RGB LED off",
  screen: "backlight off / on",
  view: "next screen view",
  party: "2 s rainbow",
};
const isAction = (a: string): a is S3Action => a in S3_ACTIONS;

const S3_SOUND: Readonly<Partial<Record<S3Action, string>>> = {
  led: "C5/16 G5/16",
  colour: "C5/32 E5/32 G5/32 C6/16",
  screen: "C6/32",
  view: "C6/32",
  party: CHIME.score,
  dark: CHIME.stop,
  tune: "C5/4 C5/4 G5/4 G5/4 A5/4 A5/4 G5/2",
  none: CHIME.no,
};

/** The RGB LED's colours: name and palette key. */
export const S3_COLOURS: readonly (readonly [
  string,
  "amber" | "coral" | "teal" | "blue" | "violet",
])[] = [
  ["warm white", "amber"],
  ["red", "coral"],
  ["orange", "amber"],
  ["green", "teal"],
  ["cyan", "blue"],
  ["blue", "blue"],
  ["violet", "violet"],
];

export interface S3Learn {
  on: boolean;
  n: number;
  strength: number[];
  length: number[];
  suggested: number;
  longs: number;
}

export interface S3State extends SoundState {
  ears: OnsetDetector;
  groups: ClapGroups;
  /** What 1-4 claps do (index 0 unused). */
  map: S3Action[];
  hist: Uint8Array;
  head: number;
  marks: OnsetEvent[];
  last: { count: number; action: S3Action; at: number };
  led: boolean;
  /** -2 = the level meter, -1 = off, else an S3_COLOURS index. */
  colour: number;
  partyUntil: number;
  learn: S3Learn;
  testing: boolean;
  screenOff: number;
  sound: boolean;
}

const newLearn = (on = false): S3Learn => ({
  on,
  n: 0,
  strength: [],
  length: [],
  suggested: 0,
  longs: 0,
});

function run(st: S3State, a: S3Action): void {
  const tune = S3_SOUND[a];
  if (st.sound && tune)
    st.mic.spk.tune(tune, a === "tune" ? 150 : 240, a === "party" ? "square" : "triangle");
  if (a === "led") {
    st.led = !st.led;
    soundNote(st, st.term, "+", `LED ${st.led ? "on" : "off"}`);
  } else if (a === "colour") {
    st.colour = st.colour < 0 ? 0 : (st.colour + 1) % S3_COLOURS.length;
    soundNote(st, st.term, "+", `colour: ${S3_COLOURS[st.colour]?.[0] ?? ""}`);
  } else if (a === "dark") {
    st.colour = -1;
    soundNote(st, st.term, "+", "RGB off");
  } else if (a === "screen") {
    st.screenOff = st.screenOff ? 0 : performance.now();
    soundNote(
      st,
      st.term,
      "+",
      st.screenOff ? "screen asleep (back in 30 s, or press a button)" : "screen on",
    );
  } else if (a === "view") st.view = (st.view + 1) % 4;
  else if (a === "party") {
    st.partyUntil = performance.now() + 2000;
    soundNote(st, st.term, "+", "party!");
  }
}

function group(st: S3State, n: number): void {
  if (st.testing) st.term?.line(`  group of ${n}`);
  const action: S3Action = n >= 1 && n <= 4 ? (st.map[n] ?? "none") : "none";
  st.last = { count: n, action, at: performance.now() };
  if (n > 4) return soundNote(st, st.term, "!", `${n} claps: applause? nothing to do`);
  if (action === "none") {
    if (st.sound) st.mic.spk.tune(CHIME.no, 200, "square");
    return soundNote(st, st.term, "-", `${n} claps: not mapped`);
  }
  soundNote(st, st.term, "-", `${n} clap${n > 1 ? "s" : ""} -> ${action}`);
  run(st, action);
}

function onFrame(st: S3State, ms: number): void {
  const a = st.mic.level.instAbove();
  st.hist[st.head] = Math.min(255, a);
  st.head = (st.head + 1) % 1000;
  if (st.mic.level.learning()) return;
  const e = st.ears.push(a, ms);
  if (e) {
    st.marks.push(e);
    if (st.marks.length > 24) st.marks.shift();
    if (e.kind !== "onset" && st.testing)
      st.term?.line(
        `  ${e.kind === "clap" ? "clap" : "LONG (not a clap)"} at ${Math.round(e.ms)} ms: ${e.db.toFixed(1)} dB, ${Math.round(e.len)} ms long`,
      );
    if (e.kind === "long") st.learn.longs++;
    if (e.kind === "clap") {
      if (st.learn.on) {
        const L = st.learn;
        L.strength.push(e.db);
        L.length.push(Math.round(e.len));
        L.n++;
        if (L.n >= 5) {
          L.on = false;
          L.suggested = Math.max(8, Math.min(40, Math.min(...L.strength) * 0.6));
          st.ears.cfg.riseDb = L.suggested;
          soundNote(st, st.term, "+", `learnt: sens ${L.suggested.toFixed(0)} dB (saved)`);
        } else soundNote(st, st.term, "-", `clap ${L.n} of 5: ${e.db.toFixed(0)} dB`);
      } else st.groups.add(ms);
    }
  }
  const grp = st.groups.poll(ms);
  if (grp) group(st, grp.length);
}

function onCommand(line: string, st: S3State, term: TerminalPrinter): boolean {
  const [cmd = "", a = "", b = ""] = line.toLowerCase().split(/\s+/);
  if (cmd === "map") {
    const n = Number(a);
    const act = b === "color" ? "colour" : b;
    if (!(n >= 1 && n <= 4) || !isAction(act)) {
      term.line("[W] map <1-4> <led|colour|dark|screen|view|party|none>", "warn");
      return true;
    }
    st.map[n] = act;
    soundNote(st, term, "+", `${n} clap${n > 1 ? "s" : ""} -> ${act} (saved)`);
    return true;
  }
  if (cmd === "maps") {
    for (let n = 1; n <= 4; n++) {
      const act = st.map[n] ?? "none";
      term.line(`  ${n} clap${n > 1 ? "s" : " "} -> ${act.padEnd(7)} ${S3_ACTIONS[act]}`);
    }
    return true;
  }
  if (cmd === "sens") {
    const d = Number(a);
    if (!(d >= 6 && d <= 50))
      term.line(
        `[W] sens <dB>, 6-50: how far above the quiet a clap must jump (now ${st.ears.cfg.riseDb.toFixed(0)})`,
        "warn",
      );
    else {
      st.ears.cfg.riseDb = d;
      soundNote(st, term, "+", `sens ${d} dB (saved)`);
    }
    return true;
  }
  if (cmd === "gap") {
    const ms = Number(a);
    if (!(ms >= 250 && ms <= 2000))
      term.line(
        `[W] gap <ms>, 250-2000: the pause that ends a pattern (now ${st.groups.gapMs})`,
        "warn",
      );
    else {
      st.groups.gapMs = ms;
      soundNote(st, term, "+", `pause ${ms} ms ends a pattern (saved)`);
    }
    return true;
  }
  if (cmd === "learn") {
    st.learn = newLearn(true);
    st.view = 3;
    soundNote(st, term, "-", "clap 5 times, as you normally would");
    return true;
  }
  if (cmd === "test") {
    st.testing = a ? a !== "off" : !st.testing;
    soundNote(
      st,
      term,
      "-",
      st.testing ? "test on: every clap, long sound and group printed" : "test off",
    );
    return true;
  }
  if (cmd === "do") {
    const act = a === "color" ? "colour" : a;
    if (!isAction(act) || act === "none")
      term.line("[W] do <led|colour|dark|screen|view|party>", "warn");
    else run(st, act);
    return true;
  }
  if (cmd === "colour" || cmd === "color") {
    run(st, "colour");
    return true;
  }
  if (cmd === "sound") {
    st.sound = a ? a === "on" : !st.sound;
    soundNote(st, term, "+", `pattern sounds ${st.sound ? "on" : "off"} (saved)`);
    return true;
  }
  return false;
}

export const S3: SoundSpec<S3State> = {
  views: ["timeline", "lamp", "patterns", "tune"],
  dbl: ["test", "colour", "maps", "learn"],
  commands: [
    ["map <1-4> <action>", "what n claps do: led colour dark screen view party tune none"],
    ["maps", "print the pattern map"],
    ["sens <dB>", "how far above the quiet a clap must jump (default 18)"],
    ["gap <ms>", "the pause that ends a pattern (default 650)"],
    ["learn", "clap 5 times: sets sens from your softest clap"],
    ["test [off]", "print every clap, long sound and group"],
    ["do <action>", "run an action now, without clapping"],
    ["sound [on|off]", "a little sound per pattern on the speaker (saved)"],
    ["colour", "next RGB colour (the lamp view's double-click)"],
  ],
  captions: [
    (t) => t("labs-sound:s3.captions.timeline"),
    (t) => t("labs-sound:s3.captions.lamp"),
    (t) => t("labs-sound:s3.captions.patterns"),
    (t) => t("labs-sound:s3.captions.tune"),
  ],
  actions: [
    {
      label: (_, t) => t("labs-sound:s3.actions.threeClaps"),
      run(st) {
        st.mic.clap();
        st.mic.clap(0.3);
        st.mic.clap(0.6);
      },
    },
    { label: (_, t) => t("labs-sound:s3.actions.n4Party"), run: (st) => [0, 0.25, 0.5, 0.75].forEach((d) => st.mic.clap(d)) },
    { label: (_, t) => t("labs-sound:s3.actions.learn2xOnTune"), run: (st, term) => void onCommand("learn", st, term) },
  ],
  init() {
    const st: S3State = {
      view: 0,
      mic: soundMic(),
      ears: new OnsetDetector(),
      groups: new ClapGroups(),
      map: ["none", "led", "colour", "screen", "party"],
      hist: new Uint8Array(1000),
      head: 0,
      marks: [],
      last: { count: 0, action: "none", at: -1e9 },
      led: false,
      colour: -2,
      partyUntil: 0,
      learn: newLearn(),
      testing: false,
      screenOff: 0,
      sound: true,
    };
    st.mic.onFrame = (_f, ms) => onFrame(st, ms);
    return st;
  },
  tick(st) {
    if (st.screenOff && performance.now() - st.screenOff > 30000) {
      st.screenOff = 0;
      soundNote(st, st.term, "-", "screen on");
    }
  },
  onCommand,
  draw: drawS3,
};
