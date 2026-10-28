// S1's views, drawn like kit/lib/sound-kit's screen code on the 320×170 canvas.
import type { ScopePalette } from "@/lib/canvas";
import { B12, drawStat, drawWave, levelColour, maxAbs, S8, textWriter } from "../../kit/draw";
import { attenName } from "../../model/level";
import type { Mic } from "../../model/mic";
import type { S1State } from "./s1";

type G = CanvasRenderingContext2D;

export function drawS1(g: G, C: ScopePalette, view: number, _t: number, st: S1State): void {
  const m = st.mic;
  if (view === 1) return drawMics(g, C, st);
  const v = view > 1 ? view - 1 : view;
  if (m.digital && v === 1) return drawBits(g, C, m);
  if (m.digital && v === 2) return drawSoftComparator(g, C, st);
  if (m.digital && v === 3) return drawDigitalNumbers(g, C, m);
  if (v === 0) return drawScope(g, C, st);
  if (v === 1) return drawBias(g, C, m);
  if (v === 2) return drawComparator(g, C, st);
  drawNumbers(g, C, m);
}

/** Two lanes, the INMP441 on top. */
function drawMics(g: G, C: ScopePalette, st: S1State): void {
  const T = textWriter(g);
  const m = st.mic;
  const dig = m.digital ? m : st.mic2;
  const ana = m.digital ? st.mic2 : m;
  const lanes: readonly (readonly [Mic, string, string, number])[] = [
    [dig, "INMP441", C.teal, 36],
    [ana, "KY-037", C.pink, 86],
  ];
  for (const [mm, name, col, y] of lanes) {
    const L = mm.level;
    T(8, y + 10, name, col, B12);
    T(8, y + 24, `quiet ${L.floor.toFixed(0)} dBFS`, C.muted, S8);
    T(8, y + 36, `now +${L.above().toFixed(0)} dB`, C.ink, S8);
    const s = mm.latest(640);
    drawWave(g, 100, y, 210, 42, s, 640, maxAbs(s, 64) * 1.1, col);
  }
  const d = dig.level.above() - ana.level.above();
  T(
    8,
    146,
    d > 3 ? `INMP441 hears it ${d.toFixed(0)} dB more clearly` : "clap or talk: compare the two",
    d > 3 ? C.teal : C.muted,
    S8,
  );
}

/** The 24-bit ladder: how many bits the sound uses (6 dB each) and the headroom left. */
function drawBits(g: G, C: ScopePalette, m: Mic): void {
  const T = textWriter(g);
  const L = m.level;
  const peakDb = Math.max(-96, L.peak);
  const bitsUsed = Math.max(1, Math.min(24, Math.round((peakDb + 96 + 48) / 6.02)));
  const head = Math.max(0, -peakDb);
  for (let b = 0; b < 24; b++) {
    g.fillStyle = b < bitsUsed ? C.pink : C.dim;
    g.fillRect(14, 150 - b * 4.8, 60, 3.6);
  }
  T(14, 38, "bit 23", C.muted, S8);
  T(80, 154, "bit 0", C.muted, S8);
  drawStat(g, C, 104, 38, "bits the sound uses", `${bitsUsed} of 24`, C.pink);
  drawStat(g, C, 216, 38, "headroom", `${head.toFixed(0)} dB`, head < 6 ? C.coral : C.ink);
  drawStat(g, C, 104, 78, "offset (DC)", "tiny, removed");
  T(
    104,
    129,
    head < 1 ? "CLIPPING: at full scale" : "each bit = 6 dB; quiet uses few",
    head < 1 ? C.coral : C.muted,
    S8,
  );
  T(104, 143, "INMP441: fixed range, no atten", C.muted, S8);
}

function drawStrip(g: G, C: ScopePalette, st: S1State, x: number, y: number, w: number): void {
  const s = st.strip;
  for (let i = 0; i < 150; i++) {
    const at = (s.head + i) % 150;
    const px = x + (i * w) / 150;
    const loud = s.loud[at] ?? 0;
    const hh = Math.min(30, (loud * 30) / 50);
    if (hh) {
      g.fillStyle = levelColour(C, loud);
      g.fillRect(px, y + 30 - hh, 2, hh);
    }
    if (s.high[at]) {
      g.fillStyle = C.amber;
      g.fillRect(px, y + 36, 2, 10);
    }
  }
}

function drawSoftComparator(g: G, C: ScopePalette, st: S1State): void {
  const T = textWriter(g);
  g.fillStyle = st.softHigh ? C.amber : C.dim;
  g.beginPath();
  g.arc(34, 60, 18, 0, 7);
  g.fill();
  T(14, 91, st.softHigh ? "over" : "under", C.muted, S8);
  drawStat(g, C, 68, 38, "crossings", `${st.strip.rps}/s`, st.strip.rps ? C.amber : C.ink);
  drawStat(g, C, 168, 38, "threshold", `${st.thresh} dB`);
  drawStrip(g, C, st, 10, 96, 300);
  g.fillStyle = C.ink;
  g.fillRect(10, 126 - Math.min(30, (st.thresh * 30) / 50), 300, 1);
  T(10, 153, "software comparator: thresh, 3 dB hysteresis", C.muted, S8);
}

function drawDigitalNumbers(g: G, C: ScopePalette, m: Mic): void {
  drawStat(g, C, 10, 36, "source", "INMP441 (I2S)", C.teal);
  drawStat(g, C, 170, 36, "level", `${m.spl().toFixed(0)} dB SPL`);
  drawStat(g, C, 10, 76, "level (fast)", `${m.level.fast.toFixed(1)} dBFS`);
  drawStat(g, C, 170, 76, "quiet (floor)", `${m.level.floor.toFixed(1)} dBFS`);
  drawStat(
    g,
    C,
    10,
    116,
    "above the quiet",
    `${m.level.above().toFixed(1)} dB`,
    levelColour(C, m.level.above()),
  );
  drawStat(g, C, 170, 116, "samples / second", "16000 Hz");
}

function drawScope(g: G, C: ScopePalette, st: S1State): void {
  const T = textWriter(g);
  const m = st.mic;
  if (!st.frozen) {
    const span = Math.min(2048, Math.round((m.rate * st.spanMs) / 1000));
    const look = m.latest(span * 2);
    let start = span;
    if (st.trigger) {
      const hyst = Math.max(32, st.scale * 0.08);
      for (let i = span; i > 1; i--) {
        if (
          (look[i - 1] ?? 0) < 0 &&
          (look[i] ?? 0) >= 0 &&
          (look[Math.max(0, i - 8)] ?? 0) < -hyst
        ) {
          start = i;
          break;
        }
      }
    }
    st.shown = look.slice(start, start + span);
    const want = maxAbs(st.shown, 128 / 1.1) * 1.1;
    st.scale = want > st.scale ? want : st.scale * 0.95 + want * 0.05;
  }
  const x = 30;
  const y = 36;
  const w = 282;
  const h = 108;
  g.strokeStyle = C.dim;
  g.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  for (let i = 1; i < 10; i++)
    for (let j = y; j < y + h; j += 4) {
      g.fillStyle = C.dim;
      g.fillRect(x + (i * w) / 10, j, 1, 1);
    }
  g.fillStyle = C.dim;
  g.fillRect(x, y + h / 2, w, 1);
  drawWave(g, x, y, w, h, st.shown, st.shown.length, st.scale, C.pink);
  const mv = Math.round((st.scale / 16) * m.mvPerStep());
  T(2, y + 7, `+${mv}`, C.muted, S8);
  T(2, y + h / 2 + 4, "0", C.muted, S8);
  T(2, y + h - 1, `-${mv}`, C.muted, S8);
  T(2, y + h - 11, "mV", C.muted, S8);
  T(
    x,
    y + h + 13,
    `${st.spanMs} ms across - ${st.trigger ? "trigger on" : "free-running"}${st.frozen ? " - FROZEN" : ""}`,
    st.frozen ? C.amber : C.muted,
    S8,
  );
  T(
    x + w,
    y + h + 13,
    `${m.level.above().toFixed(0)} dB`,
    levelColour(C, m.level.above()),
    S8,
    "right",
  );
}

function drawBias(g: G, C: ScopePalette, m: Mic): void {
  const T = textWriter(g);
  const x = 22;
  const y = 38;
  const h = 112;
  const w = 46;
  const top = m.top();
  const yOf = (mv: number) => y + h - (mv * h) / 3300;
  g.strokeStyle = C.dim;
  g.strokeRect(x, y, w, h);
  g.fillStyle = C.dim;
  g.fillRect(x + 1, yOf(top), w - 2, y + h - yOf(top) - 1);
  const lo = m.toMv(m.rawLow);
  const hi = m.toMv(m.rawHigh);
  const bias = m.toMv(m.dc ?? 0);
  g.fillStyle = C.pink;
  g.globalAlpha = 0.5;
  g.fillRect(x + 6, yOf(hi), w - 12, Math.max(2, yOf(lo) - yOf(hi)));
  g.globalAlpha = 1;
  g.fillRect(x - 4, yOf(bias), w + 8, 1);
  for (let v = 0; v <= 3300; v += 500) {
    g.fillStyle = C.muted;
    g.fillRect(x - 3, yOf(v), 3, 1);
    if (v % 1000 === 0) T(0, yOf(v) + 4, (v / 1000).toFixed(1), C.muted, S8);
  }
  drawStat(g, C, 92, 40, "bias (the steady part)", `${bias} mV`, C.pink);
  drawStat(g, C, 92, 78, "swing, last 0.1 s", `${Math.max(0, hi - lo)} mV`);
  drawStat(g, C, 212, 78, "one ADC step", `${m.mvPerStep().toFixed(2)} mV`);
  T(212, 47, `atten ${attenName(m.atten)}`, C.muted, S8);
  let hint = "the wave fits the range: good";
  let col = C.muted;
  if (m.rawLow <= 0 || m.rawHigh >= 4095) {
    hint = "CLIPPING: the wave hits the range's edge";
    col = C.coral;
  } else if (bias > top - 150) {
    hint = "bias near the top: use a bigger atten";
    col = C.amber;
  } else if (m.atten === 12 && hi < 1600) {
    hint = "fits in 0-1.75 V: try atten 6 (2x finer)";
    col = C.teal;
  } else if (m.atten === 6 && hi < 1150) {
    hint = "fits in 0-1.25 V: try atten 2.5";
    col = C.teal;
  }
  T(92, 129, hint, col, S8);
  T(92, 143, "clap: the band grows around the line", C.muted, S8);
}

function drawComparator(g: G, C: ScopePalette, st: S1State): void {
  const T = textWriter(g);
  const s = st.strip;
  g.fillStyle = st.doLamp ? C.amber : C.dim;
  g.beginPath();
  g.arc(34, 60, 18, 0, 7);
  g.fill();
  g.strokeStyle = C.muted;
  g.beginPath();
  g.arc(34, 60, 18, 0, 7);
  g.stroke();
  T(18, 91, st.doLamp ? "DO high" : "DO low", C.muted, S8);
  drawStat(g, C, 68, 38, "rising edges", `${s.rps}/s`, s.rps ? C.amber : C.ink);
  drawStat(g, C, 168, 38, "total", String(st.mic.doRises));
  const x = 10;
  const y = 96;
  const w = 300;
  drawStrip(g, C, st, x, y, w);
  g.fillStyle = C.dim;
  g.fillRect(x, y + 31, w, 1);
  g.fillRect(x, y + 47, w, 1);
  T(x, y + 57, "loudness (top) vs DO (bottom), last 6 s", C.muted, S8);
  let hs = 0;
  let ls = 0;
  for (let i = 100; i < 150; i++) {
    const at = (s.head + i) % 150;
    hs += s.high[at] ?? 0;
    ls += (s.loud[at] ?? 0) >= 15 ? 1 : 0;
  }
  let hint = "clap: DO should light with each clap";
  let col = C.muted;
  if (hs > 45) {
    hint = "DO always on: turn the pot the other way";
    col = C.amber;
  } else if (ls > 3 && hs === 0) {
    hint = "loud but DO stays off: turn the pot back";
    col = C.amber;
  } else if (hs > 0 && hs <= ls + 2) {
    hint = "DO follows the loud moments: tuned";
    col = C.teal;
  }
  T(68, 79, hint, col, S8);
}

function drawNumbers(g: G, C: ScopePalette, m: Mic): void {
  const L = m.level;
  drawStat(g, C, 10, 36, "samples / second", `${m.rate} Hz`, C.pink);
  drawStat(g, C, 170, 36, "lost: DMA / frames", "0 / 0");
  drawStat(g, C, 10, 76, "level (fast)", `${L.fast.toFixed(1)} dBFS`);
  drawStat(g, C, 170, 76, "quiet (floor)", `${L.floor.toFixed(1)} dBFS`);
  drawStat(
    g,
    C,
    10,
    116,
    "above the quiet",
    `${L.above().toFixed(1)} dB`,
    levelColour(C, L.above()),
  );
  drawStat(g, C, 170, 116, "free PSRAM", "8061 KB");
}
