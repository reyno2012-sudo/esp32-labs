// The comparator panel: AO over the last 4 s with the pot's line, DO under it, LED2 and the advice
// S1's comparator view gives.
import type { ScopePalette } from "@/lib/canvas";
import { labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { COLS, type ComparatorSim, yMv } from "./comparator-sim";

export function drawComparator(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  sim: ComparatorSim,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  const { mic, mvCol, doCol, head } = sim;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 290);
  W(20, 18, tr("comparator.axis"), C.muted);
  for (const v of [5, 50, 200]) T(96, yMv(v) + 4, `${v} mV`, C.muted, mono(9), "right");
  g.fillStyle = C.dim;
  g.fillRect(100, yMv(0), COLS, 1);
  for (let i = 0; i < COLS; i++) {
    const k = (head + i) % COLS;
    const lo = mvCol[k * 2] ?? 0;
    const hi = mvCol[k * 2 + 1] ?? 0;
    g.fillStyle = doCol[k] ? C.amber : C.pink;
    g.fillRect(100 + i, yMv(hi), 1, Math.max(1, yMv(lo) - yMv(hi)));
  }
  g.setLineDash([6, 4]);
  g.strokeStyle = C.ink;
  g.beginPath();
  g.moveTo(100, yMv(mic.potMv));
  g.lineTo(660, yMv(mic.potMv));
  g.stroke();
  g.setLineDash([]);
  W(664, yMv(mic.potMv) - 6, tr("comparator.pot", { mv: mic.potMv }), C.ink, mono(11, true), "right");
  T(20, 238, "DO", C.amber, mono(12, true));
  g.strokeStyle = C.amber;
  g.beginPath();
  for (let i = 0; i < COLS; i++) {
    const y = doCol[(head + i) % COLS] ? 222 : 246;
    if (i) g.lineTo(100 + i, y);
    else g.moveTo(100, y);
  }
  g.stroke();
  // LED2 on the module.
  const lit = mic.takeDo();
  g.fillStyle = lit ? C.amber : C.dim;
  g.beginPath();
  g.arc(40, 120, 14, 0, 7);
  g.fill();
  T(40, 150, "LED2", C.muted, undefined, "center");
  W(40, 166, tr("comparator.perSecond", { n: sim.rps }), C.ink, undefined, "center");
  // The same advice as S1's comparator view.
  let highCols = 0;
  let loudest = 0;
  for (let i = 0; i < COLS; i++) {
    highCols += doCol[i] ?? 0;
    loudest = Math.max(loudest, mvCol[i * 2 + 1] ?? 0);
  }
  const hint =
    mic.potMv < 2 || highCols > COLS * 0.6
      ? "alwaysOn"
      : highCols === 0 && loudest > 40
        ? "underLine"
        : highCols === 0
          ? "waiting"
          : "tuned";
  W(100, 278, tr(`comparator.hint.${hint}`), hint === "tuned" ? C.teal : C.amber);
}
