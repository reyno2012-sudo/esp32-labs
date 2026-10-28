// S6 Sound games on the board's screen: a knock lock, Clap Bird (playable: a click on the screen
// or Space is a clap) and a beat-following party.
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import type { SoundSpec, SoundState } from "../../kit/types";
import { BirdGame } from "../../model/bird";
import { OnsetDetector } from "../../model/onsets";
import { BeatDetector, matchRhythm, type RhythmMatch, shares } from "../../model/rhythm";
import { CHIME } from "../../model/tune";
import { drawS6 } from "./s6-draw";

export interface BeatRing {
  at: number;
  x: number;
  y: number;
  hue: number;
}

export interface S6State extends SoundState {
  ears: OnsetDetector;
  secret: number[];
  open: number[];
  lastKnock: number;
  attempt: number[];
  match: RhythmMatch | null;
  setting: boolean;
  tol: number;
  openUntil: number;
  openedAt: number;
  attemptAt: number;
  game: BirdGame;
  best: number;
  lastScore: number;
  sound: boolean;
  click: boolean;
  beats: BeatDetector;
  rings: BeatRing[];
  beatLog: number[];
  hue: number;
  lastBeat: number;
}

/** 1.5 s of quiet after the last knock: the pattern is a new secret, or an attempt. */
function finish(st: S6State): void {
  const r = st.open;
  st.open = [];
  if (st.setting) {
    st.setting = false;
    if (r.length < 2) return soundNote(st, st.term, "!", "a secret needs 2 knocks or more");
    st.secret = r;
    st.attempt = [];
    st.match = null;
    const first = r[0] ?? 0;
    const last = r.at(-1) ?? 0;
    return soundNote(
      st,
      st.term,
      "+",
      `secret saved: ${r.length} knocks, ${((last - first) / 1000).toFixed(1)} s`,
    );
  }
  st.attempt = r;
  st.match = matchRhythm(st.secret, r, st.tol);
  st.attemptAt = performance.now();
  if (st.match.ok) {
    st.openUntil = performance.now() + 5000;
    st.openedAt = performance.now();
    soundNote(st, st.term, "+", `OPEN (score ${st.match.score})`);
    if (st.sound) st.mic.spk.tune("C5/16 E5/16 G5/16 C6/8", 240);
  } else {
    soundNote(st, st.term, "x", `locked: ${st.match.why}`);
    if (st.sound) st.mic.spk.tune(CHIME.no, 200, "square");
  }
}

function flap(st: S6State): void {
  const G = st.game;
  if (G.state === "over") {
    if (performance.now() - G.overAt > 800) {
      G.reset();
      G.flapNow();
    }
    return;
  }
  G.flapNow();
  if (st.sound) {
    st.mic.spk.play(40, 900, "blip");
    st.mic.spk.out.tone(900, 40, "square");
  }
}

function tick(st: S6State, dt: number, view: number): void {
  st.view = view;
  const G = st.game;
  const was = G.state;
  if (view === 1)
    for (let k = 0, left = dt; k < 6 && left > 0; k++) {
      G.step(Math.min(1 / 60, left));
      left -= 1 / 60;
    }
  if (was === "playing" && G.state === "over") {
    G.overAt = performance.now();
    if (G.score > st.best) {
      st.best = G.score;
      soundNote(st, st.term, "+", `new best: ${st.best}`);
      if (st.sound) st.mic.spk.tune(CHIME.score, 240, "square");
    } else {
      soundNote(st, st.term, "-", `score ${G.score}`);
      if (st.sound) st.mic.spk.beep(120, 300, "noise");
    }
  }
  if (G.state === "playing" && G.score !== st.lastScore) {
    st.lastScore = G.score;
    if (G.score && st.sound) st.mic.spk.beep(1320, 60, "square");
  }
}

function knock(st: S6State, term: TerminalPrinter, a: string): boolean {
  if (a === "set") {
    st.setting = true;
    st.open = [];
    st.view = 0;
    soundNote(st, term, "-", "knock your new secret, then wait 1.5 s");
    return true;
  }
  if (a === "clear") {
    st.secret = [];
    st.attempt = [];
    st.match = null;
    soundNote(st, term, "-", "secret erased");
    return true;
  }
  const first = st.secret[0] ?? 0;
  const last = st.secret.at(-1) ?? 0;
  if (a === "play") {
    if (!st.sound) term.line("[W] sound is off: sound on", "warn");
    else if (st.secret.length < 2) term.line("  no secret yet: knock set");
    else {
      st.mic.spk.play(last - first + 60, 2000, "knocks");
      st.secret.forEach((k) => st.mic.spk.out.tone(1800, 12, "square", (k - first) / 1000));
      soundNote(st, term, "-", `playing the secret: ${st.secret.length} knocks`);
    }
    return true;
  }
  if (a && a !== "show") {
    term.line("[W] knock set | knock clear | knock show | knock play", "warn");
    return true;
  }
  if (st.secret.length < 2) term.line("  no secret yet: knock set");
  else {
    const gaps = shares(st.secret).map(
      (s, i) =>
        `${Math.round((st.secret[i + 1] ?? 0) - (st.secret[i] ?? 0))} (${Math.round(s * 100)}%)`,
    );
    term.line(
      `  secret: ${st.secret.length} knocks over ${Math.round(last - first)} ms, gaps: ${gaps.join(" ")}`,
    );
  }
  if (st.match)
    term.line(
      `  match: ${st.match.ok ? "OPEN" : st.match.why}, score ${st.match.score}, worst gap off by ${Math.round(st.match.worst * 100)}% (tolerance ${Math.round(st.tol * 100)}%)`,
    );
  return true;
}

function party(st: S6State, term: TerminalPrinter, a: string, b: string): boolean {
  if (a === "sens") {
    const r = Number(b);
    if (!(r >= 1.2 && r <= 3))
      term.line(
        `[W] party sens <ratio>, 1.2-3.0: how far a beat must jump over the last second (now ${st.beats.ratio.toFixed(1)})`,
        "warn",
      );
    else {
      st.beats.ratio = r;
      soundNote(st, term, "-", `beat = ${r.toFixed(1)}x the last second`);
    }
    return true;
  }
  if (a === "click") {
    st.click = b === "on";
    soundNote(
      st,
      term,
      "-",
      st.click
        ? "a tick on every beat (the board can't hear for ~200 ms after it)"
        : "no beat tick",
    );
    return true;
  }
  if (a === "reset") {
    const r = st.beats.ratio;
    st.beats = new BeatDetector();
    st.beats.ratio = r;
    soundNote(st, term, "-", "tempo forgotten: listening again");
    return true;
  }
  term.line(`  ${st.beats.beats} beats, ${st.beats.bpm()} BPM, sens x${st.beats.ratio.toFixed(1)}`);
  return true;
}

function onCommand(line: string, st: S6State, term: TerminalPrinter): boolean {
  const [cmd = "", a = "", b = ""] = line.toLowerCase().split(/\s+/);
  if (cmd === "knock") return knock(st, term, a);
  if (cmd === "tol") {
    const p = Number(a);
    if (!(p >= 3 && p <= 30))
      term.line(
        `[W] tol <percent>, 3-30: how far each gap may be off, as a share of the pattern (now ${Math.round(st.tol * 100)})`,
        "warn",
      );
    else {
      st.tol = p / 100;
      soundNote(st, term, "-", `tolerance ${p}%`);
    }
    return true;
  }
  if (cmd === "bird") {
    if (a === "reset") {
      st.best = 0;
      soundNote(st, term, "-", "best score reset");
    } else {
      st.game.reset();
      soundNote(st, term, "-", "new round: clap to fly");
    }
    st.view = 1;
    return true;
  }
  if (cmd === "sound") {
    if (a && a !== "on" && a !== "off") {
      term.line("[W] sound | sound on | sound off", "warn");
      return true;
    }
    st.sound = a ? a === "on" : !st.sound;
    soundNote(st, term, "-", st.sound ? "game sounds on" : "game sounds off");
    return true;
  }
  if (cmd === "party") return party(st, term, a, b);
  return false;
}

export const S6: SoundSpec<S6State> = {
  views: ["knock", "bird", "party"],
  dbl: ["knock set", "bird", "party reset"],
  commands: [
    [
      "knock [set|clear|show|play]",
      "set = knock a new secret; show = secret and last try; play = hear it",
    ],
    ["tol <percent>", "knock lock: how far each gap may be off (default 12)"],
    ["bird [reset]", "Clap Bird: a new round (reset = forget the best score)"],
    [
      "party [sens <x>|click on|off|reset]",
      "beat party: sensitivity 1.2-3.0 (default 1.6), a tick per beat, forget the tempo",
    ],
    ["sound [on|off]", "the game sounds on the speaker (saved)"],
  ],
  boot: ["  Clap Bird best: 0"],
  captions: [
    (t) => t("labs-sound:s6.captions.knock"),
    (t) => t("labs-sound:s6.captions.bird"),
    (t) => t("labs-sound:s6.captions.party"),
  ],
  actions: [
    { label: (_, t) => t("labs-sound:s6.actions.music6S"), run: (st) => st.mic.say("music", 6) },
    { label: (_, t) => t("labs-sound:s6.actions.knockSet"), run: (st, term) => void onCommand("knock set", st, term) },
    {
      label: (_, t) => t("labs-sound:s6.actions.knockTheSecret"),
      run: (st) => [0, 0.2, 0.4, 1.0, 1.2].forEach((d) => st.mic.clap(d)),
    },
    { label: (_, t) => t("labs-sound:s6.actions.knockPlay"), run: (st, term) => void onCommand("knock play", st, term) },
  ],
  init() {
    const st: S6State = {
      view: 0,
      mic: soundMic(),
      ears: new OnsetDetector({ maxClapMs: 200 }),
      secret: [],
      open: [],
      lastKnock: 0,
      attempt: [],
      match: null,
      setting: false,
      tol: 0.12,
      openUntil: 0,
      openedAt: 0,
      attemptAt: 0,
      game: new BirdGame(),
      best: 0,
      lastScore: 0,
      sound: true,
      click: false,
      beats: new BeatDetector(),
      rings: [],
      beatLog: [],
      hue: 0,
      lastBeat: 0,
    };
    st.mic.onFrame = (f, ms) => {
      if (st.mic.level.learning()) return;
      const e = st.ears.push(st.mic.level.instAbove(), ms);
      if (st.view === 0) {
        if (e && e.kind === "clap") {
          if (st.open.length < 12) st.open.push(e.ms);
          else soundNote(st, st.term, "!", "12 knocks is the most");
          st.lastKnock = ms;
        }
        if (st.open.length && ms - st.lastKnock >= 1500) finish(st);
      } else if (st.view === 1) {
        if (e && e.kind === "onset") flap(st);
      } else if (st.beats.push(f.rms, st.mic.level.above(), ms)) {
        st.hue = (st.hue + 47) % 360;
        st.lastBeat = performance.now();
        st.rings.push({
          at: st.lastBeat,
          x: 140 + Math.random() * 160,
          y: 50 + Math.random() * 80,
          hue: st.hue,
        });
        if (st.rings.length > 8) st.rings.shift();
        st.beatLog.push(st.lastBeat);
        if (st.beatLog.length > 40) st.beatLog.shift();
        if (st.click) st.mic.spk.play(20, 3000, "tick");
      }
    };
    return st;
  },
  tick,
  onCommand,
  draw: drawS6,
};
