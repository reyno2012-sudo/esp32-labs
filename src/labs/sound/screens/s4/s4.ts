// S4 Recorder on the board's screen: voice-activated recording, the clips, the web page.
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import type { SoundSpec, SoundState } from "../../kit/types";
import { sndDb } from "../../model/level";
import { type TriggerResult, VoiceTrigger } from "../../model/trigger";
import { drawS4 } from "./s4-draw";

export interface S4Clip {
  readonly n: number;
  /** Seconds. */
  readonly dur: number;
  readonly manual: boolean;
  readonly peak: number;
  /** 48 bar heights 0..1 for the clips view. */
  readonly shape: readonly number[];
}

export interface S4State extends SoundState {
  tr: VoiceTrigger;
  /** dB above the quiet per 4 ms frame, the last 3 s. */
  env: Uint8Array;
  /** 0 = nothing, 1 = pre-roll, 2 = recorded. */
  mark: Uint8Array;
  head: number;
  clips: S4Clip[];
  next: number;
  picked: number;
  peak: number;
  /** The clip number playing on the board's speaker, 0 = none. */
  playing: number;
}

/** PSRAM the clips use, in MB. */
export const clipsMb = (clips: readonly S4Clip[]) =>
  clips.reduce((s, c) => s + c.dur * 32000, 0) / 1048576;
/** How much louder a clip is sent (normalised, up to ×64). */
export const sentGain = (c: S4Clip) => Math.min(64, Math.max(1, 29000 / c.peak));

function result(
  st: S4State,
  r: TriggerResult | null,
  ms: number,
  term: TerminalPrinter | undefined,
): void {
  if (!r) return;
  if (r.action === "start") {
    st.rec = true;
    st.peak = 0;
    // The pre-roll: mark the frames the clip took from before the trigger.
    for (let k = 1; k <= Math.round((ms - r.from) / 4); k++) st.mark[(st.head - k + 750) % 750] = 1;
    soundNote(st, term, "x", `REC clip ${st.next} (${st.tr.manual ? "by hand" : "voice"})`);
    return;
  }
  st.rec = false;
  if (r.action === "drop") {
    soundNote(st, term, "-", `a bang, not a voice: clip ${st.next++} dropped`);
    return;
  }
  const c: S4Clip = {
    n: st.next++,
    dur: (r.to - r.from) / 1000,
    manual: st.tr.manual,
    peak: Math.max(16, st.peak),
    shape: Array.from({ length: 48 }, () => Math.random()),
  };
  st.clips.push(c);
  if (st.clips.length > 12) st.clips.shift();
  soundNote(st, term, "+", `clip ${c.n}: ${c.dur.toFixed(1)} s`);
}

function stopPlayback(st: S4State, term: TerminalPrinter): void {
  st.mic.spk.stop();
  soundNote(st, term, "-", `playback of clip ${st.playing} stopped`);
  st.playing = 0;
}

function onCommand(line: string, st: S4State, term: TerminalPrinter): boolean {
  const [cmd = "", a = ""] = line.toLowerCase().split(/\s+/);
  const now = st.mic.ms;
  switch (cmd) {
    case "arm":
      if (a && a !== "on" && a !== "off") {
        term.line("[W] arm | arm on | arm off", "warn");
        return true;
      }
      st.tr.arm(a ? a === "on" : !st.tr.armed);
      soundNote(st, term, "-", st.tr.armed ? "armed: talk and it records" : "voice trigger off");
      return true;
    case "rec":
      if (st.tr.state === "rec") return onCommand("stop", st, term);
      if (st.playing) stopPlayback(st, term);
      result(st, st.tr.start(now), now, term);
      return true;
    case "play": {
      const [nn, sp = "1"] = line.trim().split(/\s+/).slice(1);
      const speed = Number(sp);
      if (st.tr.state === "rec") {
        term.line("[W] recording: stop first (the microphone would hear the speaker)", "warn");
        return true;
      }
      if (!(speed >= 0.5 && speed <= 2)) {
        term.line("[W] speed: 0.5 (slow, deep) to 2.0 (fast, chipmunk)", "warn");
        return true;
      }
      const c = nn
        ? st.clips.find((x) => x.n === Number(nn))
        : st.clips[Math.min(st.picked, st.clips.length - 1)];
      if (!c) {
        term.line(nn ? `[W] no finished clip ${nn}` : "[W] no clips yet", "warn");
        return true;
      }
      st.playing = c.n;
      st.mic.spk.play((c.dur / speed) * 1000, 200 * speed, `clip ${c.n}`);
      soundNote(
        st,
        term,
        "+",
        `playing clip ${c.n} (${(c.dur / speed).toFixed(1)} s) at x${speed.toFixed(2)}`,
      );
      return true;
    }
    case "stop": {
      if (st.playing && st.tr.state !== "rec") {
        stopPlayback(st, term);
        return true;
      }
      const r = st.tr.stop(now);
      if (!r) soundNote(st, term, "-", "not recording");
      else result(st, r, now, term);
      return true;
    }
    case "trigger": {
      const d = Number(a);
      if (!(d >= 3 && d <= 60))
        term.line(`[W] trigger <dB above the quiet>, 3-60 (now ${st.tr.cfg.startDb})`, "warn");
      else {
        st.tr.cfg.startDb = d;
        soundNote(st, term, "-", `voice starts above ${d} dB`);
      }
      return true;
    }
    case "hold": {
      const ms = Number(a);
      if (!(ms >= 200 && ms <= 10000))
        term.line(
          `[W] hold <ms>, 200-10000: quiet this long ends a clip (now ${st.tr.cfg.holdMs})`,
          "warn",
        );
      else {
        st.tr.cfg.holdMs = ms;
        soundNote(st, term, "-", `a clip ends after ${(ms / 1000).toFixed(1)} s of quiet`);
      }
      return true;
    }
    case "max": {
      const s = Number(a);
      if (!(s >= 1 && s <= 120))
        term.line(`[W] max <s>, 1-120: the longest clip (now ${st.tr.cfg.maxMs / 1000})`, "warn");
      else {
        st.tr.cfg.maxMs = s * 1000;
        soundNote(st, term, "-", `clips stop at ${s} s (from the next one)`);
      }
      return true;
    }
    case "clips":
      term.line(
        `${st.clips.length} clips, ${clipsMb(st.clips).toFixed(2)} of 6 MB of PSRAM (gone on reset):`,
      );
      term.line("    #  length  kind   loudest     sent x  started");
      st.clips.forEach((c) =>
        term.line(
          `  ${String(c.n).padStart(3)}  ${c.dur.toFixed(1).padStart(5)}s  ${(c.manual ? "hand" : "voice").padEnd(5)}  ${sndDb(c.peak).toFixed(1).padStart(5)} dBFS  x${sentGain(c).toFixed(1).padEnd(5)} -`,
        ),
      );
      st.view = 1;
      return true;
    case "next":
      st.picked = st.clips.length ? (st.picked + 1) % st.clips.length : 0;
      st.view = 1;
      return true;
    case "del": {
      const i = st.clips.findIndex((c) => c.n === Number(a));
      if (i < 0) term.line(`[W] no clip ${a}`, "warn");
      else {
        st.clips.splice(i, 1);
        soundNote(st, term, "-", `clip ${a} deleted`);
      }
      return true;
    }
    case "clear": {
      const n = st.clips.length;
      st.clips = [];
      soundNote(st, term, "-", `${n} clip${n === 1 ? "" : "s"} deleted`);
      return true;
    }
    case "send": {
      const c = st.clips.find((x) => x.n === Number(a));
      if (!c) term.line(`[W] no finished clip ${a}`, "warn");
      else {
        const bytes = 44 + Math.round(c.dur * 32000);
        term.line(`WAV-BEGIN ${c.n} ${bytes} clip-${c.n}.wav`);
        term.line(
          "UklGRiyQAQBXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQCQAQD+/wEA…  (base64, 76 per line)",
        );
        term.line("WAV-END 3c9a51f2");
        soundNote(st, term, "+", `sent clip ${c.n} (${bytes} bytes)`);
      }
      return true;
    }
    case "token":
      term.line(
        a === "new"
          ? "[W] new admin token: open pages must unlock again"
          : "Admin token: 3f…(32 hex characters)…",
        a === "new" ? "warn" : "plain",
      );
      if (a !== "new")
        term.line(
          "Paste it into the page at http://bench.local (it is shared with R7/R8; keep it out of chats and git)",
        );
      return true;
    case "wifi":
      term.line(
        "Wi-Fi 'your-network' · IP 192.168.1.42 · -58 dBm · page http://bench.local · 1 page(s) open",
      );
      st.view = 2;
      return true;
    default:
      return false;
  }
}

export const S4: SoundSpec<S4State> = {
  views: ["recorder", "clips", "web"],
  dbl: ["arm", "play", "wifi"],
  commands: [
    ["arm [on|off]", "voice-activated recording (alone: toggle)"],
    ["rec", "record now, by hand (again, or long press: stop)"],
    ["stop", "stop recording (or the board's playback)"],
    ["play [n] [speed]", "play clip n on the board's speaker, speed 0.5-2.0 (default 1)"],
    ["trigger <dB>", "how loud starts a clip, dB above the quiet (default 15)"],
    ["hold <ms>", "quiet this long ends a clip (default 1200)"],
    ["max <s>", "the longest clip (default 20)"],
    ["clips", "list the clips (PSRAM only: gone on reset)"],
    ["next", "pick the next clip on the clips view"],
    ["del <n>", "delete clip n"],
    ["clear", "delete every finished clip"],
    ["send <n>", "clip n as a WAV over serial, for tools/sound_pull.py"],
    ["token [new]", "the admin token the phone page asks for"],
    ["wifi", "Wi-Fi and the page's address"],
  ],
  captions: [
    (t) => t("labs-sound:s4.captions.recorder"),
    (t) => t("labs-sound:s4.captions.clips"),
    (t) => t("labs-sound:s4.captions.web"),
  ],
  actions: [
    { label: (_, t) => t("labs-sound:s4.actions.armOnOff"), run: (st, term) => void onCommand("arm", st, term) },
    {
      label: (_, t) => t("labs-sound:s4.actions.recStopLongPress"),
      run(st, term) {
        if (st.view === 1) onCommand("next", st, term);
        else onCommand(st.tr.state === "rec" ? "stop" : "rec", st, term);
      },
    },
    { label: (_, t) => t("labs-sound:s4.actions.playPicked2xOn"), run: (st, term) => void onCommand("play", st, term) },
    { label: (_, t) => t("labs-sound:s4.actions.talk2S"), run: (st) => st.mic.say("talk", 2) },
  ],
  init() {
    const st: S4State = {
      view: 0,
      mic: soundMic(),
      tr: new VoiceTrigger(),
      env: new Uint8Array(750),
      mark: new Uint8Array(750),
      head: 0,
      clips: [],
      next: 1,
      picked: 0,
      peak: 0,
      playing: 0,
    };
    st.mic.onFrame = (f, ms) => {
      const a = st.mic.level.above();
      st.env[st.head] = Math.min(255, st.mic.level.instAbove());
      st.mark[st.head] = st.tr.state === "rec" ? 2 : 0;
      st.head = (st.head + 1) % 750;
      if (st.tr.state === "rec") st.peak = Math.max(st.peak, f.peak);
      if (st.mic.level.learning()) return;
      result(st, st.tr.push(a, ms), ms, st.term);
    };
    return st;
  },
  tick(st) {
    if (st.playing && !st.mic.spk.busy()) {
      soundNote(st, st.term, "-", `clip ${st.playing} played`);
      st.playing = 0;
    }
  },
  onCommand,
  draw: drawS4,
};
