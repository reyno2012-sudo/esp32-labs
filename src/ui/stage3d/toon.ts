// Flat, illustrated shading: three tones per colour (lit, mid, shade), like a hand-coloured
// drawing. Pair with Stage3d.outline() for the ink lines.
import type * as Three from "three";
import { definePalette } from "@/lib/palette";
import type { ThreeModule } from "./stage3d";

const light = definePalette({ white: "--test-w" });

const ramps = new WeakMap<ThreeModule, Three.DataTexture>();

function ramp(T: ThreeModule): Three.DataTexture {
  let tex = ramps.get(T);
  if (!tex) {
    tex = new T.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, T.RedFormat);
    tex.minFilter = tex.magFilter = T.NearestFilter;
    tex.needsUpdate = true;
    ramps.set(T, tex);
  }
  return tex;
}

/** A toon material in one of the design's colours (a resolved CSS colour string). */
export function toon(
  T: ThreeModule,
  color: string,
  extra: Three.MeshToonMaterialParameters = {},
): Three.MeshToonMaterial {
  return new T.MeshToonMaterial({ color: new T.Color(color), gradientMap: ramp(T), ...extra });
}

/** A soft round glow (for LEDs), drawn once into a small canvas. */
export function glowTexture(T: ThreeModule): Three.CanvasTexture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // White fading out: the sprite's colour comes from its material.
    g.addColorStop(0, light().white);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new T.CanvasTexture(c);
}
