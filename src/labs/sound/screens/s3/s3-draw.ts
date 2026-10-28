// S3's views on the 320×170 canvas.
import type { ScopePalette } from "@/lib/canvas";
import { B12, drawStat, levelColour, S8, type TextFn, textWriter } from "../../kit/draw";
import { S3_ACTIONS, S3_COLOURS, type S3State } from "./s3";

type G = CanvasRenderingContext2D;

export function drawS3(g: G, C: ScopePalette, view: number, t: number, st: S3State): void {
  const T = textWriter(g);
  if (st.screenOff) {
    T(160, 96, "(backlight off: the screen is dark)", C.dim, S8, "center");
    return;
  }
  if (view === 0) drawTimeline(g, C, T, st);
  else if (view === 1) drawLamp(g, C, T, t, st);
  else if (view === 2) drawPatterns(g, C, T, st);
  else drawLearn(g, C, T, t, st);
}

/** The pattern as it forms, then what it did (fading after 2 s). */
function patternLabel(g: G, C: ScopePalette, T: TextFn, st: S3State, x: number, y: number): void {
  const p = st.groups.open.length;
  if (p) return T(x, y, `${p} clap${p > 1 ? "s" : ""} ...`, C.amber, B12);
  const age = performance.now() - st.last.at;
  if (st.last.count && age < 3000) {
    g.globalAlpha = age > 2000 ? 1 - (age - 2000) / 1100 : 1;
    T(
      x,
      y,
      `${st.last.count} clap${st.last.count > 1 ? "s" : ""} -> ${st.last.action}`,
      C.teal,
      B12,
    );
    g.globalAlpha = 1;
  }
}

function drawTimeline(g: G, C: ScopePalette, T: TextFn, st: S3State): void {
  const x = 8;
  const y = 56;
  const w = 304;
  const h = 92;
  const yOf = (d: number) => y + h - (Math.min(60, d) / 60) * h;
  for (let c = 0; c < w; c++) {
    const a = Math.floor((c * 1000) / w);
    const b = Math.floor(((c + 1) * 1000) / w);
    let m = 0;
    for (let i = a; i < b; i++) m = Math.max(m, st.hist[(st.head + i) % 1000] ?? 0);
    if (m) {
      g.fillStyle = levelColour(C, m);
      g.fillRect(x + c, yOf(m), 1, y + h - yOf(m));
    }
  }
  const cfg = st.ears.cfg;
  for (let i = 0; i < w; i += 4) {
    g.fillStyle = C.ink;
    g.fillRect(x + i, yOf(cfg.riseDb), 1, 1);
    g.fillStyle = C.muted;
    g.fillRect(x + i, yOf(cfg.releaseDb), 1, 1);
  }
  T(x + w, yOf(cfg.riseDb) - 3, `rise ${cfg.riseDb.toFixed(0)}`, C.ink, S8, "right");
  const nowMs = st.mic.ms;
  for (const m of st.marks) {
    if (nowMs - m.ms > 4000) continue;
    const mx = x + w - ((nowMs - m.ms) * w) / 4000;
    if (m.kind === "clap") {
      g.fillStyle = C.teal;
      g.fillRect(mx, y - 4, 1, h + 4);
      g.beginPath();
      g.moveTo(mx, y - 4);
      g.lineTo(mx + 7, y - 1);
      g.lineTo(mx, y + 2);
      g.fill();
    } else if (m.kind === "long") {
      g.fillStyle = C.amber;
      g.fillRect(mx, y + h + 2, Math.max(2, (m.len * w) / 4000), 3);
      T(mx, y + h + 13, "long", C.amber, S8);
    } else {
      g.fillStyle = C.muted;
      g.fillRect(mx, y + h - 6, 1, 6);
    }
  }
  g.fillStyle = C.dim;
  g.fillRect(x, y + h, w, 1);
  T(x, y + h + 13, "-4 s", C.muted, S8);
  T(x + w, y + h + 13, "now", C.muted, S8, "right");
  patternLabel(g, C, T, st, x, 48);
}

function drawLamp(g: G, C: ScopePalette, T: TextFn, t: number, st: S3State): void {
  const bx = 80;
  const by = 82;
  if (st.led)
    for (let i = 0; i < 10; i++) {
      const a = i * 0.628 + t * 0.6;
      const r0 = 30 + 3 * Math.sin(t * 4 + i);
      g.strokeStyle = C.amber;
      g.beginPath();
      g.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0);
      g.lineTo(bx + Math.cos(a) * (r0 + 10), by + Math.sin(a) * (r0 + 10));
      g.stroke();
    }
  g.fillStyle = st.led ? C.amber : C.dim;
  g.beginPath();
  g.arc(bx, by, 22, 0, 7);
  g.fill();
  g.strokeStyle = C.muted;
  g.stroke();
  g.fillStyle = C.dim;
  g.fillRect(bx - 10, by + 22, 21, 14);
  T(bx - 30, by + 51, `LED GPIO 4: ${st.led ? "on" : "off"}`, C.muted, S8);
  const ox = 236;
  const oy = 82;
  const party = performance.now() < st.partyUntil;
  const named = S3_COLOURS[st.colour];
  // The party's rainbow is computed colour data, not a theme colour.
  const col = party ? `hsl(${(t * 420) % 360} 90% 60%)` : named ? C[named[1]] : C.dim;
  if (st.colour >= 0 || party)
    for (let r = 26; r <= 36; r += 3) {
      g.strokeStyle = col;
      g.globalAlpha = 0.5 - (r - 26) / 25;
      g.beginPath();
      g.arc(ox, oy, r + 2 * Math.sin(t * 3), 0, 7);
      g.stroke();
    }
  g.globalAlpha = 1;
  g.fillStyle = col;
  g.beginPath();
  g.arc(ox, oy, 24, 0, 7);
  g.fill();
  g.strokeStyle = C.muted;
  g.stroke();
  if (party)
    for (let i = 0; i < 14; i++) {
      const a = i * 0.449 + t * 2;
      const r = 40 + ((t * 60 + i * 9) % 30);
      g.fillStyle = `hsl(${(i * 25 + t * 280) % 360} 90% 60%)`;
      g.beginPath();
      g.arc(ox + Math.cos(a) * r, oy + Math.sin(a) * r * 0.7, 2, 0, 7);
      g.fill();
    }
  T(
    ox - 40,
    oy + 51,
    party ? "RGB: party!" : named ? named[0] : st.colour === -1 ? "RGB: off" : "RGB: level meter",
    C.muted,
    S8,
  );
  patternLabel(g, C, T, st, 112, 150);
}

/** A pair of hands per clap. */
function drawPatterns(g: G, C: ScopePalette, T: TextFn, st: S3State): void {
  const age = performance.now() - st.last.at;
  for (let n = 1; n <= 4; n++) {
    const y = 36 + (n - 1) * 26;
    const hit = st.last.count === n && age < 3000;
    if (hit) {
      g.fillStyle = C.teal;
      g.globalAlpha = 0.25;
      g.beginPath();
      g.roundRect(4, y - 2, 312, 24, 4);
      g.fill();
      g.globalAlpha = 1;
    }
    for (let i = 0; i < n; i++) {
      const cx = 18 + i * 18;
      g.fillStyle = hit ? C.teal : C.muted;
      g.beginPath();
      g.arc(cx - 3, y + 10, 4, 0, 7);
      g.fill();
      g.fillStyle = hit ? C.ink : C.dim;
      g.beginPath();
      g.arc(cx + 3, y + 10, 4, 0, 7);
      g.fill();
    }
    const act = st.map[n] ?? "none";
    T(96, y + 15, act, act === "none" ? C.dim : hit ? C.ink : C.pink, B12);
    T(172, y + 14, S3_ACTIONS[act], C.muted, S8);
  }
  T(
    8,
    149,
    `sens ${st.ears.cfg.riseDb.toFixed(0)} dB - pause ${st.groups.gapMs} ms ends a pattern`,
    C.muted,
    S8,
  );
}

function drawLearn(g: G, C: ScopePalette, T: TextFn, t: number, st: S3State): void {
  const L = st.learn;
  T(
    8,
    43,
    L.on
      ? `clap ${L.n + 1} of 5, as you normally would`
      : L.suggested
        ? `softest x 60% = sens ${L.suggested.toFixed(0)} dB (saved)`
        : "double-click, then clap 5 times",
    L.on ? C.amber : C.muted,
    S8,
  );
  const y0 = 134;
  const hMax = 72;
  for (let i = 0; i < 5; i++) {
    const x = 16 + i * 44;
    g.strokeStyle = C.dim;
    g.strokeRect(x + 0.5, y0 - hMax + 0.5, 30, hMax);
    const strength = L.strength[i];
    if (i < L.n && strength !== undefined) {
      const hh = (Math.min(60, strength) / 60) * hMax;
      g.fillStyle = levelColour(C, strength);
      g.fillRect(x + 1, y0 - hh, 28, hh);
      T(x + 8, y0 - hh - 3, strength.toFixed(0), C.ink, S8);
      T(x, y0 + 11, `${L.length[i] ?? 0}ms`, C.muted, S8);
    } else if (L.on && i === L.n && t % 1 < 0.5) {
      g.fillStyle = C.amber;
      g.fillRect(x + 1, y0 - 4, 28, 3);
    }
  }
  const ry = y0 - (st.ears.cfg.riseDb / 60) * hMax;
  for (let x = 12; x < 236; x += 3) {
    g.fillStyle = C.ink;
    g.fillRect(x, ry, 1, 1);
  }
  drawStat(g, C, 244, 54, "sens now", `${st.ears.cfg.riseDb.toFixed(0)} dB`, C.pink);
  drawStat(g, C, 244, 96, "long (voice?)", String(L.longs), L.longs ? C.amber : C.ink);
}
