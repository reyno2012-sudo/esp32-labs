// kit/lib/sound-kit/src/level.h in TypeScript: decibels and the level meter every lab reads.

/** RMS of int16 samples → dB below full scale (dBFS); -96 for silence. */
export const sndDb = (rms: number) => (rms < 0.5 ? -96 : 20 * Math.log10(rms / 32768));

/** Mean power of int16 samples → dBFS. */
export const sndPowerDb = (p: number) => (p < 0.25 ? -96 : 10 * Math.log10(p / (32768 * 32768)));

/** What a level, in dB above the quiet, roughly sounds like (S2's meter text). */
export const sndLike = (above: number) =>
  above < 3
    ? "quiet"
    : above < 12
      ? "rustle, whisper"
      : above < 25
        ? "talking"
        : above < 38
          ? "loud talk, music"
          : "shout, clap, bang";

/** Which palette colour a level above the quiet gets: calm, loud, very loud. */
export const levelTone = (above: number): "teal" | "amber" | "coral" =>
  above < 25 ? "teal" : above < 40 ? "amber" : "coral";

export type Atten = 0 | 2.5 | 6 | 12;

/** The ADC's top in mV at each attenuation. */
export const SND_TOP: Readonly<Record<Atten, number>> = { 0: 950, 2.5: 1250, 6: 1750, 12: 3100 };

export const attenName = (a: Atten) =>
  ({ 0: "0 dB (0-0.95 V)", 2.5: "2.5 dB (0-1.25 V)", 6: "6 dB (0-1.75 V)", 12: "12 dB (0-3.1 V)" })[
    a
  ];

/** Parses an `atten` argument (11 is the old name of 12). */
export function parseAtten(arg: string): Atten | undefined {
  return ({ "0": 0, "2.5": 2.5, "6": 6, "12": 12, "11": 12 } as const)[arg as "0"];
}

/** The level meter: instant, fast (125 ms), slow (1 s), peak hold and the learned noise floor. */
export class LevelMeter {
  inst = -96;
  fast = -96;
  slow = -96;
  peak = -96;
  floor = 0;
  frames = 0;
  #fp = 0;
  #sp = 0;
  #learned = 0;
  #lp = 0;
  #peakAt = 0;
  readonly #aF: number;
  readonly #aS: number;
  readonly #rise: number;
  readonly #learnN: number;
  readonly #frameMs: number;

  constructor(frameMs = 4) {
    this.#frameMs = frameMs;
    this.#aF = 1 - Math.exp(-frameMs / 125);
    this.#aS = 1 - Math.exp(-frameMs / 1000);
    this.#rise = (0.5 * frameMs) / 1000;
    this.#learnN = Math.floor(500 / frameMs);
  }

  /** One frame's RMS at `ms` of sound. */
  push(rms: number, ms: number): void {
    const p = rms * rms;
    if (!this.frames) this.#fp = this.#sp = p;
    this.#fp += this.#aF * (p - this.#fp);
    this.#sp += this.#aS * (p - this.#sp);
    this.inst = sndDb(rms);
    this.fast = sndPowerDb(this.#fp);
    this.slow = sndPowerDb(this.#sp);
    if (this.inst >= this.peak) {
      this.peak = this.inst;
      this.#peakAt = ms;
    } else if (ms - this.#peakAt > 1500) this.peak -= (20 * this.#frameMs) / 1000;
    if (this.#learned < this.#learnN) {
      this.#lp += p;
      this.floor = sndPowerDb(this.#lp / ++this.#learned);
    } else if (this.fast < this.floor) this.floor = this.fast;
    else this.floor += this.#rise;
    this.frames++;
  }

  relearn(): void {
    this.#learned = 0;
    this.#lp = 0;
  }

  learning(): boolean {
    return this.#learned < this.#learnN;
  }

  above(): number {
    return Math.max(0, this.fast - this.floor);
  }

  instAbove(): number {
    return Math.max(0, this.inst - this.floor);
  }

  slowAbove(): number {
    return Math.max(0, this.slow - this.floor);
  }
}
