// S4's views, drawn like kit/lib/sound-kit's screen code on the 320×170 canvas.
import type { ScopePalette } from "@/lib/canvas";
import { B12, display, drawStat, S8, textWriter } from "../../kit/draw";
import { sndDb } from "../../model/level";
import { clipsMb, type S4State, sentGain } from "./s4";

type G = CanvasRenderingContext2D;

export function drawS4(g: G, C: ScopePalette, view: number, t: number, st: S4State): void {
  st.rec = st.tr.state === "rec";
  if (view === 0) drawRecorder(g, C, t, st);
  else if (view === 1) drawClips(g, C, st);
  else drawWeb(g, C);
}

function drawRecorder(g: G, C: ScopePalette, t: number, st: S4State): void {
  const T = textWriter(g);
  let word = "OFF";
  let col = C.muted;
  if (st.rec) {
    word = `REC ${((st.mic.ms - st.tr.from) / 1000).toFixed(1)} s`;
    col = C.coral;
    if (t % 1 < 0.6) {
      g.fillStyle = C.coral;
      g.beginPath();
      g.arc(16, 56, 8, 0, 7);
      g.fill();
    }
  } else if (st.tr.armed) {
    word = "ARMED";
    col = C.teal;
    g.strokeStyle = C.teal;
    g.beginPath();
    g.arc(16, 56, 8, 0, 7);
    g.stroke();
  } else {
    g.strokeStyle = C.dim;
    g.beginPath();
    g.arc(16, 56, 8, 0, 7);
    g.stroke();
  }
  T(32, 72, word, col, display(30));
  T(236, 49, `${st.clips.length} clips`, C.ink, S8);
  T(236, 61, `${clipsMb(st.clips).toFixed(1)} / 6 MB`, C.muted, S8);
  T(236, 73, "lost on reset", C.muted, S8);
  const x = 10;
  const y = 84;
  const w = 300;
  const h = 66;
  const mid = y + h / 2;
  g.fillStyle = C.dim;
  g.globalAlpha = 0.5;
  g.fillRect(x, y, w, h);
  g.globalAlpha = 1;
  for (let c = 0; c < w; c++) {
    const a = Math.floor((c * 750) / w);
    const b = Math.floor(((c + 1) * 750) / w);
    let d = 0;
    let mk = 0;
    for (let i = a; i < b; i++) {
      d = Math.max(d, st.env[(st.head + i) % 750] ?? 0);
      mk = Math.max(mk, st.mark[(st.head + i) % 750] ?? 0);
    }
    const col2 = mk === 2 ? C.coral : mk === 1 ? C.amber : C.pink;
    const half = Math.min(h / 2 - 1, (d / 50) * (h / 2));
    if (mk) {
      g.fillStyle = col2;
      g.globalAlpha = 0.2;
      g.fillRect(x + c, y, 1, h);
      g.globalAlpha = 1;
    }
    if (half > 0) {
      g.fillStyle = col2;
      g.fillRect(x + c, mid - half, 1, half * 2 + 1);
    }
  }
  const ty = Math.min(h / 2 - 1, (st.tr.cfg.startDb / 50) * (h / 2));
  for (let i = x; i < x + w; i += 4) {
    g.fillStyle = C.ink;
    g.fillRect(i, mid - ty, 1, 1);
    g.fillRect(i, mid + ty, 1, 1);
  }
  T(x + 2, y + 9, "3 s ago", C.muted, S8);
  T(x + w - 2, y + 9, "now", C.muted, S8, "right");
  T(
    x,
    y + h + 11,
    `start ${st.tr.cfg.startDb} dB, hold ${(st.tr.cfg.holdMs / 1000).toFixed(1)} s, pre-roll 0.5 s`,
    C.muted,
    S8,
  );
}

function drawClips(g: G, C: ScopePalette, st: S4State): void {
  const T = textWriter(g);
  const pc = st.clips[Math.min(st.picked, st.clips.length - 1)];
  if (!pc) {
    T(12, 64, "No clips yet.", C.ink, B12);
    T(12, 89, "arm (voice trigger) or rec (by hand), then talk.", C.muted, S8);
    T(12, 103, "Clips live in PSRAM: a reset forgets them.", C.muted, S8);
    return;
  }
  st.clips.slice(-4).forEach((c, i) => {
    const y = 34 + i * 30;
    const on = c === pc;
    if (on) {
      g.fillStyle = C.pink;
      g.globalAlpha = 0.15;
      g.fillRect(4, y, 184, 28);
      g.globalAlpha = 1;
    }
    T(10, y + 19, String(c.n), on ? C.pink : C.ink, B12);
    for (let k = 0; k < 48; k++) {
      const hh = 2 + (c.shape[k] ?? 0) * 10;
      g.fillStyle = C.pink;
      g.fillRect(40 + k * 2, y + 14 - hh / 2, 1, hh);
    }
    T(142, y + 13, `${c.dur.toFixed(1)} s`, C.ink, S8);
    T(142, y + 23, c.manual ? "hand" : "voice", C.muted, S8);
  });
  drawStat(g, C, 194, 34, "loudest", `${sndDb(pc.peak).toFixed(0)} dBFS`);
  drawStat(g, C, 194, 72, "sent louder by", `x${sentGain(pc).toFixed(1)}`, C.pink);
  drawStat(g, C, 194, 110, "started", "14:02:31");
  T(
    194,
    155,
    st.playing === pc.n ? "playing on the board" : `send ${pc.n} - 2x: play`,
    st.playing === pc.n ? C.pink : C.muted,
    S8,
  );
}

function drawWeb(g: G, C: ScopePalette): void {
  const T = textWriter(g);
  T(12, 52, "http://bench.local", C.pink, B12);
  drawStat(g, C, 12, 64, "or", "192.168.1.42");
  drawStat(g, C, 150, 64, "signal", "-58 dBm");
  drawStat(g, C, 240, 64, "pages open", "1", C.teal);
  T(12, 115, "The page asks for the admin token:", C.muted, S8);
  T(12, 127, "type token in the serial monitor.", C.ink, S8);
  T(12, 143, "Recording always shows here: REC + red LED.", C.muted, S8);
}
