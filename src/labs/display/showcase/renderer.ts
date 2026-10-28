// The showcase's screen: the four scenes, the scene banner and the fps HUD, drawn every frame.
import { DISPLAY_FONT, MONO_FONT, type ScopePalette } from "@/lib/canvas";
import { parseColor, rgb } from "../color";
import { createDashboard } from "./dashboard";
import { createFireworks } from "./fireworks";
import { createPlasma } from "./plasma";
import { H, type Scene, type ShowcaseColors, W } from "./scene-types";
import { drawTorus } from "./torus";

export const SCENE_NAMES = ["3D torus", "Plasma", "Fireworks", "Live dashboard"] as const;
export const BANNER_MS = 2000;

/** The scope palette as RGB triples, re-parsed only when the palette object changes (theme). */
const parsed = new WeakMap<ScopePalette, ShowcaseColors>();
export function showcaseColors(P: ScopePalette): ShowcaseColors {
  let c = parsed.get(P);
  if (!c) {
    c = {
      night: parseColor(P.paper),
      ink: parseColor(P.ink),
      muted: parseColor(P.muted),
      dim: parseColor(P.dim),
      teal: parseColor(P.teal),
      amber: parseColor(P.amber),
      coral: parseColor(P.coral),
      indigo: parseColor(P.indigo),
    };
    parsed.set(P, c);
  }
  return c;
}

/** What the HUD shows besides the scene. */
export interface HudInfo {
  readonly fps: number;
  readonly auto: boolean;
  /** Variation 2 only: the push button's level dot (undefined hides it). */
  readonly buttonDown?: boolean;
}

export class ShowcaseRenderer {
  readonly #scenes: readonly Scene[] = [
    { name: SCENE_NAMES[0], draw: drawTorus },
    createPlasma(),
    createFireworks(),
    createDashboard(),
  ];

  /** A scene starts fresh each time it is shown (fireworks clear their sky). */
  reset(scene: number): void {
    this.#scenes[scene]?.reset?.();
  }

  draw(
    g: CanvasRenderingContext2D,
    C: ShowcaseColors,
    scene: number,
    t: number,
    dt: number,
    sinceShown: number,
    hud: HudInfo,
  ): void {
    const s = this.#scenes[scene];
    if (!s) return;
    const label = s.draw(g, C, t, dt);
    if (label) {
      g.textAlign = "left";
      g.font = `9px ${MONO_FONT}`;
      g.fillStyle = rgb(label.color);
      g.fillText(label.text, 8, 15);
    }
    banner(g, C, `${scene + 1}/4  ${s.name}`, sinceShown);
    drawHud(g, C, hud);
  }
}

/** The pill that slides in from the top for 2 s when a scene starts. */
function banner(g: CanvasRenderingContext2D, C: ShowcaseColors, text: string, since: number) {
  if (since >= BANNER_MS) return;
  let k = since < 250 ? since / 250 : since > 1750 ? (BANNER_MS - since) / 250 : 1;
  k = 1 - (1 - k) * (1 - k);
  g.font = `700 13px ${DISPLAY_FONT}`;
  const w = g.measureText(text).width + 28;
  const x = (W - w) / 2;
  const y = -28 + 36 * k;
  g.fillStyle = rgb(C.ink);
  g.beginPath();
  g.roundRect(x, y, w, 28, 14);
  g.fill();
  g.fillStyle = rgb(C.night);
  g.textAlign = "left";
  g.fillText(text, x + 14, y + 19);
}

function drawHud(g: CanvasRenderingContext2D, C: ShowcaseColors, hud: HudInfo) {
  const text = `${hud.fps.toFixed(0)} fps in your browser${hud.auto ? "  auto" : ""}`;
  g.font = `9px ${MONO_FONT}`;
  g.fillStyle = rgb(C.night);
  g.fillRect(0, H - 13, g.measureText(text).width + 10, 13);
  g.fillStyle = rgb(C.amber);
  g.textAlign = "left";
  g.fillText(text, 4, H - 3);
  if (hud.buttonDown !== undefined) {
    g.beginPath();
    g.arc(W - 10, H - 10, 5, 0, 7);
    g.fillStyle = rgb(hud.buttonDown ? C.teal : C.dim);
    g.fill();
  }
}
