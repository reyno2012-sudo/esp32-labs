// S2 panel: a sound scene replayed through the level meter (fast, slow, peak hold, floor).
import type { ScopePalette } from "@/lib/canvas";
import { labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";
import { LevelMeter } from "../../model/level";

export type SceneKey = "talk" | "fan";

/** A scene's label lives in the catalogue under ballistics.scenes.<key>. */
interface Scene {
  readonly len: number;
  /** RMS per 4 ms frame (int16 units) at `s` seconds. The quiet is 20. */
  rms(s: number): number;
}

export const SCENES: Readonly<Record<SceneKey, Scene>> = {
  talk: {
    len: 14,
    rms: (s) => {
      let r = 20 + Math.random() * 6;
      if (s > 2 && s < 7)
        r +=
          Math.max(0, Math.sin(2 * Math.PI * 2.8 * s)) ** 1.5 *
          260 *
          (0.6 + 0.4 * Math.sin(s * 2.3));
      if (s >= 9 && s < 9.2) r += 9000 * Math.exp(-(s - 9) / 0.02);
      return r;
    },
  },
  fan: {
    len: 44,
    rms: (s) =>
      20 +
      Math.random() * 6 +
      (s > 4 && s < 34 ? 60 + Math.random() * 10 : 0) +
      (s >= 38 && s < 38.15 ? 6000 * Math.exp(-(s - 38) / 0.02) : 0),
  },
};

interface Point {
  s: number;
  inst: number;
  fast: number;
  slow: number;
  floor: number;
  peak: number;
}

export class Replay {
  readonly scene: SceneKey;
  readonly meter = new LevelMeter();
  readonly pts: Point[] = [];
  s = 0;

  constructor(scene: SceneKey, whole: boolean) {
    this.scene = scene;
    if (whole) while (this.s < SCENES[scene].len) this.advance(0.1);
  }

  advance(dtSec: number): void {
    const sc = SCENES[this.scene];
    const L = this.meter;
    for (let n = Math.round(dtSec / 0.004); n > 0 && this.s < sc.len; n--) {
      this.s += 0.004;
      L.push(sc.rms(this.s), this.s * 1000);
      if (Math.round(this.s / 0.004) % 10 === 0)
        this.pts.push({
          s: this.s,
          inst: L.inst,
          fast: L.fast,
          slow: L.slow,
          floor: L.floor,
          peak: L.peak,
        });
    }
  }
}

type Key = "inst" | "fast" | "slow" | "floor";

export function drawBallistics(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  r: Replay,
  tr: SoundT,
): string {
  const T = textWriter(g);
  const W = labelWriter(g);
  const sc = SCENES[r.scene];
  const small = mono(10);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 280);
  const x0 = 60;
  const w = 600;
  const yOf = (db: number) => 30 + ((-10 - db) / 70) * 210;
  const xOf = (ss: number) => x0 + (ss / sc.len) * w;
  for (const d of [-20, -40, -60, -80]) {
    g.fillStyle = C.dim;
    g.fillRect(x0, yOf(d), w, 1);
    T(x0 - 6, yOf(d) + 4, `${d}`, C.muted, small, "right");
  }
  T(x0 - 6, 18, "dBFS", C.muted, small, "right");
  const line = (k: Key, col: string, wd = 1.5, dash: number[] = []) => {
    g.strokeStyle = col;
    g.lineWidth = wd;
    g.setLineDash(dash);
    g.beginPath();
    r.pts.forEach((p, i) => (i ? g.lineTo(xOf(p.s), yOf(p[k])) : g.moveTo(xOf(p.s), yOf(p[k]))));
    g.stroke();
    g.setLineDash([]);
    g.lineWidth = 1;
  };
  g.globalAlpha = 0.45;
  line("inst", C.muted, 1);
  g.globalAlpha = 1;
  line("slow", C.amber, 2);
  line("fast", C.pink, 2);
  line("floor", C.teal, 2, [6, 4]);
  r.pts.forEach((p, i) => {
    if (i % 6 === 0) {
      g.fillStyle = C.ink;
      g.fillRect(xOf(p.s) - 1, yOf(p.peak), 3, 1.5);
    }
  });
  g.fillStyle = C.ink;
  g.fillRect(xOf(r.s), 26, 1, 216);
  const last = r.pts.at(-1) ?? { fast: -96, floor: 0 };
  const legend: readonly (readonly [string, string])[] = [
    [tr("ballistics.legend.inst"), C.muted],
    [tr("ballistics.legend.fast"), C.pink],
    [tr("ballistics.legend.slow"), C.amber],
    [tr("ballistics.legend.floor"), C.teal],
    [tr("ballistics.legend.peak"), C.ink],
  ];
  legend.forEach(([l, col], i) => {
    g.fillStyle = col;
    g.fillRect(x0 + i * 120, 258, 14, 4);
    W(x0 + i * 120 + 20, 264, l, C.ink, small);
  });
  W(
    x0 + w,
    18,
    tr("ballistics.now", { s: r.s, db: Math.max(0, last.fast - last.floor) }),
    C.ink,
    undefined,
    "right",
  );
  return tr(`ballistics.caption.${r.scene}`);
}
