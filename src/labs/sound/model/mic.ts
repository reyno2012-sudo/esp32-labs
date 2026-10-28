// A pretend KY-037 (or INMP441) + the board's sampler + its level meter. The signal is made in
// millivolts at the AO pin (the capsule has no amplifier: talking is a few mV, a clap a few
// hundred), then quantised by the ADC at the chosen attenuation, the bias removed, ×16 to int16,
// frames of 64, the level meter. Every preview reacts to the clap / talk / whistle buttons the way
// the board reacts to your hands.
import { type Atten, LevelMeter, SND_TOP } from "./level";
import { gauss } from "./random";
import { Speaker, type ToneSink } from "./speaker";

export type MicMode = "quiet" | "talk" | "shout" | "whistle" | "music";

/** One 64-sample frame, as the sampler hands it to a lab. */
export interface MicFrame {
  readonly rms: number;
  readonly peak: number;
  /** Running sample number just after the frame. */
  readonly end: number;
  /** DO was high during the frame. */
  readonly do: boolean;
}

export interface MicOptions {
  biasMv?: number;
  potMv?: number;
  digital?: boolean;
  /** The lab hears its own speaker (no echo guard). */
  hearSpeaker?: boolean;
  mode?: MicMode;
  /** The whistle's pitch over time (default: a slow slide around 1.4 kHz). */
  whistleHz?: (t: number) => number;
  /** Where the speaker's sounds go. */
  out?: ToneSink;
}

const RING = 32768;

export class Mic {
  readonly rate = 16000;
  readonly ring = new Float32Array(RING);
  /** Samples written so far. */
  w = 0;
  /** Milliseconds of sound in frames. */
  ms = 0;
  /** Seconds of sound sampled. */
  t = 0;
  biasMv: number;
  atten: Atten = 12;
  potMv: number;
  digital: boolean;
  hearSpeaker: boolean;
  readonly spk: Speaker;
  mode: MicMode;
  until = 0;
  claps: number[] = [];
  dc: number | null = null;
  rawLow = 0;
  rawHigh = 0;
  lastRaw = 0;
  lastMv = 0;
  doHigh = false;
  doRises = 0;
  readonly level = new LevelMeter();
  onFrame: ((frame: MicFrame, ms: number) => void) | null = null;
  readonly #whistleHz: ((t: number) => number) | undefined;
  #ph = 0;
  #ph2 = 0;
  #ph3 = 0;
  #hiss = 0;
  #lo = 4095;
  #hi = 0;
  #n = 0;
  #doSeen = false;
  #fDo = false;
  #sumSq = 0;
  #peak = 0;
  #inChunk = 0;

  constructor(o: MicOptions = {}) {
    this.biasMv = o.biasMv ?? 1450;
    this.potMv = o.potMv ?? 30;
    this.digital = Boolean(o.digital);
    this.hearSpeaker = Boolean(o.hearSpeaker);
    this.mode = o.mode ?? "quiet";
    this.#whistleHz = o.whistleHz;
    this.spk = new Speaker(o.out);
  }

  top(): number {
    return SND_TOP[this.atten];
  }

  mvPerStep(): number {
    return this.top() / 4095;
  }

  toMv(raw: number): number {
    return Math.round((raw * this.top()) / 4095);
  }

  clap(delay = 0): void {
    this.claps.push(this.t + delay);
  }

  say(mode: MicMode, secs = 0): void {
    this.mode = mode;
    this.until = secs ? this.t + secs : 0;
  }

  /** The newest n samples, oldest first. */
  latest(n: number): Float32Array {
    const out = new Float32Array(n);
    const w = this.w;
    for (let i = 0; i < n; i++) out[i] = this.ring[(w - n + i + RING * 4) % RING] ?? 0;
    return out;
  }

  /** The voltage on AO above the bias right now, in mV. */
  #signal(): number {
    const t = this.t;
    const dt = 1 / this.rate;
    this.#hiss = gauss() * 0.3;
    let v = this.#hiss;
    const md = this.mode;
    if (md === "talk" || md === "shout") {
      const f0 = 150 + 25 * Math.sin(2 * Math.PI * 0.6 * t);
      const syl =
        Math.max(0, Math.sin(2 * Math.PI * 2.8 * t)) ** 1.5 *
        (0.55 + 0.45 * Math.sin(2 * Math.PI * 0.37 * t + 1));
      this.#ph += 2 * Math.PI * f0 * dt;
      const ph = this.#ph;
      v +=
        syl *
        (md === "shout" ? 70 : 6) *
        (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph) + 0.2 * Math.sin(5 * ph));
    } else if (md === "whistle") {
      const f = this.#whistleHz
        ? this.#whistleHz(t)
        : 1400 + 250 * Math.sin(2 * Math.PI * 0.35 * t);
      this.#ph2 += 2 * Math.PI * f * dt;
      v += 14 * Math.sin(this.#ph2);
    } else if (md === "music") {
      const beat = (t * 2) % 1; // 120 BPM
      this.#ph += 2 * Math.PI * 220 * dt;
      this.#ph2 += 2 * Math.PI * 330 * dt;
      this.#ph3 += 2 * Math.PI * 55 * dt;
      v +=
        60 * (Math.sin(this.#ph) * 0.6 + Math.sin(this.#ph2) * 0.4) +
        160 * Math.exp(-beat / 0.06) * Math.sin(this.#ph3);
    }
    for (const c of this.claps) {
      const d = t - c;
      if (d >= 0 && d < 0.15) v += gauss() * 220 * Math.exp(-d / 0.014);
    }
    // The mic hears the board's own speaker (that's what the echo guard is for).
    if (this.spk.busy() && this.spk.hz) {
      this.#ph3 += 2 * Math.PI * this.spk.hz * dt;
      v += 25 * Math.sin(this.#ph3) * (this.spk.vol / 40) ** 2;
    }
    return v;
  }

  /** Samples `dtSec` of sound (at most 0.25 s per call). */
  step(dtSec: number): void {
    const n = Math.min(Math.round(dtSec * this.rate), 4000);
    const top = this.top();
    for (let i = 0; i < n; i++) {
      this.t += 1 / this.rate;
      if (this.until && this.t > this.until) {
        this.mode = "quiet";
        this.until = 0;
      }
      const sig = this.#signal();
      const mv = this.biasMv + sig;
      // KY-037: the ADC measures bias + wave in 4096 steps (+ its own noise, about a step).
      // INMP441: its own 24-bit converter sends the wave as numbers, far below the ADC's hiss.
      const raw = this.digital
        ? 2048
        : Math.max(0, Math.min(4095, Math.round((mv / top) * 4095 + gauss() * 0.9)));
      if (this.dc === null) this.dc = raw;
      this.dc += (raw - this.dc) / 4096;
      const s = this.digital
        ? Math.max(-32768, Math.min(32767, (sig - this.#hiss) * 64 + gauss() * 1.5))
        : Math.max(-32768, Math.min(32767, (raw - this.dc) * 16));
      this.ring[this.w % RING] = s;
      this.w++;
      this.lastRaw = raw;
      this.lastMv = mv;
      this.#lo = Math.min(this.#lo, raw);
      this.#hi = Math.max(this.#hi, raw);
      if (++this.#n >= this.rate / 10) {
        this.rawLow = this.#lo;
        this.rawHigh = this.#hi;
        this.#lo = 4095;
        this.#hi = 0;
        this.#n = 0;
      }
      // The LM393: AO against the pot's voltage. Each wave crest over the line is one rising edge.
      const high = !this.digital && sig > this.potMv;
      if (high && !this.doHigh) this.doRises++;
      this.doHigh = high;
      if (high) {
        this.#doSeen = true;
        this.#fDo = true;
      }
      this.#sumSq += s * s;
      this.#peak = Math.max(this.#peak, Math.abs(s));
      if (++this.#inChunk === 64) {
        const rms = Math.sqrt(this.#sumSq / 64);
        this.ms += 64000 / this.rate;
        this.level.push(rms, this.ms);
        // The echo guard: no frames for the lab while the speaker is loud (and 200 ms after).
        if (this.onFrame && (this.hearSpeaker || !this.spk.recentlyLoud(200)))
          this.onFrame({ rms, peak: this.#peak, end: this.w, do: this.#fDo }, this.ms);
        this.#sumSq = 0;
        this.#peak = 0;
        this.#inChunk = 0;
        this.#fDo = false;
      }
    }
    this.claps = this.claps.filter((c) => this.t - c < 0.2);
  }

  /** The INMP441's level in dB SPL (RMS dBFS + 111, from its datasheet). */
  spl(): number {
    return this.level.fast + 111;
  }

  /** The DO lamp: lit if DO was high at any time since the last look (LED2 on the module looks the same). */
  takeDo(): boolean {
    const seen = this.#doSeen || this.doHigh;
    this.#doSeen = false;
    return seen;
  }
}
