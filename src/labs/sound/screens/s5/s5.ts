// S5 Spectrum on the board's screen: bars, waterfall, tuner, steer, from our own FFT.
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { soundMic } from "../../kit/kit";
import { soundNote } from "../../kit/note";
import type { SoundSpec, SoundState } from "../../kit/types";
import { Fft } from "../../model/fft";
import { midiHz, noteOf } from "../../model/tune";
import { drawS5 } from "./s5-draw";

export interface S5Pitch {
  heard: boolean;
  hz: number;
  /** performance.now() when a pitch was last heard. */
  last: number;
  /** MIDI note (fractional) per answer, 0 = nothing heard. */
  trail: Float32Array;
  th: number;
}

export interface S5Steer {
  y: number;
  target: number;
  inSince: number;
  score: number;
  ribbon: Float32Array;
  rh: number;
}

export interface S5State extends SoundState {
  fft: Fft;
  hold: boolean;
  a4: number;
  lo: number;
  hi: number;
  bars: Float32Array;
  barFloor: Float32Array;
  caps: Float32Array;
  rowFloor: Float32Array;
  learned: number;
  /** The waterfall: 140 columns of 48 rows, 0-255. */
  hist: Uint8Array[];
  hh: number;
  pitch: S5Pitch;
  steer: S5Steer;
  acc: number;
  sweepAt?: number;
  refHz?: number;
}

const BOOT = [
  "What this FFT can and can't see (rate 16000 Hz, N 512):",
  "  frequencies up to 8000 Hz only (Nyquist: half the sample rate)",
  "  bins 31.2 Hz apart; each answer looks at 32 ms of sound",
  "  the KY-037 has no amplifier: whistle or hum within a hand's width, quiet sounds drown in the hiss",
];

/** Where a frequency sits in the steer range, 0..1 on a log scale. */
export const steerFrac = (st: S5State, hz: number) =>
  hz <= st.lo ? 0 : hz >= st.hi ? 1 : Math.log(hz / st.lo) / Math.log(st.hi / st.lo);

/** What the pretend whistle does: a sweep, the reference tone, or a slow slide around 1 kHz. */
function whistleHz(st: S5State, t: number): number {
  if (st.sweepAt !== undefined && t - st.sweepAt < 4)
    return 100 * Math.pow(80, (t - st.sweepAt) / 4);
  if (st.refHz && st.mic.spk.busy()) return st.refHz;
  return 1000 * Math.pow(2, 0.9 * Math.sin(t * 0.9));
}

// Each band's own quiet: learned over the first 10 answers, then follows the quietest, rising slowly.
function follow(st: S5State, floor: Float32Array, now: readonly number[], out: Float32Array): void {
  now.forEach((v, i) => {
    const f = floor[i] ?? 0;
    if (st.learned < 10) floor[i] = f + (v - f) / (st.learned + 1);
    else if (v < f) floor[i] = v;
    else floor[i] = f + 0.5 * 0.04;
    out[i] = Math.max(0, v - (floor[i] ?? 0));
  });
}

function tick(st: S5State, dt: number): void {
  if (st.hold || (st.acc += dt) < 0.04) return; // ~25 answers a second, like the board's screen
  st.acc = 0;
  st.fft.run(st.mic.latest(st.fft.n));
  follow(st, st.barFloor, st.fft.bands(16000, 100, 7999, 24), st.bars);
  const above = new Float32Array(48);
  follow(st, st.rowFloor, st.fft.bands(16000, 100, 7999, 48), above);
  if (st.learned < 10) st.learned++;
  st.bars.forEach((v, i) => (st.caps[i] = Math.max((st.caps[i] ?? 0) - 30 * 0.04, v)));
  const col = st.hist[st.hh];
  if (col) above.forEach((v, i) => (col[i] = Math.min(255, (v * 255) / 40)));
  st.hh = (st.hh + 1) % 140;
  const p = st.fft.peak(16000, 80, 4000);
  const P = st.pitch;
  const now = performance.now();
  P.heard = p.clarity >= 12 && st.mic.level.above() >= 8;
  if (P.heard) {
    P.hz = p.hz;
    P.last = now;
  }
  P.trail[P.th] = P.heard ? 69 + 12 * Math.log2(p.hz / st.a4) : 0;
  P.th = (P.th + 1) % 120;
  const S = st.steer;
  if (P.heard) S.y += (steerFrac(st, P.hz) - S.y) * 0.4;
  S.ribbon[S.rh] = S.y;
  S.rh = (S.rh + 1) % 120;
  const inRing = P.heard && Math.abs(S.y - S.target) < 0.09;
  if (!inRing) S.inSince = 0;
  else if (!S.inSince) S.inSince = now;
  else if (now - S.inSince >= 1000) {
    S.score++;
    soundNote(st, st.term, "+", `target ${S.score}!`);
    S.target = 0.15 + Math.random() * 0.7;
    S.inSince = 0;
  }
}

function printPeaks(st: S5State, term: TerminalPrinter): void {
  const f = st.fft;
  const ks: number[] = [];
  for (let k = 2; k < f.n / 2 - 1; k++) if (f.m(k) > f.m(k - 1) && f.m(k) >= f.m(k + 1)) ks.push(k);
  ks.sort((x, y) => f.m(y) - f.m(x));
  term.line(
    `Strongest peaks (FFT ${f.n} at 16000 Hz: bins ${(16000 / f.n).toFixed(1)} Hz apart, up to 8000 Hz):`,
  );
  ks.slice(0, 5).forEach((k) => {
    const hz = (k * 16000) / f.n;
    const nt = noteOf(hz, st.a4);
    term.line(
      `  ${hz.toFixed(1).padStart(7)} Hz  ${f.db(k).toFixed(1).padStart(6)} dBFS  ${nt.name.padEnd(4)} ${nt.cents >= 0 ? "+" : ""}${nt.cents.toFixed(0)} cents`,
    );
  });
}

function playRef(st: S5State, term: TerminalPrinter, a: string): void {
  // The nearest note heard in the last 2 s, else A4; or what you name. S5 reads the ring, so it hears its own tone.
  const hz = a
    ? midiHz(a.toUpperCase()) || Number(a)
    : performance.now() - st.pitch.last < 2000
      ? 440 * Math.pow(2, Math.round(12 * Math.log2(st.pitch.hz / st.a4)) / 12) * (st.a4 / 440)
      : st.a4;
  if (!(hz >= 20 && hz <= 8000)) {
    term.line("[W] ref [note|Hz]: ref, ref A4, ref 440", "warn");
    return;
  }
  st.mic.say("whistle", 1);
  st.refHz = hz;
  st.mic.spk.play(1000, hz, "ref");
  st.mic.spk.out.tone(hz, 1000, "sine");
  soundNote(st, term, "-", `reference ${noteOf(hz, st.a4).name} = ${hz.toFixed(1)} Hz, 1 s`);
}

function onCommand(line: string, st: S5State, term: TerminalPrinter): boolean {
  const [cmd = "", a = "", b = ""] = line.toLowerCase().split(/\s+/);
  switch (cmd) {
    case "fft": {
      const n = Number(a);
      if (![256, 512, 1024].includes(n))
        term.line(
          `[W] fft 256 | 512 | 1024   (now ${st.fft.n}: ${(16000 / st.fft.n).toFixed(0)} Hz between bins, a new answer every ${((st.fft.n * 1000) / 16000).toFixed(0)} ms of sound)`,
          "warn",
        );
      else {
        st.fft = new Fft(n);
        soundNote(
          st,
          term,
          "-",
          `FFT ${n}: ${(16000 / n).toFixed(1)} Hz per bin, ${((n * 1000) / 16000).toFixed(0)} ms window`,
        );
      }
      return true;
    }
    case "range": {
      const lo = Number(a);
      const hi = Number(b);
      if (!(lo >= 100 && hi <= 7900 && hi >= lo * 1.5))
        term.line(
          `[W] range <low Hz> <high Hz>, 100-7900, high at least 1.5x low (now ${st.lo} ${st.hi})`,
          "warn",
        );
      else {
        st.lo = lo;
        st.hi = hi;
        soundNote(st, term, "-", `steer range ${lo}-${hi} Hz`);
      }
      return true;
    }
    case "hold":
      st.hold = a ? a !== "off" : !st.hold;
      soundNote(st, term, "-", st.hold ? "hold: the picture stays (hold again to go on)" : "live");
      return true;
    case "peaks":
      printPeaks(st, term);
      return true;
    case "a4": {
      const hz = Number(a);
      if (!(hz >= 400 && hz <= 480))
        term.line(`[W] a4 <Hz>, 400-480 (now ${st.a4.toFixed(1)}; most music: 440)`, "warn");
      else {
        st.a4 = hz;
        soundNote(st, term, "-", `A4 = ${hz.toFixed(1)} Hz`);
      }
      return true;
    }
    case "target":
      if (a === "reset") st.steer.score = 0;
      st.steer.target = 0.15 + Math.random() * 0.7;
      soundNote(st, term, "-", `new target${a === "reset" ? ", score 0" : ""}`);
      return true;
    case "ref":
      playRef(st, term, a);
      return true;
    case "sweep":
      st.sweepAt = st.mic.t;
      st.mic.say("whistle", 4);
      st.mic.spk.play(4000, 100, "sweep");
      st.view = 1;
      soundNote(st, term, "-", "sweep 100 Hz -> 8 kHz, 4 s");
      return true;
    case "limits":
      BOOT.forEach((l) => term.line(l));
      return true;
    default:
      return false;
  }
}

export const S5: SoundSpec<S5State> = {
  views: ["bars", "waterfall", "tuner", "steer"],
  dbl: ["hold", "hold", "ref", "target"],
  commands: [
    ["fft <256|512|1024>", "FFT size: finer bins vs faster answers (default 512)"],
    ["range <low> <high>", "the steer view's pitch range in Hz (default 600 2500)"],
    ["hold [off]", "freeze the bars and waterfall (long press too)"],
    ["peaks", "print the 5 strongest frequencies, with notes"],
    ["ref [note|Hz]", "play a reference note on the speaker (tuner double-click)"],
    ["sweep", "a 4 s tone sweep 100 Hz -> 8 kHz on the speaker"],
    ["a4 <Hz>", "tuning reference for note names (default 440)"],
    ["target [reset]", "steer: a new target (reset: score back to 0)"],
    ["limits", "what this FFT can and can't see"],
  ],
  boot: BOOT,
  captions: [
    (t) => t("labs-sound:s5.captions.bars"),
    (t) => t("labs-sound:s5.captions.waterfall"),
    (t) => t("labs-sound:s5.captions.tuner"),
    (t) => t("labs-sound:s5.captions.steer"),
  ],
  actions: [
    { label: (_, t) => t("labs-sound:s5.actions.slideWhistle4S"), run: (st) => st.mic.say("whistle", 4) },
    { label: (_, t) => t("labs-sound:s5.actions.music3S"), run: (st) => st.mic.say("music", 3) },
    { label: (_, t) => t("labs-sound:s5.actions.hold"), run: (st, term) => void onCommand("hold", st, term) },
    {
      label: (_, t) => t("labs-sound:s5.actions.ref2xOnTuner"),
      run(st, term) {
        onCommand("ref", st, term);
        st.view = 2;
      },
    },
    { label: (_, t) => t("labs-sound:s5.actions.sweep"), run: (st, term) => void onCommand("sweep", st, term) },
  ],
  init() {
    const st: S5State = {
      view: 0,
      mic: soundMic({ whistleHz: (t) => whistleHz(st, t) }),
      fft: new Fft(512),
      hold: false,
      a4: 440,
      lo: 600,
      hi: 2500,
      bars: new Float32Array(24),
      barFloor: new Float32Array(24),
      caps: new Float32Array(24),
      rowFloor: new Float32Array(48),
      learned: 0,
      hist: Array.from({ length: 140 }, () => new Uint8Array(48)),
      hh: 0,
      pitch: { heard: false, hz: 0, last: -1e9, trail: new Float32Array(120), th: 0 },
      steer: { y: 0.5, target: 0.6, inSince: 0, score: 0, ribbon: new Float32Array(120), rh: 0 },
      acc: 0,
    };
    return st;
  },
  tick,
  onCommand,
  draw: drawS5,
};
