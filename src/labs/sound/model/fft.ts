// kit/lib/sound-kit/src/spectrum.h in TypeScript: Hann window, radix-2 FFT, magnitudes, peak +
// parabola, log-spaced bands.

export interface FftPeak {
  readonly k: number;
  /** Where the true peak sits between bins, -0.5..0.5. */
  readonly shift: number;
  readonly hz: number;
  readonly db: number;
  /** How far the peak stands above the average of the range, dB. */
  readonly clarity: number;
}

export class Fft {
  readonly n: number;
  /** Magnitudes of the last run, full scale = 1. */
  readonly mag: Float32Array;
  readonly #cos: Float32Array;
  readonly #sin: Float32Array;
  readonly #win: Float32Array;
  readonly #rev: Uint16Array;
  readonly #re: Float32Array;
  readonly #im: Float32Array;

  constructor(n: number) {
    this.n = n;
    const bits = Math.log2(n);
    this.#cos = new Float32Array(n / 2);
    this.#sin = new Float32Array(n / 2);
    this.#win = new Float32Array(n);
    this.#rev = new Uint16Array(n);
    for (let i = 0; i < n / 2; i++) {
      this.#cos[i] = Math.cos((2 * Math.PI * i) / n);
      this.#sin[i] = -Math.sin((2 * Math.PI * i) / n);
    }
    for (let i = 0; i < n; i++) {
      this.#win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.#rev[i] = r;
    }
    this.#re = new Float32Array(n);
    this.#im = new Float32Array(n);
    this.mag = new Float32Array(n / 2);
  }

  /** Transforms n int16 samples (windowed by default) into `mag`. */
  run(s: ArrayLike<number>, windowed = true): void {
    const { n } = this;
    const re = this.#re;
    const im = this.#im;
    for (let i = 0; i < n; i++) {
      const r = this.#rev[i] ?? 0;
      re[r] = (s[i] ?? 0) * (windowed ? (this.#win[i] ?? 0) : 1);
      im[r] = 0;
    }
    for (let half = 1, step = n / 2; half < n; half *= 2, step /= 2)
      for (let st = 0; st < n; st += 2 * half)
        for (let k = 0; k < half; k++) {
          const a = st + k;
          const b = a + half;
          const c = this.#cos[k * step] ?? 0;
          const sn = this.#sin[k * step] ?? 0;
          const rb = re[b] ?? 0;
          const ib = im[b] ?? 0;
          const ra = re[a] ?? 0;
          const ia = im[a] ?? 0;
          const tr = rb * c - ib * sn;
          const ti = rb * sn + ib * c;
          re[b] = ra - tr;
          im[b] = ia - ti;
          re[a] = ra + tr;
          im[a] = ia + ti;
        }
    const scale = (windowed ? 4 : 2) / (n * 32768);
    for (let k = 0; k < n / 2; k++) this.mag[k] = Math.hypot(re[k] ?? 0, im[k] ?? 0) * scale;
  }

  m(k: number): number {
    return this.mag[k] ?? 0;
  }

  /** dBFS of bin k. */
  db(k: number): number {
    const m = this.m(k);
    return m < 1e-6 ? -120 : 20 * Math.log10(m);
  }

  /** The strongest bin between lo and hi Hz, refined with a parabola through its neighbours. */
  peak(rate: number, lo: number, hi: number): FftPeak {
    const { n } = this;
    const k0 = Math.max(1, Math.floor((lo * n) / rate));
    const k1 = Math.min(n / 2 - 2, Math.floor((hi * n) / rate));
    let best = k0;
    let sum = 0;
    for (let k = k0; k <= k1; k++) {
      sum += this.m(k);
      if (this.m(k) > this.m(best)) best = k;
    }
    const a = this.m(best - 1);
    const b = this.m(best);
    const c = this.m(best + 1);
    const den = a - 2 * b + c;
    const shift = den ? (0.5 * (a - c)) / den : 0;
    const avg = sum / (k1 - k0 + 1);
    return {
      k: best,
      shift,
      hz: ((best + shift) * rate) / n,
      db: this.db(best),
      clarity: avg > 1e-9 ? 20 * Math.log10(b / avg) : 0,
    };
  }

  /** `count` bands spaced like a piano between lo and hi Hz: each band's loudest bin in dBFS. */
  bands(rate: number, lo: number, hi: number, count: number): number[] {
    const { n } = this;
    return Array.from({ length: count }, (_, i) => {
      const f0 = lo * Math.pow(hi / lo, i / count);
      const f1 = lo * Math.pow(hi / lo, (i + 1) / count);
      const k0 = Math.max(1, Math.floor((f0 * n) / rate));
      const k1 = Math.max(k0, Math.min(n / 2 - 1, Math.floor((f1 * n) / rate)));
      let m = 0;
      for (let k = k0; k <= k1; k++) m = Math.max(m, this.m(k));
      return m < 1e-6 ? -120 : 20 * Math.log10(m);
    });
  }
}

/** The Hann window's height at sample i of n. */
export const hann = (i: number, n: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
