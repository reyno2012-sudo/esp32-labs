import type { Rgb } from "../color";

export const W = 320;
export const H = 170;

/** The scope tokens as RGB triples: the scenes blend them per face and per pixel. */
export interface ShowcaseColors {
  readonly night: Rgb;
  readonly ink: Rgb;
  readonly muted: Rgb;
  readonly dim: Rgb;
  readonly teal: Rgb;
  readonly amber: Rgb;
  readonly coral: Rgb;
  readonly indigo: Rgb;
}

/** The small line a scene prints top-left (faces drawn, particles...). */
export interface SceneLabel {
  readonly text: string;
  readonly color: Rgb;
}

/** One showcase scene; `t` restarts at 0 when the scene is shown. */
export interface Scene {
  readonly name: string;
  draw(g: CanvasRenderingContext2D, C: ShowcaseColors, t: number, dt: number): SceneLabel | void;
  /** Forget accumulated state (trails, particles) when the scene is shown again. */
  reset?(): void;
}
