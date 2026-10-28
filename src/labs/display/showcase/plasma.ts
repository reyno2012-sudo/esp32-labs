// Scene 2: a plasma, every one of the 54 400 pixels computed per frame from sine tables.
import { H, type Scene, W } from "./scene-types";

const SIN = Array.from({ length: 256 }, (_, i) =>
  Math.round(128 + 127 * Math.sin((i * 2 * Math.PI) / 256)),
);
const PAL = Array.from({ length: 256 }, (_, i) => {
  const f = i / 256;
  const ch = (o: number) => 255 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (f + o)));
  return [ch(0), ch(0.18) * 0.75, ch(0.42)] as const;
});
const sin = (i: number) => SIN[i & 255] ?? 128;

export function createPlasma(): Scene {
  let img: ImageData | null = null;
  return {
    name: "Plasma",
    draw(g, C, t) {
      img ??= g.createImageData(W, H);
      const px = img.data;
      const t1 = (t * 47) & 255;
      const t2 = (t * 29) & 255;
      const sh = (t * 21) & 255;
      const cx = Math.floor(W / 2 + 110 * Math.sin(t * 0.63));
      const cy = Math.floor(H / 2 + 55 * Math.cos(t * 0.81));
      let o = 0;
      for (let y = 0; y < H; y++) {
        const rw = sin(y * 3 - t2);
        const dy = y - cy;
        for (let x = 0; x < W; x++) {
          const dx = x - cx;
          const v = sin(x * 2 + t1) + rw + sin(x + y + t2) + sin(((dx * dx + dy * dy) >> 7) - t1);
          const c = PAL[((v >> 2) + sh) & 255];
          if (c) {
            px[o] = c[0];
            px[o + 1] = c[1];
            px[o + 2] = c[2];
          }
          px[o + 3] = 255;
          o += 4;
        }
      }
      g.putImageData(img, 0, 0);
      return { text: `${W * H} pixels computed every frame`, color: C.ink };
    },
  };
}
