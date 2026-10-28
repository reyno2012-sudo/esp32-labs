// Sound in the browser, for the previews and panels: off until you switch it on (always with a
// click, so no AudioContext exists before a user gesture), always quiet. One output for the whole
// page, shared by every sound widget; it closes when the last of them unmounts.
import { createLogger, errorData } from "@/lib/logger";
import { type Adsr, DEFAULT_ADSR, type ToneSink, type Wave } from "../model/speaker";
import { parseTune } from "../model/tune";

const log = createLogger("sound-audio");
const BASE_GAIN = 0.12;

/** Something playing that can be cut short. */
export interface PlayingSound {
  stop(): void;
}

type AudioContextCtor = typeof AudioContext;
const contextCtor = (): AudioContextCtor | undefined =>
  typeof window === "undefined"
    ? undefined
    : (window.AudioContext ??
      (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);

class BrowserAudio implements ToneSink {
  #on = false;
  #ctx: AudioContext | null = null;
  #out: GainNode | null = null;
  #gain = BASE_GAIN;
  #users = 0;
  #listeners = new Set<() => void>();

  /** Whether the previews' sounds reach your speakers. */
  isOn = (): boolean => this.#on;

  /** Switch browser sound on or off. Call from a click handler only. */
  setOn(on: boolean): void {
    if (on === this.#on) return;
    this.#on = on;
    if (on) this.start();
    this.#emit();
  }

  /** Creates (or resumes) the AudioContext. Only ever reached after a click switched sound on. */
  start(): boolean {
    if (!this.#ctx) {
      const AC = contextCtor();
      if (!AC) return false;
      try {
        this.#ctx = new AC();
      } catch (error) {
        log.warn("AudioContext failed", errorData(error));
        return false;
      }
      this.#out = this.#ctx.createGain();
      this.#out.gain.value = this.#gain;
      this.#out.connect(this.#ctx.destination);
    }
    if (this.#ctx.state === "suspended") void this.#ctx.resume();
    return true;
  }

  #ready(): { c: AudioContext; out: GainNode } | null {
    if (!this.#on || !this.start() || !this.#ctx || !this.#out) return null;
    return { c: this.#ctx, out: this.#out };
  }

  tone(
    hz: number,
    ms: number,
    wave: Wave = "triangle",
    at = 0,
    adsr: Adsr = DEFAULT_ADSR,
    level = 1,
  ): void {
    const ready = hz > 0 ? this.#ready() : null;
    if (!ready) return;
    const { c, out } = ready;
    const t0 = c.currentTime + at;
    const [a, d, s, r] = [adsr[0] / 1000, adsr[1] / 1000, adsr[2], adsr[3] / 1000];
    const hold = Math.max(a + d, ms / 1000 - r);
    const g = c.createGain();
    g.connect(out);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(level, t0 + a);
    g.gain.linearRampToValueAtTime(level * s, t0 + a + d);
    g.gain.setValueAtTime(level * s, t0 + hold);
    g.gain.linearRampToValueAtTime(0, t0 + hold + r);
    if (wave === "noise") {
      const b = c.createBuffer(1, Math.max(1, Math.round(c.sampleRate * (hold + r))), c.sampleRate);
      const ch = b.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const n = c.createBufferSource();
      n.buffer = b;
      n.connect(g);
      n.start(t0);
      return;
    }
    const o = c.createOscillator();
    o.type = wave === "saw" ? "sawtooth" : wave;
    o.frequency.value = hz;
    o.connect(g);
    o.start(t0);
    o.stop(t0 + hold + r + 0.05);
  }

  tune(notes: string, bpm = 120, wave: Wave = "triangle"): number {
    let at = 0;
    for (const n of parseTune(notes, bpm)) {
      if (n.hz) this.tone(n.hz, n.ms * 0.95, wave, at / 1000);
      at += n.ms;
    }
    return at;
  }

  samples(samples: Float32Array, rate: number, speed = 1): PlayingSound | null {
    const ready = this.#ready();
    if (!ready || !samples.length) return null;
    const b = ready.c.createBuffer(1, samples.length, rate);
    b.getChannelData(0).set(samples);
    const src = ready.c.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = speed;
    src.connect(ready.out);
    src.start();
    return {
      stop: () => {
        try {
          src.stop();
        } catch {
          // already stopped
        }
      },
    };
  }

  volume(vol: number): void {
    // Squared, like the board.
    this.#gain = Math.min(0.3, BASE_GAIN * (vol / 40) ** 2);
    if (this.#out) this.#out.gain.value = this.#gain;
  }

  /** Decodes a recording (the parrot's microphone capture). */
  async decode(data: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.start() || !this.#ctx) throw new Error("This browser has no Web Audio.");
    return this.#ctx.decodeAudioData(data);
  }

  /** A widget that may make sound is mounted; the returned function releases it. */
  retain = (): (() => void) => {
    this.#users++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.#users > 0) return;
      // Nothing left that could play: stop everything and give the audio device back.
      const ctx = this.#ctx;
      this.#ctx = null;
      this.#out = null;
      this.#gain = BASE_GAIN;
      if (ctx)
        void ctx
          .close()
          .catch((error: unknown) => log.warn("AudioContext close failed", errorData(error)));
      if (this.#on) {
        this.#on = false;
        this.#emit();
      }
    };
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #emit() {
    this.#listeners.forEach((l) => l());
  }
}

/** The page's one browser audio output. */
export const browserAudio = new BrowserAudio();
