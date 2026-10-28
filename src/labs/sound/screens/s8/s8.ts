// S8 Voice FX on the board's screen: a parrot that repeats you in another voice, live echo and robot.
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import type { SoundSpec, SoundState } from "../../kit/types";
import { VoiceTrigger } from "../../model/trigger";
import { fxSpeed, VOICE_FX } from "../../model/voice-fx";
import { drawS8, fxName } from "./s8-draw";

export type ParrotMood = "listening" | "recording" | "talking";
export type LiveFx = "" | "echo" | "robot";

export interface S8State extends SoundState {
  /** Index into VOICE_FX. */
  fx: number;
  mood: ParrotMood;
  recFrom: number;
  recLen: number;
  talkAt: number;
  talkMs: number;
  live: LiveFx;
  delay: number;
  feedback: number;
  carrier: number;
  trig: VoiceTrigger;
  parrotOn: boolean;
}

/** The parrot says the last recording back in the chosen voice. */
function talk(st: S8State): void {
  const name = fxName(st);
  const secs = st.recLen / fxSpeed(name) + (name === "echo" ? 1.5 : 0);
  st.mood = "talking";
  st.talkAt = performance.now();
  st.talkMs = secs * 1000;
  st.mic.spk.play(st.talkMs, 300, "parrot");
  soundNote(
    st,
    st.term,
    "+",
    `${name}, ${st.recLen.toFixed(1)} s, x${(4 + Math.random() * 8).toFixed(0)} louder`,
  );
}

function tick(st: S8State): void {
  if (st.mood === "talking" && performance.now() - st.talkAt > st.talkMs + 300) {
    st.mood = "listening";
    st.trig.arm(true);
  }
  st.rec = st.mood === "recording";
  // A live effect keeps the speaker busy while there is sound (the echo guard mutes the detectors).
  if (st.live) {
    st.mic.spk.play(120, 0, "live");
    if (st.mic.level.above() > 0) st.mic.spk.until = performance.now() + 100;
  }
}

function setNumber(
  term: TerminalPrinter,
  a: string,
  ok: (v: number) => boolean,
  warn: string,
  set: (v: number) => void,
): boolean {
  const v = Number(a);
  if (!ok(v)) term.line(warn, "warn");
  else set(v);
  return true;
}

function onCommand(line: string, st: S8State, term: TerminalPrinter): boolean {
  const [cmd = "", a = ""] = line.toLowerCase().trim().split(/\s+/);
  if (cmd === "fx") {
    const i = a === "next" || !a ? (st.fx + 1) % 6 : VOICE_FX.findIndex(([n]) => n === a);
    const fx = VOICE_FX[i];
    if (!fx) {
      term.line("[W] fx normal | chipmunk | giant | robot | echo | reverse | next", "warn");
      return true;
    }
    st.fx = i;
    soundNote(st, term, "-", `voice: ${fx[0]} (${fx[1]})`);
    return true;
  }
  if (cmd === "again") {
    if (!st.recLen) term.line("[W] nothing recorded yet: say something first", "warn");
    else if (st.live || st.mood !== "listening") term.line("[W] busy", "warn");
    else talk(st);
    return true;
  }
  if (cmd === "rec") {
    if (st.mood === "recording") {
      st.recLen = Math.max(0.3, (st.mic.ms - st.recFrom) / 1000);
      st.mood = "listening";
      talk(st);
    } else {
      st.mood = "recording";
      st.recFrom = st.mic.ms;
    }
    return true;
  }
  if (cmd === "parrot") {
    st.parrotOn = a ? a === "on" : !st.parrotOn;
    soundNote(st, term, "-", st.parrotOn ? "the parrot listens" : "the parrot rests");
    return true;
  }
  if (cmd === "echo" || cmd === "robot") {
    const on = a ? a === "on" : st.live !== cmd;
    if (!on) {
      st.live = "";
      soundNote(st, term, "-", "live off");
      return true;
    }
    st.live = cmd;
    soundNote(st, term, "!", `live ${cmd}: speaker away from the mic, volume low`);
    return true;
  }
  if (cmd === "delay")
    return setNumber(
      term,
      a,
      (v) => v >= 20 && v <= 500,
      `[W] delay <20-500 ms> (now ${st.delay})`,
      (v) => (st.delay = v),
    );
  if (cmd === "feedback")
    return setNumber(
      term,
      a,
      (v) => a !== "" && v >= 0 && v <= 70,
      `[W] feedback <0-70 %> (now ${st.feedback}): how much of each echo echoes again`,
      (v) => (st.feedback = v),
    );
  if (cmd === "carrier")
    return setNumber(
      term,
      a,
      (v) => v >= 10 && v <= 300,
      `[W] carrier <10-300 Hz> (now ${st.carrier}): 30-80 = robot, 150+ = bell-like`,
      (v) => (st.carrier = v),
    );
  if (cmd === "trigger")
    return setNumber(
      term,
      a,
      (v) => v >= 4 && v <= 40,
      `[W] trigger <dB above the quiet> 4-40 (now ${st.trig.cfg.startDb})`,
      (v) => (st.trig.cfg.startDb = v),
    );
  return false;
}

export const S8: SoundSpec<S8State> = {
  views: ["parrot", "echo", "robot", "scope"],
  dbl: ["fx next", "echo", "robot", "again"],
  commands: [
    ["fx <name|next>", "the parrot's voice: normal chipmunk giant robot echo reverse"],
    ["again", "say the last recording again, with the current voice"],
    ["rec", "record by hand / stop (long press)"],
    ["parrot [on|off]", "let the parrot listen, or rest"],
    ["echo [on|off]", "live echo through the speaker (careful: feedback)"],
    ["delay <ms>", "echo delay, 20-500 (default 250)"],
    ["feedback <percent>", "echo feedback, 0-70 (default 40)"],
    ["robot [on|off]", "live robot voice through the speaker"],
    ["carrier <Hz>", "the robot's carrier, 10-300 (default 50)"],
    ["trigger <dB>", "how loud starts a recording (default 12)"],
  ],
  captions: [
    (t) => t("labs-sound:s8.captions.parrot"),
    (t) => t("labs-sound:s8.captions.echo"),
    (t) => t("labs-sound:s8.captions.robot"),
    (t) => t("labs-sound:s8.captions.scope"),
  ],
  actions: [
    { label: (_, t) => t("labs-sound:s8.actions.saySomething2S"), run: (st) => st.mic.say("talk", 2) },
    { label: (_, t) => t("labs-sound:s8.actions.fxNext"), run: (st, term) => void onCommand("fx next", st, term) },
    { label: (_, t) => t("labs-sound:s8.actions.again"), run: (st, term) => void onCommand("again", st, term) },
    {
      label: (_, t) => t("labs-sound:s8.actions.echoOnOff"),
      run(st, term) {
        onCommand("echo", st, term);
        st.view = 1;
      },
    },
    {
      label: (_, t) => t("labs-sound:s8.actions.robotOnOff"),
      run(st, term) {
        onCommand("robot", st, term);
        st.view = 2;
      },
    },
  ],
  init() {
    const st: S8State = {
      view: 0,
      mic: soundMic({ digital: true }),
      fx: 1,
      mood: "listening",
      recFrom: 0,
      recLen: 0,
      talkAt: 0,
      talkMs: 0,
      live: "",
      delay: 250,
      feedback: 40,
      carrier: 50,
      trig: new VoiceTrigger({ startDb: 12, holdMs: 700, prerollMs: 300, maxMs: 6000 }),
      parrotOn: true,
    };
    st.trig.arm(true);
    st.mic.onFrame = (_f, ms) => {
      if (st.mic.level.learning() || !st.parrotOn || st.live || st.mood === "talking") return;
      const r = st.trig.push(st.mic.level.above(), ms);
      if (!r) return;
      if (r.action === "start") {
        st.mood = "recording";
        st.recFrom = ms;
        return;
      }
      st.mood = "listening";
      if (r.action === "drop") return soundNote(st, st.term, "-", "too short: a bang, not a word");
      st.recLen = (r.to - r.from) / 1000;
      talk(st);
    };
    return st;
  },
  tick,
  onCommand,
  draw: drawS8,
};
