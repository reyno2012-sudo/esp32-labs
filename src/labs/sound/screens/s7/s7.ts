// S7 Speaker on the board's screen: a synth with waves, keys, an envelope, tunes and game sounds.
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import type { SoundSpec, SoundState } from "../../kit/types";
import { type Adsr, isWave, type Wave, WAVES } from "../../model/speaker";
import { CHORDS, fxSamples, S7_FX, S7_TUNES } from "../../model/synth";
import { midiHz, midiOf, NOTE_NAMES, parseTune } from "../../model/tune";
import { drawS7 } from "./s7-draw";

/** One note of what is playing: start ms, length ms, Hz (0 = rest), MIDI number (-1 = rest). */
export interface PieceEvent {
  readonly at: number;
  readonly ms: number;
  readonly hz: number;
  readonly midi: number;
}

/** Something playing: what the keys light and the roll scrolls. */
export interface Piece {
  readonly events: readonly PieceEvent[];
  readonly title: string;
  /** performance.now() when it started. */
  readonly at: number;
  readonly total: number;
  readonly samples: Float32Array | null;
}

export interface S7State extends SoundState {
  wave: Wave;
  hz: number;
  adsr: Adsr;
  bpm: number;
  tuneIdx: number;
  fxIdx: number;
  chord: number;
  scaleAt: number;
  piece: Piece | null;
  fxBuf: Float32Array | null;
}

const CHORD_ROTATION = ["Cmaj", "Fmaj", "Gmaj", "Am", "Dm", "G7"] as const;
const SCALE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] as const;

/** Notes one after another, as events. */
function sequence(notes: string, bpm: number): PieceEvent[] {
  let at = 0;
  return parseTune(notes, bpm).map((n) => {
    const e = { at, ms: n.ms, hz: n.hz, midi: n.hz ? midiOf(n.hz) : -1 };
    at += n.ms;
    return e;
  });
}

/** Something starts playing: on the board's speaker and (if switched on) in the browser. */
function start(
  st: S7State,
  events: readonly PieceEvent[],
  title: string,
  samples: Float32Array | null = null,
): void {
  const total =
    events.reduce((m, e) => Math.max(m, e.at + e.ms), 0) || (samples ? samples.length / 16 : 0);
  st.piece = { events, title, at: performance.now(), total, samples };
  st.mic.spk.play(total, events[0]?.hz || 600, title);
  if (samples) st.mic.spk.out.samples(samples, 16000);
  else
    events.forEach((e) => e.hz && st.mic.spk.out.tone(e.hz, e.ms, st.wave, e.at / 1000, st.adsr));
}

function onCommand(line: string, st: S7State, term: TerminalPrinter): boolean {
  const [cmd = "", ...rest] = line.trim().split(/\s+/);
  const a = rest.join(" ");
  const low = a.toLowerCase();
  if (cmd === "wave") {
    const w =
      low === "next" || !low ? (WAVES[(WAVES.indexOf(st.wave) + 1) % WAVES.length] ?? "sine") : low;
    if (!isWave(w)) {
      term.line("[W] wave sine | square | triangle | saw | noise | next", "warn");
      return true;
    }
    st.wave = w;
    soundNote(st, term, "-", `wave ${w}`);
    return true;
  }
  if (cmd === "play") {
    if (!a) {
      term.line(
        "[W] play <notes>, e.g. play C4 E4 G4 C5/2   (/4 = quarter, /8 = eighth, r = rest)",
        "warn",
      );
      return true;
    }
    start(st, sequence(a, st.bpm), "play");
    return true;
  }
  if (cmd === "chord") {
    const m = /^([A-G][#b]?)(maj7|maj|m7|m|7|dim|aug|sus4|sus2)$/.exec(a);
    const iv = m ? CHORDS[m[2] ?? ""] : undefined;
    if (!m || !iv) {
      term.line(
        "[W] chord <root><quality>: Cmaj Am G7 Fmaj7 Dm7 Bdim Caug Dsus4 Esus2 (root may have # or b)",
        "warn",
      );
      return true;
    }
    const root = midiHz(`${m[1] ?? "C"}4`);
    const ev = iv.map((s) => ({
      at: 0,
      ms: 1200,
      hz: root * Math.pow(2, s / 12),
      midi: midiOf(root) + s,
    }));
    soundNote(
      st,
      term,
      "-",
      `${a} = ${ev.map((e) => `${NOTE_NAMES[((e.midi % 12) + 12) % 12]}${Math.floor(e.midi / 12) - 1}`).join(" ")}`,
    );
    start(st, ev, a);
    return true;
  }
  if (cmd === "note") {
    const [what = "", ms = "600"] = rest;
    const hz = midiHz(what) || Number(what);
    if (!(hz >= 20 && hz <= 8000) || !(Number(ms) >= 20 && Number(ms) <= 10000)) {
      term.line("[W] note A4 | note C#5 300 | note 1000", "warn");
      return true;
    }
    st.hz = hz;
    start(st, [{ at: 0, ms: Number(ms), hz, midi: midiOf(hz) }], "note");
    return true;
  }
  if (cmd === "adsr") {
    const v = rest.map(Number);
    const [at = 0, d = 0, s = 0, r = 0] = v;
    if (v.length !== 4 || v.some((x) => !(x >= 0))) {
      term.line(
        "[W] adsr <attack ms> <decay ms> <sustain %> <release ms>, e.g. adsr 5 80 65 90 (a plucked string: adsr 1 300 0 50)",
        "warn",
      );
      return true;
    }
    st.adsr = [at, d, Math.min(1, s / 100), r];
    soundNote(st, term, "-", `adsr ${v.join(" ")}`);
    return true;
  }
  if (cmd === "tune") {
    const i = S7_TUNES.findIndex((x) => x[0] === low);
    const tune = S7_TUNES[i];
    if (!tune) {
      term.line(`tunes: ${S7_TUNES.map((x) => x[0]).join(" ")}`);
      if (low) term.line(`[W] no tune '${low}'`, "warn");
      return true;
    }
    st.tuneIdx = i;
    start(st, sequence(tune[1], tune[2]), tune[0]);
    return true;
  }
  if (cmd === "bpm") {
    const b = Number(a);
    if (!(b >= 30 && b <= 300))
      term.line(`[W] bpm <30-300> (now ${st.bpm}): the tempo for play`, "warn");
    else st.bpm = b;
    return true;
  }
  if (cmd === "fx") {
    const i = S7_FX.findIndex((x) => x[0] === low);
    const fx = S7_FX[i];
    if (!fx) {
      term.line(`effects: ${S7_FX.map((x) => x[0]).join(" ")}`);
      return true;
    }
    st.fxIdx = i;
    st.fxBuf = fxSamples(fx[0]);
    soundNote(st, term, "-", `fx ${fx[0]}: ${fx[1]}`);
    start(st, [], fx[0], st.fxBuf);
    return true;
  }
  if (cmd === "stop") {
    st.piece = null;
    st.mic.spk.stop();
    return true;
  }
  if (cmd === "next") {
    const n = SCALE[st.scaleAt++ % SCALE.length] ?? "C4";
    return onCommand(`note ${n} 400`, st, term);
  }
  return false;
}

const tuneName = (st: S7State) => S7_TUNES[st.tuneIdx]?.[0] ?? "twinkle";
const fxName = (st: S7State) => S7_FX[st.fxIdx]?.[0] ?? "laser";

export const S7: SoundSpec<S7State> = {
  views: ["wave", "keys", "envelope", "tunes", "fx"],
  dbl: ["wave next", "next note", "note A4 600", "tune picked", "fx picked"],
  commands: [
    ["wave <name|next>", "sine square triangle saw noise: the timbre"],
    ["play <notes>", "notes one after another: play C4 E4 G4/2 r/4 C5"],
    ["chord <name>", "notes together: Cmaj Am G7 Fmaj7 Bdim Dsus4"],
    ["note <name|Hz> [ms]", "one note: note A4, note 1000 250"],
    ["adsr <a> <d> <s%> <r>", "the envelope, ms ms % ms (default 6 80 65 90)"],
    ["tune <name>", "twinkle ode happy korobeiniki scale arpeggio"],
    ["bpm <n>", "tempo for play (default 120)"],
    ["fx <name>", "laser coin jump powerup explosion siren modem"],
    ["stop", "silence"],
    ["next", "the next note of the C major scale"],
  ],
  boot: ["  - start quiet: vol 20, then raise it"],
  captions: [
    (t) => t("labs-sound:s7.captions.wave"),
    (t) => t("labs-sound:s7.captions.keys"),
    (t) => t("labs-sound:s7.captions.envelope"),
    (t) => t("labs-sound:s7.captions.tunes"),
    (t) => t("labs-sound:s7.captions.fx"),
  ],
  actions: [
    { label: (_, t) => t("labs-sound:s7.actions.waveNext"), run: (st, term) => void onCommand("wave next", st, term) },
    {
      label: (_, t) => t("labs-sound:s7.actions.tunePicked"),
      run(st, term) {
        onCommand(`tune ${tuneName(st)}`, st, term);
        st.view = 3;
      },
    },
    {
      label: (_, t) => t("labs-sound:s7.actions.fxPicked"),
      run(st, term) {
        onCommand(`fx ${fxName(st)}`, st, term);
        st.view = 4;
      },
    },
    {
      label: (_, t) => t("labs-sound:s7.actions.longPressNext"),
      run(st, term) {
        if (st.view === 3) st.tuneIdx = (st.tuneIdx + 1) % S7_TUNES.length;
        else if (st.view === 4) st.fxIdx = (st.fxIdx + 1) % S7_FX.length;
        else if (st.view === 1)
          onCommand(
            `chord ${CHORD_ROTATION[st.chord++ % CHORD_ROTATION.length] ?? "Cmaj"}`,
            st,
            term,
          );
        else onCommand("stop", st, term);
      },
    },
  ],
  init: () => ({
    view: 0,
    mic: soundMic({ digital: true }),
    wave: "triangle",
    hz: 440,
    adsr: [6, 80, 0.65, 90],
    bpm: 120,
    tuneIdx: 0,
    fxIdx: 0,
    chord: 0,
    scaleAt: 0,
    piece: null,
    fxBuf: null,
  }),
  onCommand,
  draw: drawS7,
};
