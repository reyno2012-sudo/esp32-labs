// The board's speaker in the previews: what it plays and for how long. Whether you also hear it
// depends on the sink it is given (the browser's Web Audio, switched on by a click, or nothing).
import { parseTune, tuneMs } from "./tune";

export type Wave = "sine" | "square" | "triangle" | "saw" | "noise";
export const WAVES: readonly Wave[] = ["sine", "square", "triangle", "saw", "noise"];
export const isWave = (w: string): w is Wave => (WAVES as readonly string[]).includes(w);

/** Attack ms, decay ms, sustain level 0..1, release ms. */
export type Adsr = readonly [number, number, number, number];
export const DEFAULT_ADSR: Adsr = [6, 80, 0.65, 90];

/** Somewhere sounds can go: the browser's speakers, or nowhere. */
export interface ToneSink {
  tone(hz: number, ms: number, wave?: Wave, at?: number, adsr?: Adsr, level?: number): void;
  tune(notes: string, bpm?: number, wave?: Wave): number;
  samples(samples: Float32Array, rate: number, speed?: number): void;
  /** The board's volume 0-100 (squared, like the firmware). */
  volume(vol: number): void;
}

export const SILENT: ToneSink = {
  tone() {},
  tune: (notes, bpm = 120) => tuneMs(notes, bpm),
  samples() {},
  volume() {},
};

export class Speaker {
  /** performance.now() until which it plays. */
  until = 0;
  hz = 0;
  vol = 40;
  label = "";
  readonly out: ToneSink;

  constructor(out: ToneSink = SILENT) {
    this.out = out;
  }

  busy(): boolean {
    return performance.now() < this.until;
  }

  /** The echo guard: loud now, or in the last `ms`. */
  recentlyLoud(ms = 200): boolean {
    return performance.now() < this.until + ms;
  }

  play(ms: number, hz = 0, label = ""): void {
    this.until = Math.max(this.until, performance.now() + ms);
    this.hz = hz;
    this.label = label;
  }

  stop(): void {
    this.until = 0;
  }

  tune(notes: string, bpm = 220, wave: Wave = "triangle"): number {
    const parsed = parseTune(notes, bpm);
    const ms = parsed.reduce((s, n) => s + n.ms, 0);
    this.play(ms, parsed[0]?.hz ?? 0);
    this.out.tune(notes, bpm, wave);
    return ms;
  }

  beep(hz = 440, ms = 300, wave: Wave = "sine"): void {
    this.play(ms, hz);
    this.out.tone(hz, ms, wave);
  }

  setVolume(vol: number): void {
    this.vol = vol;
    this.out.volume(vol);
  }
}
