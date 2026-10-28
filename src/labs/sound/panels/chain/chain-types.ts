import type { ScopePalette } from "@/lib/canvas";
import type { TextFn } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import type { Mic } from "../../model/mic";

/** The chain panel's moving parts, kept between frames. */
export interface ChainSim {
  readonly mic: Mic;
  talking: boolean;
  dmaFill: number;
  flying: number;
}

export interface StageCtx {
  readonly g: CanvasRenderingContext2D;
  readonly C: ScopePalette;
  readonly T: TextFn;
  /** Writes translated annotations in the page's direction. */
  readonly W: TextFn;
  readonly tr: SoundT;
  readonly mic: Mic;
  readonly sim: ChainSim;
  /** The last 40 ms of samples. */
  readonly s: Float32Array;
  readonly t: number;
  readonly dt: number;
  readonly reduce: boolean;
}
