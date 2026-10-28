// One frame of the chain panel: the pipeline with a dot travelling along it, the selected
// stage drawn live, and its value line.
import type { ScopePalette } from "@/lib/canvas";
import { labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { STEPS } from "./chain-data";
import { stageAdc, stageAir, stageAo, stageCapsule } from "./chain-stages-a";
import { stageBias, stageDb, stageDma, stageRing } from "./chain-stages-b";
import type { ChainSim, StageCtx } from "./chain-types";

const STAGES: readonly ((ctx: StageCtx) => string)[] = [
  stageAir,
  stageCapsule,
  stageAo,
  stageAdc,
  stageDma,
  stageRing,
  stageBias,
  stageDb,
];

export function drawChain(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  at: number,
  sim: ChainSim,
  t: number,
  dt: number,
  reduce: boolean,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 320);
  STEPS.forEach((id, i) => {
    const x = 8 + i * 84;
    const on = i === at;
    g.fillStyle = on ? C.pink : C.dim;
    g.globalAlpha = on ? 0.22 : 0.6;
    g.beginPath();
    g.roundRect(x, 10, 78, 34, 7);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = on ? C.pink : C.dim;
    g.lineWidth = on ? 2 : 1;
    g.beginPath();
    g.roundRect(x, 10, 78, 34, 7);
    g.stroke();
    g.lineWidth = 1;
    W(x + 39, 31, tr(`chain.steps.${id}.box`), on ? C.ink : C.muted, mono(11, on), "center");
  });
  const dotX = 8 + ((t * 0.35) % 1) * 672;
  g.fillStyle = C.pink;
  g.beginPath();
  g.arc(dotX, 50, 3, 0, 7);
  g.fill();
  const stage = STAGES[at] ?? stageAir;
  // The last 40 ms.
  const val = stage({ g, C, T, W, tr, mic: sim.mic, sim, s: sim.mic.latest(640), t, dt, reduce });
  g.fillStyle = C.dim;
  g.fillRect(0, 294, 680, 1);
  W(12, 312, val, C.ink);
}
