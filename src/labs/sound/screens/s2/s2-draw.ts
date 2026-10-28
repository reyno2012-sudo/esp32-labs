// S2's views on the 320×170 canvas.
import type { ScopePalette } from "@/lib/canvas";
import { B12, display, drawStat, levelColour, S8, textWriter } from "../../kit/draw";
import { sndLike } from "../../model/level";
import { type S2State, s2Value } from "./s2";

type G = CanvasRenderingContext2D;
const BIG = display(34);

export function drawS2(g: G, C: ScopePalette, view: number, t: number, st: S2State): void {
  const v = s2Value(st);
  if (view === 0 && st.units === "spl" && st.mic.digital) return drawSpl(g, C, st);
  if (view === 0) return drawMeter(g, C, st, v);
  if (view === 1) return drawMinute(g, C, st);
  if (view === 2) return drawDiary(g, C, st);
  drawAlarm(g, C, st, v, t);
}

/** The alarm line on a 0-60 dB graph, dotted. */
function graphLimit(
  g: G,
  C: ScopePalette,
  st: S2State,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const ly = y + h - (st.limit * h) / 60;
  for (let gx = x; gx < x + w; gx += 3) {
    g.fillStyle = C.coral;
    g.fillRect(gx, ly, 1, 1);
  }
}

/** dB SPL: the INMP441's datasheet sensitivity makes the number absolute. */
function drawSpl(g: G, C: ScopePalette, st: S2State): void {
  const T = textWriter(g);
  const L = st.mic.level;
  const spl = (st.slow ? L.slow : L.fast) + 111;
  const num = spl.toFixed(0);
  const col = spl < 70 ? C.teal : spl < 85 ? C.amber : C.coral;
  g.font = BIG;
  const nw = g.measureText(num).width;
  T(14, 76, num, col, BIG);
  T(20 + nw, 76, "dB SPL", C.muted, B12);
  T(20 + nw, 49, st.slow ? "slow (1 s)" : "fast (125 ms)", C.muted, S8);
  T(14, 93, "unweighted, +-2 dB", C.muted, S8);
  const x = 14;
  const y = 112;
  const w = 292;
  const h = 22;
  const xOf = (d: number) => x + ((Math.min(110, Math.max(30, d)) - 30) / 80) * w;
  g.fillStyle = C.dim;
  g.globalAlpha = 0.6;
  g.beginPath();
  g.roundRect(x, y, w, h, 3);
  g.fill();
  g.globalAlpha = 1;
  for (let d = 30; d < spl && d < 110; d += 1.5) {
    g.fillStyle = d < 70 ? C.teal : d < 85 ? C.amber : C.coral;
    g.fillRect(xOf(d), y + 2, 2, h - 4);
  }
  for (let j = y - 3; j < y + h + 3; j += 2) {
    g.fillStyle = C.coral;
    g.fillRect(xOf(st.splLimit), j, 1, 1);
  }
  const marks: readonly (readonly [number, string])[] = [
    [30, "whisper"],
    [60, "talk"],
    [85, "risk"],
    [100, "loud"],
  ];
  for (const [d, l] of marks) {
    g.fillStyle = C.muted;
    g.fillRect(xOf(d), y + h + 2, 1, 3);
    T(xOf(d) - 6, y + h + 13, `${d} ${l}`, C.muted, S8);
  }
}

function drawMeter(g: G, C: ScopePalette, st: S2State, v: number): void {
  const T = textWriter(g);
  const L = st.mic.level;
  const num = v.toFixed(0);
  g.font = BIG;
  const nw = g.measureText(num).width;
  T(14, 76, num, levelColour(C, v), BIG);
  T(20 + nw, 76, "dB", C.muted, B12);
  T(20 + nw, 49, st.slow ? "slow (1 s)" : "fast (125 ms)", C.muted, S8);
  T(14, 93, sndLike(v), C.ink, S8);
  T(14, 107, `above the quiet - quiet = ${L.floor.toFixed(0)} dBFS`, C.muted, S8);
  const x = 14;
  const y = 118;
  const w = 292;
  const h = 22;
  g.fillStyle = C.dim;
  g.globalAlpha = 0.6;
  g.beginPath();
  g.roundRect(x, y, w, h, 3);
  g.fill();
  g.globalAlpha = 1;
  const fill = Math.min(1, v / 60) * (w - 2);
  for (let i = 0; i < fill; i += 3) {
    g.fillStyle = levelColour(C, (i / (w - 2)) * 60);
    g.fillRect(x + 1 + i, y + 2, 2, h - 4);
  }
  g.fillStyle = C.ink;
  g.fillRect(x + 1 + Math.min(1, Math.max(0, L.peak - L.floor) / 60) * (w - 2), y, 1, h);
  const lx = x + 1 + (st.limit / 60) * (w - 2);
  for (let j = y - 3; j < y + h + 3; j += 2) {
    g.fillStyle = C.coral;
    g.fillRect(lx, j, 1, 1);
  }
  for (let d = 0; d <= 60; d += 10) {
    const tx = 15 + (d * 290) / 60;
    g.fillStyle = C.muted;
    g.fillRect(tx, 142, 1, 3);
    T(tx - (d ? 5 : 0), 154, String(d), C.muted, S8);
  }
  T(306, 113, `peak ${Math.max(0, L.peak - L.floor).toFixed(0)}`, C.ink, S8, "right");
  if (L.learning()) T(200, 49, "learning the quiet", C.amber, S8);
}

function drawMinute(g: G, C: ScopePalette, st: S2State): void {
  const T = textWriter(g);
  const x = 24;
  const y = 38;
  const w = 288;
  const h = 100;
  g.fillStyle = C.dim;
  g.fillRect(x, y + h, w, 1);
  for (let i = 0; i < st.mFilled; i++) {
    const a = st.minute[(st.mHead - st.mFilled + i + 240) % 240] ?? 0;
    const bh = Math.min(h, (a * h) / 60);
    if (bh) {
      g.fillStyle = levelColour(C, a);
      g.fillRect(x + (i * w) / 240, y + h - bh, Math.max(1, w / 240), bh);
    }
  }
  graphLimit(g, C, st, x, y, w, h);
  T(2, 43, "60", C.muted, S8);
  T(2, 77, "40", C.muted, S8);
  T(2, 110, "20", C.muted, S8);
  T(24, 151, "-60 s", C.muted, S8);
  T(312, 151, "now", C.muted, S8, "right");
  T(90, 151, `loudest each 1/4 s - limit ${st.limit} dB`, C.muted, S8);
}

function drawDiary(g: G, C: ScopePalette, st: S2State): void {
  const T = textWriter(g);
  const x = 24;
  const y = 38;
  const w = 288;
  const h = 100;
  const n = st.diary.length;
  g.fillStyle = C.dim;
  g.fillRect(x, y + h, w, 1);
  graphLimit(g, C, st, x, y, w, h);
  st.diary.forEach((d, i) => {
    const cx = x + w - ((n - i) * w) / 60 + 2;
    const yl = y + h - Math.min(h, (d.lo * h) / 60);
    const yh = y + h - Math.min(h, (d.hi * h) / 60);
    const ya = y + h - Math.min(h, (d.avg * h) / 60);
    g.fillStyle = C.muted;
    g.fillRect(cx + 1, yh, 1, yl - yh + 1);
    g.fillStyle = levelColour(C, d.avg);
    g.fillRect(cx - 1, ya - 2, 4, 5);
    if (d.over) {
      g.fillStyle = C.coral;
      g.fillRect(cx - 1, yh - 4, 4, 2);
    }
  });
  T(2, 43, "60", C.muted, S8);
  T(2, 110, "20", C.muted, S8);
  T(24, 151, "-10 min", C.muted, S8);
  T(312, 151, "now", C.muted, S8, "right");
  T(100, 151, "each 10 s: quietest-loudest, avg", C.muted, S8);
}

function drawAlarm(g: G, C: ScopePalette, st: S2State, v: number, t: number): void {
  const T = textWriter(g);
  const a = st.alarm;
  if (a.active) {
    g.fillStyle = C.coral;
    g.globalAlpha = 0.3 + 0.25 * Math.sin(t * 6);
    g.fillRect(0, 30, 320, 128);
    g.globalAlpha = 1;
    T(40, 90, "TOO LOUD", C.ink, BIG);
  } else T(14, 54, st.alarmOn ? "Alarm armed" : "Alarm off", st.alarmOn ? C.teal : C.muted, B12);
  T(
    14,
    113,
    `now ${v.toFixed(0)} dB - limit ${st.limit} dB for ${(st.holdMs / 1000).toFixed(1)} s`,
    C.ink,
    S8,
  );
  const over = a.overSince ? st.mic.ms - a.overSince : 0;
  const fw = Math.min(1, over / st.holdMs) * 292;
  g.strokeStyle = C.dim;
  g.strokeRect(14.5, 118.5, 292, 8);
  if (fw) {
    g.fillStyle = C.amber;
    g.fillRect(14, 118, fw, 8);
  }
  drawStat(g, C, 14, 130, "since start", `${a.count} alarms`);
  if (a.count) {
    drawStat(g, C, 120, 130, "last", `${Math.round((st.mic.ms - a.lastMs) / 1000)}s ago`);
    drawStat(g, C, 220, 130, "loudest", `${a.worst.toFixed(0)} dB`, C.coral);
  }
}
