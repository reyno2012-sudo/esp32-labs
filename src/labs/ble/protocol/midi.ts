// BLE-MIDI packets (the same rules as kit/lib/ble-kit/src/midi_ble.h encode()) and why notes wait
// for connection events.

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** MIDI note number → name, e.g. 60 → "C4". */
export const noteName = (n: number): string =>
  `${NOTE_NAMES[n % 12] ?? ""}${Math.floor(n / 12) - 1}`;

export type MidiRole = "header" | "ts" | "status" | "note" | "vel" | "skip";

export interface MidiByte {
  /** null = left out (running status). */
  readonly b: number | null;
  readonly role: MidiRole;
  readonly what: string;
}

export interface PendingNote {
  readonly note: number;
  /** ms on the 13-bit BLE-MIDI clock. */
  readonly ts: number;
}

/** One packet carrying several note-ons, each with its own timestamp. */
export function midiPacket(msgs: readonly PendingNote[], runningStatus: boolean): MidiByte[] {
  const first = msgs[0]?.ts ?? 0;
  const bytes: MidiByte[] = [
    {
      b: 0x80 | ((first >> 7) & 0x3f),
      role: "header",
      what: `header: 10 + timestamp high bits ${(first >> 7) & 0x3f}`,
    },
  ];
  let last = 0;
  for (const m of msgs) {
    bytes.push({
      b: 0x80 | (m.ts & 0x7f),
      role: "ts",
      what: `timestamp low 7 bits: ${m.ts & 0x7f} (= ${m.ts} ms on a 13-bit clock)`,
    });
    if (!(runningStatus && last === 0x90))
      bytes.push({ b: 0x90, role: "status", what: "status 9 = note on, 0 = channel 1" });
    else bytes.push({ b: null, role: "skip", what: "status left out: running status" });
    bytes.push({ b: m.note, role: "note", what: `note ${m.note} = ${noteName(m.note)}` });
    bytes.push({ b: 100, role: "vel", what: "velocity 100 (0 would mean note off)" });
    last = 0x90;
  }
  return bytes;
}

// Human timing: a few ms early or late, like real fingers.
const HUMAN = [0, 3, -2, 4, -3];

/** Notes played every `step` ms within `window` ms, when each leaves (next event), and the worst gap error. */
export function quantise(
  step: number,
  interval: number,
  window = 400,
  phase = 5,
): { notes: number[]; sent: number[]; err: number } {
  const notes: number[] = [];
  for (let t = phase, i = 0; t < window - 20; t += step, i++) notes.push(t + (HUMAN[i % 5] ?? 0));
  const sent = notes.map((t) => Math.ceil(t / interval) * interval);
  // How far each gap between two notes moved from the gap you played.
  const err = Math.max(
    0,
    ...notes
      .slice(1)
      .map((t, i) => Math.abs((sent[i + 1] ?? 0) - (sent[i] ?? 0) - (t - (notes[i] ?? 0)))),
  );
  return { notes, sent, err };
}
