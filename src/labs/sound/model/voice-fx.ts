// fx.h in TypeScript: the parrot's voices (S8), applied to a recording of samples in -1..1.

export type VoiceFx = "normal" | "chipmunk" | "giant" | "robot" | "echo" | "reverse";

export const VOICE_FX: readonly (readonly [VoiceFx, string])[] = [
  ["normal", "just as you said it"],
  ["chipmunk", "1.5x faster = higher"],
  ["giant", "0.7x slower = deeper"],
  ["robot", "ring modulator + bitcrush"],
  ["echo", "220 ms echo, 45 % feedback"],
  ["reverse", "backwards"],
];

/** Playback speed of each voice (pitch follows speed). */
export const fxSpeed = (fx: VoiceFx) => (fx === "chipmunk" ? 1.5 : fx === "giant" ? 0.7 : 1);

export function applyVoiceFx(x: Float32Array, rate: number, fx: VoiceFx): Float32Array {
  if (fx === "reverse") return Float32Array.from(x).reverse();
  if (fx === "robot") {
    const out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++)
      out[i] = Math.round((x[i] ?? 0) * Math.sin((2 * Math.PI * 50 * i) / rate) * 32) / 32;
    return out;
  }
  if (fx === "echo") {
    const d = Math.round(0.22 * rate);
    const out = new Float32Array(x.length + Math.round(1.5 * rate));
    for (let i = 0; i < out.length; i++)
      out[i] = (x[i] ?? 0) + (i >= d ? (out[i - d] ?? 0) * 0.45 : 0);
    return out;
  }
  return x;
}

/** A canned "voice": two syllables of buzzing vocal folds shaped by vowel formants, at 16 kHz. */
export function cannedVoice(): { samples: Float32Array; rate: number } {
  const rate = 16000;
  const n = Math.round(1.1 * rate);
  const out = new Float32Array(n);
  const syllables: readonly (readonly [number, number, number, number])[] = [
    [0.08, 0.45, 700, 1200],
    [0.55, 1.0, 400, 2000],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let v = 0;
    for (const [a, b, f1, f2] of syllables) {
      if (t < a || t > b) continue;
      const env = Math.sin(((t - a) / (b - a)) * Math.PI) ** 0.6;
      const f0 = 150 + 30 * Math.sin(t * 5);
      for (let h = 1; h < 30; h++) {
        const f = h * f0;
        const w =
          Math.exp(-(((f - f1) / 140) ** 2)) + 0.6 * Math.exp(-(((f - f2) / 200) ** 2)) + 0.05;
        v += (env * w * Math.sin(2 * Math.PI * f * t)) / h ** 0.5;
      }
    }
    out[i] = v * 0.12;
  }
  return { samples: out, rate };
}

/** Scales a recording so its loudest sample is at 0.9 (made louder, like the board does). */
export function normalise(x: Float32Array): Float32Array {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const k = m > 1e-4 ? 0.9 / m : 1;
  return x.map((v) => v * k);
}
