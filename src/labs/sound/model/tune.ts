// Notes as the board writes them: "C5/16 E5/16 G5/8. r/4 Bb4/2" (/4 = quarter, . = dotted, r = rest).

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
const SEMITONE: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440, "C#5" → 554.4, "Bb3" → 233.1; 0 when the name is not a note. */
export function midiHz(name: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const [, letter = "C", accidental, octave = "4"] = m;
  const semi =
    (SEMITONE[letter.toUpperCase()] ?? 0) + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  return 440 * Math.pow(2, ((Number(octave) + 1) * 12 + semi - 69) / 12);
}

export interface TuneNote {
  /** 0 for a rest. */
  readonly hz: number;
  readonly ms: number;
  readonly name: string;
}

export function parseTune(notes: string, bpm: number): TuneNote[] {
  return notes
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [name = "", frac = "4"] = tok.split("/");
      const dotted = frac.endsWith(".");
      const d = Number.parseFloat(frac);
      return {
        hz: name === "r" ? 0 : midiHz(name),
        ms: (4 / d) * (60000 / bpm) * (dotted ? 1.5 : 1),
        name,
      };
    });
}

/** Total length of a tune in ms. */
export const tuneMs = (notes: string, bpm: number) =>
  parseTune(notes, bpm).reduce((s, n) => s + n.ms, 0);

/** The short sounds every lab plays. */
export const CHIME = {
  hello: "C5/16 E5/16 G5/8",
  ok: "E6/16 B6/8",
  no: "C4/16 r/32 C4/8",
  start: "G5/16 C6/16",
  stop: "C6/16 G5/16",
  score: "C6/32 E6/32 G6/32 C7/16",
} as const;

export interface NoteName {
  readonly midi: number;
  readonly cents: number;
  readonly name: string;
}

/** A frequency → the nearest note, how many cents off, and its name ("A4"). */
export function noteOf(hz: number, a4 = 440): NoteName {
  if (!(hz > 0)) return { midi: 0, cents: 0, name: "" };
  const m = 69 + 12 * Math.log2(hz / a4);
  const midi = Math.round(m);
  return {
    midi,
    cents: (m - midi) * 100,
    name: `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.max(0, Math.min(9, Math.floor(midi / 12) - 1))}`,
  };
}

/** The nearest MIDI note number of a frequency (A4 = 69). */
export const midiOf = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440));
