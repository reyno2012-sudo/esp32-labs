// S7's synth: tunes, game-sound recipes (rough copies of sounds.h, so the fx view has a real
// shape and the browser can play it), wave shapes and their harmonics.
import type { Wave } from "./speaker";

/** [name, notes, bpm]. Public-domain tunes only. */
export const S7_TUNES: readonly (readonly [string, string, number])[] = [
  ["twinkle", "C5/4 C5/4 G5/4 G5/4 A5/4 A5/4 G5/2 F5/4 F5/4 E5/4 E5/4 D5/4 D5/4 C5/2", 150],
  ["ode", "E5/4 E5/4 F5/4 G5/4 G5/4 F5/4 E5/4 D5/4 C5/4 C5/4 D5/4 E5/4 E5/4. D5/8 D5/2", 150],
  ["happy", "C5/8. C5/16 D5/4 C5/4 F5/4 E5/2 C5/8. C5/16 D5/4 C5/4 G5/4 F5/2", 120],
  [
    "korobeiniki",
    "E5/4 B4/8 C5/8 D5/4 C5/8 B4/8 A4/4 A4/8 C5/8 E5/4 D5/8 C5/8 B4/4. C5/8 D5/4 E5/4 C5/4 A4/4 A4/2",
    150,
  ],
  ["scale", "C4/8 D4/8 E4/8 F4/8 G4/8 A4/8 B4/8 C5/8 D5/8 E5/8 F5/8 G5/8 A5/8 B5/8 C6/4", 160],
  ["arpeggio", "C4/16 E4/16 G4/16 C5/16 E5/16 G5/16 C6/8 G5/16 E5/16 C5/16 G4/16 E4/16 C4/4", 110],
];

export const S7_FX: readonly (readonly [string, string])[] = [
  ["laser", "a square wave diving 2.4 kHz -> 150 Hz"],
  ["coin", "B5 then E6, square, ringing out"],
  ["jump", "a quick glide up, 250 -> 900 Hz"],
  ["powerup", "three rising arpeggios"],
  ["explosion", "noise through a closing low-pass filter"],
  ["siren", "a sine wobbling 550-1250 Hz"],
  ["modem", "dial tone, two-tone chirps, hiss"],
];

/** A game sound's samples at 16 kHz, -1..1. */
export function fxSamples(name: string): Float32Array {
  const R = 16000;
  const sq = (p: number): number => (p - Math.floor(p) < 0.5 ? 1 : -1);
  const sin = (p: number) => Math.sin(2 * Math.PI * p);
  const out: number[] = [];
  let ph = 0;
  const sweep = (f0: number, f1: number, ms: number, w = sq, a = 0.6, dec = 0) => {
    const n = (ms / 1000) * R;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const f = f0 * Math.pow(f1 / f0, k);
      ph += f / R;
      out.push(w(ph) * a * (dec ? Math.exp(-k * dec) : 1));
    }
  };
  if (name === "laser") sweep(2400, 150, 300);
  else if (name === "coin") {
    sweep(988, 988, 80);
    sweep(1319, 1319, 420, sq, 0.6, 5);
  } else if (name === "jump") sweep(250, 900, 200, sq, 0.5);
  else if (name === "powerup") {
    for (let r = 0; r < 3; r++)
      for (const m of [0, 4, 7, 12])
        sweep(392 * Math.pow(2, (m + r * 5) / 12), 392 * Math.pow(2, (m + r * 5) / 12), 60);
  } else if (name === "explosion") {
    let lp = 0;
    const n = 0.8 * R;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const a = 0.02 + 0.5 * (1 - k) ** 3;
      lp += a * (Math.random() * 2 - 1 - lp);
      out.push(lp * 2.2 * (1 - k));
    }
  } else if (name === "siren") {
    const n = 2 * R;
    for (let i = 0; i < n; i++) {
      const f = 900 + 350 * Math.sin((2 * Math.PI * i) / R);
      ph += f / R;
      out.push(sin(ph) * 0.5);
    }
  } else if (name === "modem") {
    const n1 = 0.5 * R;
    for (let i = 0; i < n1; i++) out.push((sin((350 * i) / R) + sin((440 * i) / R)) * 0.25);
    for (let c = 0; c < 6; c++) sweep(c % 2 ? 1200 : 2100, c % 2 ? 1200 : 2100, 90, sin, 0.4);
    for (let i = 0; i < 0.4 * R; i++) out.push((Math.random() * 2 - 1) * 0.25);
  }
  return Float32Array.from(out);
}

/** One period's shape at phase `ph` (cycles), -1..1. Noise is random. */
export function waveShape(w: Wave, ph: number): number {
  const f = ph - Math.floor(ph);
  if (w === "sine") return Math.sin(2 * Math.PI * f);
  if (w === "square") return f < 0.5 ? 1 : -1;
  if (w === "triangle") return f < 0.5 ? 4 * f - 1 : 3 - 4 * f;
  if (w === "saw") return 2 * f - 1;
  return Math.random() * 2 - 1;
}

/** Relative amplitude of harmonic n (1 = the fundamental) of a wave. */
export function harmonic(w: Wave, n: number): number {
  if (w === "sine") return n === 1 ? 1 : 0;
  if (w === "square") return n % 2 ? 1 / n : 0;
  if (w === "triangle") return n % 2 ? 1 / (n * n) : 0;
  if (w === "saw") return 1 / n;
  return 0.3;
}

/** Chord qualities → semitones above the root. */
export const CHORDS: Readonly<Record<string, readonly number[]>> = {
  maj: [0, 4, 7],
  m: [0, 3, 7],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
};
