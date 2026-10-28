// S2 Loudness on the board's screen: meter, minute, diary, alarm.
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import type { SoundSpec, SoundState } from "../../kit/types";
import { drawS2 } from "./s2-draw";

export interface DiaryRow {
  lo: number;
  avg: number;
  hi: number;
  over: boolean;
}

export interface S2Alarm {
  active: boolean;
  overSince: number;
  count: number;
  lastMs: number;
  worst: number;
}

export interface S2State extends SoundState {
  slow: boolean;
  limit: number;
  splLimit: number;
  holdMs: number;
  alarmOn: boolean;
  alarmSound: boolean;
  units: "spl" | "quiet";
  minute: Uint8Array;
  mHead: number;
  mFilled: number;
  mMax: number;
  mStart: number;
  diary: DiaryRow[];
  dLo: number;
  dHi: number;
  dSum: number;
  dN: number;
  dStart: number;
  dOver: boolean;
  alarm: S2Alarm;
}

const ALARM_TUNE = "A5/16 E5/16 A5/16 E5/16 A5/16 E5/16 A5/16 E5/16";

/** The level S2 shows: dB above the quiet, fast or slow. */
export const s2Value = (st: S2State) => (st.slow ? st.mic.level.slowAbove() : st.mic.level.above());

/** The alarm line in dB above the quiet (a dB SPL limit converted with the INMP441). */
export const s2LimitNow = (st: S2State) =>
  st.units === "spl" && st.mic.digital
    ? Math.max(3, st.splLimit - 111 - st.mic.level.floor)
    : st.limit;

function onFrame(st: S2State, ms: number): void {
  if (st.mic.level.learning()) return;
  const x = s2Value(st);
  if (!st.mStart) st.mStart = ms;
  st.mMax = Math.max(st.mMax, x);
  if (ms - st.mStart >= 250) {
    st.minute[st.mHead] = Math.min(60, st.mMax);
    st.mHead = (st.mHead + 1) % 240;
    st.mMax = 0;
    st.mStart = ms;
  }
  const a = st.alarm;
  const limit = s2LimitNow(st);
  if (x >= limit) {
    if (!a.overSince) a.overSince = ms;
    if (st.alarmOn && !a.active && ms - a.overSince >= st.holdMs) {
      a.active = true;
      a.count++;
      a.lastMs = ms;
      st.dOver = true;
      soundNote(
        st,
        st.term,
        "x",
        st.units === "spl" && st.mic.digital
          ? `too loud: ${st.mic.spl().toFixed(0)} dB SPL`
          : `too loud: ${x.toFixed(0)} dB`,
      );
      if (st.alarmSound) st.mic.spk.tune(ALARM_TUNE, 200, "square");
    }
    if (a.active) a.worst = Math.max(a.worst, x);
  } else if (x < limit - 3) {
    a.overSince = 0;
    if (a.active) {
      a.active = false;
      soundNote(st, st.term, "+", "calm again");
    }
  }
  if (!st.dStart) st.dStart = ms;
  st.dLo = Math.min(st.dLo, x);
  st.dHi = Math.max(st.dHi, x);
  st.dSum += x;
  st.dN++;
  if (ms - st.dStart >= 10000) {
    st.diary.push({
      lo: Math.round(Math.min(60, st.dLo)),
      hi: Math.round(Math.min(60, st.dHi)),
      avg: Math.round(Math.min(60, st.dSum / st.dN)),
      over: st.dOver,
    });
    if (st.diary.length > 60) st.diary.shift();
    st.dLo = 1e9;
    st.dHi = 0;
    st.dSum = 0;
    st.dN = 0;
    st.dOver = false;
    st.dStart = ms;
  }
}

function onCommand(line: string, st: S2State, term: TerminalPrinter): boolean {
  const words = line.toLowerCase().split(/\s+/);
  const [cmd = "", a = ""] = words;
  if (cmd === "speed") {
    if (a && a !== "fast" && a !== "slow") {
      term.line("[W] speed | speed fast | speed slow", "warn");
      return true;
    }
    st.slow = a ? a === "slow" : !st.slow;
    soundNote(st, term, "-", st.slow ? "slow: 1 s smoothing" : "fast: 125 ms smoothing");
    return true;
  }
  if (cmd === "units") {
    if (a && a !== "spl" && a !== "quiet") {
      term.line("[W] units | units spl | units quiet", "warn");
      return true;
    }
    const want = a ? a === "spl" : st.units !== "spl";
    if (want && !st.mic.digital) {
      term.line(
        "[W] dB SPL needs the INMP441 (its sensitivity is known); the KY-037 shows dB above the quiet",
        "warn",
      );
      return true;
    }
    st.units = want ? "spl" : "quiet";
    soundNote(st, term, "-", want ? "units: dB SPL" : "units: dB above the quiet");
    return true;
  }
  if (cmd === "limit") {
    const [, d0 = "", unit = ""] = words;
    const d = Number(d0);
    const spl = unit ? unit === "spl" : st.units === "spl" && st.mic.digital;
    if (unit && unit !== "spl" && unit !== "quiet") {
      term.line("[W] limit <dB> [spl|quiet]", "warn");
      return true;
    }
    if (spl && !st.mic.digital) {
      term.line("[W] a dB SPL limit needs the INMP441; try limit 35 (dB above the quiet)", "warn");
      return true;
    }
    if (spl ? !(d >= 30 && d <= 120) : !(d >= 3 && d <= 60)) {
      term.line(
        `[W] limit <dB> [spl|quiet]: 30-120 dB SPL or 3-60 dB above the quiet (now ${spl ? `${st.splLimit} dB SPL` : `${st.limit} dB above the quiet`})`,
        "warn",
      );
      return true;
    }
    if (spl) st.splLimit = d;
    else st.limit = d;
    soundNote(st, term, "-", `limit ${d} ${spl ? "dB SPL" : "dB above the quiet"}`);
    return true;
  }
  if (cmd === "hold") {
    const ms = Number(a);
    if (!(a && ms >= 0 && ms <= 10000))
      term.line(
        `[W] hold <ms>, 0-10000: how long over the limit before the alarm (now ${st.holdMs})`,
        "warn",
      );
    else st.holdMs = ms;
    return true;
  }
  if (cmd === "alarm" && a === "sound") {
    const b = words[2];
    st.alarmSound = b ? b === "on" : !st.alarmSound;
    soundNote(st, term, "-", st.alarmSound ? "alarm sound on" : "alarm sound off");
    return true;
  }
  if (cmd === "alarm") {
    if (a && a !== "on" && a !== "off") {
      term.line("[W] alarm [on|off] | alarm sound [on|off]", "warn");
      return true;
    }
    st.alarmOn = a ? a === "on" : !st.alarmOn;
    soundNote(st, term, "-", st.alarmOn ? "alarm armed" : "alarm off");
    return true;
  }
  if (cmd === "diary") {
    term.line(
      `Noise diary, newest last. Each row = 10 s, dB above the quiet. Limit ${st.limit} dB.`,
    );
    term.line("  ago    low  avg  high");
    st.diary
      .slice(-12)
      .forEach((d, i, arr) =>
        term.line(
          `  ${String((arr.length - i) * 10).padStart(3)}s   ${String(d.lo).padStart(3)}  ${String(d.avg).padStart(3)}  ${String(d.hi).padStart(3)}  |${"=".repeat(Math.min(30, Math.floor(d.avg / 2))).padEnd(30)}|${d.over ? " ALARM" : ""}`,
        ),
      );
    term.line("  (the preview prints the newest 12 rows; the board prints all 60)");
    return true;
  }
  return false;
}

export const S2: SoundSpec<S2State> = {
  views: ["meter", "minute", "diary", "alarm"],
  dbl: ["speed", "quiet", "diary", "alarm"],
  commands: [
    ["speed [fast|slow]", "smoothing: 125 ms or 1 s, like a real meter"],
    ["units [spl|quiet]", "dB SPL (INMP441) or dB above the quiet"],
    [
      "limit <dB> [spl|quiet]",
      "the alarm line: 30-120 dB SPL (default 80) or 3-60 above the quiet (35)",
    ],
    ["hold <ms>", "how long over the line before the alarm (default 1000)"],
    ["alarm [on|off]", "the too-loud alarm (LED on GPIO 4 + screen)"],
    ["alarm sound [on|off]", "play the alarm tune once per alarm (button stops it)"],
    ["diary", "print the last 10 minutes, 10 s per row"],
  ],
  captions: [
    (t) => t("labs-sound:s2.captions.meter"),
    (t) => t("labs-sound:s2.captions.minute"),
    (t) => t("labs-sound:s2.captions.diary"),
    (t) => t("labs-sound:s2.captions.alarm"),
  ],
  actions: [
    { label: (_, t) => t("labs-sound:s2.actions.loudMusic3S"), run: (st) => st.mic.say("music", 3) },
    { label: (_, t) => t("labs-sound:s2.actions.speedFastSlow"), run: (st, term) => void onCommand("speed", st, term) },
    {
      label: (_, t) => t("labs-sound:s2.actions.buttonSilences"),
      run(st, term) {
        if (st.alarm.active) {
          st.alarm.active = false;
          st.alarm.overSince = 0;
          soundNote(st, term, "-", "alarm silenced");
        } else st.view = (st.view + 1) % 4;
      },
    },
  ],
  init() {
    const st: S2State = {
      view: 0,
      mic: soundMic({ digital: true }),
      slow: false,
      limit: 35,
      splLimit: 80,
      holdMs: 1000,
      alarmOn: true,
      alarmSound: true,
      units: "spl",
      minute: new Uint8Array(240),
      mHead: 0,
      mFilled: 0,
      mMax: 0,
      mStart: 0,
      diary: [],
      dLo: 1e9,
      dHi: 0,
      dSum: 0,
      dN: 0,
      dStart: 0,
      dOver: false,
      alarm: { active: false, overSince: 0, count: 0, lastMs: 0, worst: 0 },
    };
    // Example history: a calm morning with a few loud moments, so the graphs aren't empty.
    for (let i = 0; i < 240; i++)
      st.minute[i] = Math.max(
        0,
        Math.round(4 + 3 * Math.sin(i / 7) + (i % 53 < 4 ? 22 : 0) + Math.random() * 3),
      );
    st.mFilled = 240;
    for (let i = 0; i < 54; i++) {
      const avg = Math.round(8 + 6 * Math.sin(i / 6) + Math.random() * 4);
      st.diary.push({
        lo: Math.max(0, avg - 6),
        avg,
        hi: avg + 8 + (i % 17 === 3 ? 25 : 0),
        over: i === 20,
      });
    }
    st.mic.onFrame = (_f, ms) => onFrame(st, ms);
    return st;
  },
  onCommand,
  draw: drawS2,
};
