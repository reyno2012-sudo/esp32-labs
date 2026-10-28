// S6's views: the padlock and rhythms, Clap Bird, the beat party.
import type { ScopePalette } from "@/lib/canvas";
import { B12, display, S8, textWriter } from "../../kit/draw";
import { BIRD } from "../../model/bird";
import { shares } from "../../model/rhythm";
import type { S6State } from "./s6";

type G = CanvasRenderingContext2D;

export function drawS6(g: G, C: ScopePalette, view: number, t: number, st: S6State): void {
  if (view === 0) drawKnock(g, C, t, st);
  else if (view === 1) drawBird(g, C, t, st);
  else drawParty(g, C, st);
}

function drawPadlock(g: G, C: ScopePalette, t: number, st: S6State, now: number): boolean {
  const open = now < st.openUntil;
  const lift = open ? Math.min(1, (now - st.openedAt) / 300) : 0;
  const failed = st.match !== null && !st.match.ok && now - st.attemptAt < 500;
  const x = 40 + (failed ? 5 * Math.sin((now - st.attemptAt) * 0.08) : 0);
  const cy = 74;
  const col = open ? C.teal : C.pink;
  const sy = cy - 14 - lift * 10;
  g.strokeStyle = col;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(x, sy, 11.5, Math.PI, 0);
  g.stroke();
  g.beginPath();
  g.moveTo(x - 11.5, sy);
  g.lineTo(x - 11.5, sy + 15 + lift * 10);
  g.stroke();
  if (!open) {
    g.beginPath();
    g.moveTo(x + 11.5, sy);
    g.lineTo(x + 11.5, sy + 15);
    g.stroke();
  }
  g.lineWidth = 1;
  g.fillStyle = col;
  g.beginPath();
  g.roundRect(x - 20, cy, 41, 32, 5);
  g.fill();
  g.fillStyle = C.paper;
  g.beginPath();
  g.arc(x, cy + 12, 4, 0, 7);
  g.fill();
  g.fillRect(x - 1, cy + 14, 3, 9);
  if (open)
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + t * 2;
      g.fillStyle = C.teal;
      g.beginPath();
      g.arc(x + Math.cos(a) * 30, cy + 16 + Math.sin(a) * 26, 2, 0, 7);
      g.fill();
    }
  return open;
}

function drawKnock(g: G, C: ScopePalette, t: number, st: S6State): void {
  const T = textWriter(g);
  const now = performance.now();
  const open = drawPadlock(g, C, t, st, now);
  T(14, 130, open ? "OPEN" : "LOCKED", open ? C.teal : C.muted, B12);
  const rx = 96;
  const w = 210;
  const row = (
    y: number,
    r: readonly number[],
    c: string,
    sec: readonly number[] | null,
    scale?: number,
  ) => {
    g.fillStyle = C.dim;
    g.fillRect(rx, y + 10, w, 1);
    const first = r[0] ?? 0;
    const len = scale || (r.length > 1 ? (r.at(-1) ?? 0) - first : 1);
    const sh = sec && sec.length === r.length ? shares(sec) : null;
    const mine = shares(r);
    r.forEach((v, i) => {
      const kx = rx + ((v - first) / len) * w;
      g.fillStyle = c;
      g.beginPath();
      g.roundRect(kx - 2, y, 5, 21, 2);
      g.fill();
      if (sh && i + 1 < r.length) {
        const err = Math.abs((sh[i] ?? 0) - (mine[i] ?? 0));
        const nx = rx + (((r[i + 1] ?? 0) - first) / len) * w;
        g.fillStyle = err <= st.tol / 2 ? C.teal : err <= st.tol ? C.amber : C.coral;
        g.fillRect(kx + 4, y + 24, Math.max(1, nx - kx - 8), 3);
      }
    });
  };
  T(rx, 43, "secret", C.muted, S8);
  if (st.secret.length >= 2) row(46, st.secret, C.pink, null);
  else T(rx + 44, 59, "none yet: knock set", C.amber, S8);
  if (st.open.length) {
    T(rx, 89, st.setting ? "new secret..." : "listening...", C.amber, S8);
    const sl = st.secret.length > 1 ? (st.secret.at(-1) ?? 0) - (st.secret[0] ?? 0) : 0;
    const ol = (st.open.at(-1) ?? 0) - (st.open[0] ?? 0);
    row(92, st.open, C.amber, null, Math.max(sl, ol) || 1);
  } else if (st.attempt.length && st.match) {
    T(
      rx,
      89,
      st.match.ok ? `your knock: score ${st.match.score}` : `your knock: ${st.match.why}`,
      st.match.ok ? C.teal : C.coral,
      S8,
    );
    row(92, st.attempt, C.ink, st.secret);
  }
  T(
    rx,
    141,
    st.setting
      ? "knock your secret, then wait 1.5 s"
      : st.secret.length < 2
        ? "double-click, then knock a rhythm"
        : "knock on the table near the mic",
    st.setting ? C.amber : C.muted,
    S8,
  );
  T(rx, 153, `tolerance ${Math.round(st.tol * 100)}%`, C.dim, S8);
}

function drawBird(g: G, C: ScopePalette, t: number, st: S6State): void {
  const T = textWriter(g);
  const now = performance.now();
  const G = st.game;
  const drift = G.state === "playing" ? t * 12 : 0;
  g.fillStyle = C.dim;
  g.globalAlpha = 0.5;
  for (let x = 0; x < 320; x += 2) {
    const h = 10 + 8 * Math.sin((x + drift) * 0.03) + 5 * Math.sin((x + drift) * 0.071);
    g.fillRect(x, BIRD.bottom - h, 2, h);
  }
  g.globalAlpha = 1;
  for (const p of G.pipes) {
    const top = p.gapY - BIRD.gap / 2;
    const bot = p.gapY + BIRD.gap / 2;
    g.fillStyle = C.teal;
    g.globalAlpha = 0.45;
    g.fillRect(p.x, BIRD.top, BIRD.pipeW, top - BIRD.top);
    g.fillRect(p.x, bot, BIRD.pipeW, BIRD.bottom - bot);
    g.globalAlpha = 1;
    g.fillRect(p.x - 3, top - 8, BIRD.pipeW + 6, 8);
    g.fillRect(p.x - 3, bot, BIRD.pipeW + 6, 8);
  }
  g.fillStyle = C.muted;
  g.fillRect(0, BIRD.bottom, 320, 1);
  const by = G.state === "ready" ? G.y + 4 * Math.sin(t * 4) : G.y;
  const over = G.state === "over";
  const up = now - G.flapAt < 120;
  const bx = BIRD.birdX;
  g.fillStyle = over ? C.coral : C.amber;
  g.beginPath();
  g.arc(bx, by, 7, 0, 7);
  g.fill();
  g.fillStyle = C.ink;
  g.beginPath();
  g.moveTo(bx - 7, by + (up ? -1 : 1));
  g.lineTo(bx - 1, by);
  g.lineTo(bx - 5, by + (up ? -8 : 7));
  g.fill();
  g.beginPath();
  g.arc(bx + 3, by - 2, 2, 0, 7);
  g.fill();
  g.fillStyle = C.coral;
  g.beginPath();
  g.moveTo(bx + 6, by - 1);
  g.lineTo(bx + 11, by + 1);
  g.lineTo(bx + 6, by + 3);
  g.fill();
  T(160, 48, String(G.score), C.ink, B12, "center");
  T(312, 41, `best ${st.best}`, C.muted, S8, "right");
  if (G.state === "ready") T(112, 112, "clap to fly!", C.pink, B12);
  if (over) {
    g.fillStyle = C.paper;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.roundRect(80, 70, 160, 44, 6);
    g.fill();
    g.globalAlpha = 1;
    T(160, 88, `score ${G.score}`, G.score >= st.best && st.best ? C.amber : C.ink, B12, "center");
    if (now - G.overAt > 800) T(104, 107, "clap to try again", C.muted, S8);
  }
}

function drawParty(g: G, C: ScopePalette, st: S6State): void {
  const T = textWriter(g);
  const now = performance.now();
  const since = now - st.lastBeat;
  if (st.lastBeat && since < 120) {
    g.fillStyle = `hsl(${st.hue} 90% 60%)`;
    g.globalAlpha = 1 - since / 120;
    g.fillRect(0, 30, 320, 6);
    g.globalAlpha = 1;
  }
  for (const r of st.rings) {
    const age = now - r.at;
    if (age > 700) continue;
    const col = `hsl(${r.hue} 90% 60%)`;
    g.strokeStyle = col;
    g.globalAlpha = 1 - age / 700;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(r.x, r.y, 4 + age * 0.09, 0, 7);
    g.stroke();
    if (age < 150) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(r.x, r.y, 6 - age / 30, 0, 7);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  g.lineWidth = 1;
  const bpm = st.beats.bpm();
  T(12, 82, bpm ? String(bpm) : "--", since < 150 ? `hsl(${st.hue} 80% 70%)` : C.ink, display(30));
  T(14, 95, "BPM", C.muted, S8);
  T(14, 109, `${st.beats.beats} beats`, C.muted, S8);
  const x = 8;
  const y = 130;
  const w = 304;
  g.fillStyle = C.dim;
  g.fillRect(x, y + 14, w, 1);
  for (const b of st.beatLog) {
    if (now - b > 8000) continue;
    g.fillStyle = C.amber;
    g.fillRect(x + w - ((now - b) * w) / 8000, y, 2, 14);
  }
  T(x, y + 25, "beats, last 8 s", C.muted, S8);
  T(x + w, y + 25, `sens x${st.beats.ratio.toFixed(1)}`, C.muted, S8, "right");
}
