/** The firmware's colour wheel (Adafruit's wheel()): 0..255 → an RGB triple. */
export function wheel(position: number): readonly [number, number, number] {
  const pos = position & 255;
  if (pos < 85) return [255 - pos * 3, pos * 3, 0];
  if (pos < 170) return [0, 255 - (pos - 85) * 3, (pos - 85) * 3];
  return [(pos - 170) * 3, 0, 255 - (pos - 170) * 3];
}
