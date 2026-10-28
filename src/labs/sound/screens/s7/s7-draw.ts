// S7's views, drawn like the board's synth screen on the 320×170 canvas.
import type { ScopePalette } from "@/lib/canvas";
import { drawWave, S8, textWriter } from "../../kit/draw";
import { harmonic, S7_FX, S7_TUNES, waveShape } from "../../model/synth";
import { midiOf, noteOf, parseTune } from "../../model/tune";
import type { Piece, PieceEvent, S7State } from "./s7";

type G = CanvasRenderingContext2D;

export function drawS7(g: G, C: ScopePalette, view: number, _t: number, st: S7State): void {
  const P = st.piece;
  const el = P ? performance.now() - P.at : 0;
  if (P && el > P.total + 300) st.piece = null;
  if (view === 0) drawWaveView(g, C, st);
  else if (view === 1) drawKeys(g, C, st, P, el);
  else if (view === 2) drawEnvelope(g, C, st, P, el);
  else if (view === 3) drawTunes(g, C, st, P, el);
  else drawFx(g, C, st, P, el);
}

function drawWaveView(g: G, C: ScopePalette, st: S7State): void {
  const T = textWriter(g);
  g.fillStyle = C.pink;
  for (let x = 0; x < 300; x++)
    g.fillRect(10 + x, 62 - waveShape(st.wave, (x / 300) * 4) * 26, 1, 2);
  T(10, 99, `${st.wave}  ${st.hz.toFixed(0)} Hz (${noteOf(st.hz).name})`, C.ink, S8);
  for (let n = 1; n <= 40; n++) {
    let f = n * st.hz;
    if (f > 8000) f = 16000 - (f % 16000);
    if (f > 8000 || f < 0) continue;
    const a = harmonic(st.wave, n);
    if (!a) continue;
    const h = Math.max(0, (1 + Math.log10(a) / 3) * 46);
    g.fillStyle = C.pink;
    g.fillRect(10 + (f / 8000) * 300, 150 - h, 1.5, h);
  }
  if (st.wave === "noise")
    for (let x = 0; x < 300; x++) {
      g.fillStyle = C.pink;
      g.fillRect(10 + x, 150 - 20 - Math.random() * 10, 1, 25);
    }
  g.fillStyle = C.dim;
  g.fillRect(10, 150, 300, 1);
  T(10, 160, "0", C.muted, S8);
  T(154, 160, "4k", C.muted, S8);
  T(310, 160, "8kHz", C.muted, S8, "right");
}

function drawKeys(g: G, C: ScopePalette, st: S7State, P: Piece | null, el: number): void {
  const T = textWriter(g);
  const lit = new Set<number>();
  P?.events.forEach((e) => {
    if (el >= e.at && el < e.at + e.ms) lit.add(e.midi);
  });
  const whites = [0, 2, 4, 5, 7, 9, 11];
  for (let i = 0; i < 14; i++) {
    const m = 60 + Math.floor(i / 7) * 12 + (whites[i % 7] ?? 0);
    g.fillStyle = lit.has(m) ? C.pink : C.ink;
    g.fillRect(13 + i * 21, 48, 19, 80);
    if (i % 7 === 0) T(17 + i * 21, 124, `C${4 + i / 7}`, C.paper, S8);
  }
  const after = [0, 1, 3, 4, 5];
  const blacks = [1, 3, 6, 8, 10];
  for (let o = 0; o < 2; o++)
    for (let j = 0; j < 5; j++) {
      const m = 60 + o * 12 + (blacks[j] ?? 0);
      g.fillStyle = lit.has(m) ? C.pink : C.paper;
      g.fillRect(13 + (o * 7 + (after[j] ?? 0)) * 21 + 14, 48, 12, 48);
    }
  T(
    10,
    41,
    `${st.wave} - A${st.adsr[0]} D${st.adsr[1]} S${Math.round(st.adsr[2] * 100)}% R${st.adsr[3]} ms`,
    C.muted,
    S8,
  );
  T(10, 141, "2x: next note   long: next chord", C.muted, S8);
  if (P) T(220, 141, P.title, C.pink, S8);
}

function drawEnvelope(g: G, C: ScopePalette, st: S7State, P: Piece | null, el: number): void {
  const T = textWriter(g);
  const [A, D, Sl, R] = st.adsr;
  const hold = 250;
  const tot = A + D + hold + R;
  const X = (ms: number) => 14 + (ms / tot) * 292;
  const Y = (a: number) => 128 - a * 84;
  const pts: readonly (readonly [number, number])[] = [
    [0, 0],
    [A, 1],
    [A + D, Sl],
    [A + D + hold, Sl],
    [tot, 0],
  ];
  const cols = [C.teal, C.amber, C.pink, C.coral];
  g.fillStyle = C.dim;
  g.fillRect(14, 128, 292, 1);
  for (let i = 0; i < 4; i++) {
    const [x0 = 0, y0 = 0] = pts[i] ?? [];
    const [x1 = 0, y1 = 0] = pts[i + 1] ?? [];
    const col = cols[i] ?? C.pink;
    g.strokeStyle = col;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(X(x0), Y(y0));
    g.lineTo(X(x1), Y(y1));
    g.stroke();
    T((X(x0) + X(x1)) / 2 - 2, 139, "ADSR"[i] ?? "", col, S8);
  }
  g.lineWidth = 1;
  const only = P && P.events.length === 1 ? P.events[0] : undefined;
  if (only) {
    const held = only.ms - R;
    let ms: number;
    let a: number;
    if (el < A) {
      ms = el;
      a = el / A;
    } else if (el < A + D) {
      ms = el;
      a = 1 - ((1 - Sl) * (el - A)) / D;
    } else if (el < held) {
      ms = Math.min(el, A + D + hold * 0.99);
      a = Sl;
    } else {
      const k = Math.min(1, (el - held) / R);
      ms = A + D + hold + k * R;
      a = Sl * (1 - k);
    }
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(X(Math.min(ms, tot)), Y(a), 4, 0, 7);
    g.fill();
  }
  T(14, 149, `adsr ${A} ${D} ${Math.round(Sl * 100)} ${R}   (ms, ms, %, ms)`, C.ink, S8);
  T(14, 39, "fade in, fall, hold, fade out: no clicks", C.muted, S8);
}

function drawTunes(g: G, C: ScopePalette, st: S7State, P: Piece | null, el: number): void {
  const T = textWriter(g);
  S7_TUNES.forEach(([n], i) => {
    if (i === st.tuneIdx) {
      g.fillStyle = C.dim;
      g.fillRect(4, 34 + i * 16, 92, 15);
    }
    T(8, 45 + i * 16, n, i === st.tuneIdx ? C.pink : C.muted, S8);
  });
  T(8, 149, "2x: play", C.muted, S8);
  T(8, 159, "long: next", C.muted, S8);
  const x0 = 104;
  const y0 = 34;
  const w = 210;
  const h = 124;
  const tune = S7_TUNES[st.tuneIdx];
  const live = Boolean(P && tune && P.title === tune[0]);
  g.strokeStyle = C.dim;
  g.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
  let at = 0;
  const ev: readonly PieceEvent[] =
    live && P
      ? P.events
      : tune
        ? parseTune(tune[1], tune[2]).map((n) => {
            const e = { at, ms: n.ms, hz: n.hz, midi: n.hz ? midiOf(n.hz) : -1 };
            at += n.ms;
            return e;
          })
        : [];
  const ms = ev.filter((e) => e.midi >= 0).map((e) => e.midi);
  const lo = Math.min(...ms) - 1;
  const hi = Math.max(...ms) + 1;
  const now = live ? el : 0;
  const playX = x0 + w / 4;
  const k = w / 4000;
  g.save();
  g.beginPath();
  g.rect(x0 + 1, y0 + 1, w - 2, h - 2);
  g.clip();
  ev.forEach((e) => {
    if (e.midi < 0) return;
    const x = playX + (e.at - now) * k;
    const y = y0 + h - 4 - ((e.midi - lo) * (h - 8)) / Math.max(1, hi - lo);
    const on = live && now >= e.at && now < e.at + e.ms;
    g.fillStyle = on ? C.ink : C.pink;
    g.globalAlpha = on ? 1 : 0.4;
    g.fillRect(x, y - 2, Math.max(2, e.ms * k - 1), 5);
  });
  g.restore();
  g.globalAlpha = 1;
  g.fillStyle = live ? C.amber : C.dim;
  g.fillRect(playX, y0 + 1, 1, h - 2);
}

function drawFx(g: G, C: ScopePalette, st: S7State, P: Piece | null, el: number): void {
  const T = textWriter(g);
  S7_FX.forEach(([n], i) => {
    if (i === st.fxIdx) {
      g.fillStyle = C.dim;
      g.fillRect(4, 34 + i * 16, 82, 15);
    }
    T(8, 45 + i * 16, n, i === st.fxIdx ? C.pink : C.muted, S8);
  });
  const x0 = 94;
  const y0 = 36;
  const w = 218;
  const h = 96;
  g.strokeStyle = C.dim;
  g.strokeRect(x0 - 0.5, y0 - 0.5, w + 1, h + 1);
  const fx = S7_FX[st.fxIdx];
  if (st.fxBuf) {
    drawWave(g, x0, y0, w, h, st.fxBuf, st.fxBuf.length, 1, C.pink);
    if (P?.samples) {
      const kk = Math.min(1, el / P.total);
      g.fillStyle = C.ink;
      g.fillRect(x0 + kk * w, y0, 1, h);
    }
    T(x0, y0 + h + 12, `${fx?.[0] ?? ""}, ${Math.round(st.fxBuf.length / 16)} ms`, C.ink, S8);
  } else T(x0 + 10, y0 + h / 2 + 3, "double-click to play an effect", C.muted, S8);
  T(x0, y0 + h + 24, fx?.[1] ?? "", C.muted, S8);
}
