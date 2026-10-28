// Colour maths for the showcase scenes, which blend token colours per pixel and per face.

export type Rgb = readonly [number, number, number];

/** A resolved CSS colour ("#rrggbb", "#rgb" or "rgb(r g b)") as an RGB triple. */
export function parseColor(css: string): Rgb {
  const value = css.trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full =
      hex.length === 3 || hex.length === 4
        ? [...hex.slice(0, 3)].map((c) => c + c).join("")
        : hex.slice(0, 6);
    const channel = (i: number) => Number.parseInt(full.slice(i, i + 2), 16) || 0;
    return [channel(0), channel(2), channel(4)];
  }
  const nums = value.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
}

/** Linear blend from a to b; k = 0 gives a. */
export const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * k),
  Math.round(a[1] + (b[1] - a[1]) * k),
  Math.round(a[2] + (b[2] - a[2]) * k),
];

export const rgb = (c: Rgb) => `rgb(${c[0]},${c[1]},${c[2]})`;

/** h, s, v in 0..1 → 0..255 channels (the firmware's hsv()). */
export function hsv(h: number, s: number, v: number): Rgb {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const sectors: readonly Rgb[] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ];
  const [r, g, b] = sectors[((i % 6) + 6) % 6] ?? [v, t, p];
  return [r * 255, g * 255, b * 255];
}
