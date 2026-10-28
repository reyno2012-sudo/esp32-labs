// Scene 3: fireworks. Rockets rise, burst into 70–120 sparks, and every pixel fades by 13/16
// each frame, which draws the trails.
import { hsv, type Rgb } from "../color";
import { H, type Scene, W } from "./scene-types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  readonly max: number;
  readonly hue: number;
  readonly rocket: boolean;
}

const ROCKET: Rgb = [255, 240, 210];

export function createFireworks(random: () => number = Math.random): Scene {
  const trail = new Float32Array(W * H * 3);
  let parts: Particle[] = [];
  let nextLaunch = 0;
  let img: ImageData | null = null;
  const rnd = (a: number, b: number) => a + random() * (b - a);

  function plot(x: number, y: number, c: Rgb, size: number) {
    const x0 = x | 0;
    const y0 = y | 0;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const X = x0 + i;
        const Y = y0 + j;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const k = (Y * W + X) * 3;
        trail[k] = c[0];
        trail[k + 1] = c[1];
        trail[k + 2] = c[2];
      }
    }
  }

  function burst(p: Particle, into: Particle[]) {
    const n = rnd(70, 120) | 0;
    for (let s = 0; s < n; s++) {
      const a = rnd(0, 6.283);
      const sp = rnd(25, 115);
      const l = rnd(1.1, 2.1);
      into.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: l,
        max: l,
        hue: (p.hue + rnd(-0.05, 0.05) + 1) % 1,
        rocket: false,
      });
    }
  }

  return {
    name: "Fireworks",
    reset() {
      trail.fill(0);
      parts = [];
      nextLaunch = 0;
    },
    draw(g, C, t, frameDt) {
      const dt = Math.min(frameDt, 0.05);
      for (let k = 0; k < trail.length; k++) trail[k] = (trail[k] ?? 0) * 0.8125;
      if (t >= nextLaunch) {
        parts.push({
          x: rnd(40, W - 40),
          y: H,
          vx: rnd(-25, 25),
          vy: -rnd(150, 205),
          life: 2,
          max: 2,
          hue: random(),
          rocket: true,
        });
        nextLaunch = t + rnd(0.35, 0.9);
      }
      const born: Particle[] = [];
      for (const p of parts) {
        p.vy += 95 * dt;
        if (!p.rocket) {
          p.vx *= 0.985;
          p.vy *= 0.985;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.rocket) {
          plot(p.x, p.y, ROCKET, 2);
          if (p.vy > -25) {
            p.life = 0;
            burst(p, born);
          }
          continue;
        }
        const k = Math.max(0, p.life / p.max);
        plot(p.x, p.y, hsv(p.hue, 1 - 0.47 * (1 - k) * (1 - k), k), k > 0.55 ? 2 : 1);
      }
      parts = parts.filter((p) => p.life > 0).concat(born);

      img ??= g.createImageData(W, H);
      const px = img.data;
      for (let k = 0, o = 0; k < trail.length; k += 3, o += 4) {
        px[o] = trail[k] ?? 0;
        px[o + 1] = trail[k + 1] ?? 0;
        px[o + 2] = trail[k + 2] ?? 0;
        px[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return { text: `${parts.length} particles`, color: C.muted };
    },
  };
}
