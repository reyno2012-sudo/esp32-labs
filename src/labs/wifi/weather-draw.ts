// wifi-lab-w3's views on the 320×170 canvas: animated sky, next 24 h, the week and the oracle.
import { drawText, SCREEN_H as H, SCREEN_W as W, type ScopePalette } from "@/lib/canvas";
import {
  ANSWERS,
  type Sky,
  typedLines,
  WEATHER_VIEWS,
  type WeatherState,
  WX,
} from "./weather-model";

// This lab's firmware uses the system fonts.
const MONO = "10px ui-monospace, monospace";
const MONO9 = "9px ui-monospace, monospace";
const MONO8 = "8px ui-monospace, monospace";
const BODY = "13px system-ui, sans-serif";
const BOLD = "bold 13px system-ui, sans-serif";

/** The scope palette plus the sky's own colours. */
export interface WeatherPalette {
  readonly C: ScopePalette;
  readonly rain: string;
  readonly cloud: string;
  readonly cloudDark: string;
}

function parseColor(c: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (hex?.[1]) {
    const v = Number.parseInt(hex[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c.trim());
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

/** `a` moved `k` of the way towards `b`; `a` when either is not a plain rgb colour. */
export function mixColor(a: string, b: string, k: number): string {
  const x = parseColor(a),
    y = parseColor(b);
  if (!x || !y) return a;
  const [r, g, bl] = x.map((v, i) => Math.round(v + ((y[i] ?? v) - v) * k));
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Clouds are greys between the screen's ink and its dim lines. */
export const weatherPalette = (C: ScopePalette): WeatherPalette => ({
  C,
  rain: C.blue,
  cloud: mixColor(C.ink, C.muted, 0.4),
  cloudDark: mixColor(C.muted, C.dim, 0.33),
});

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.fill();
}

function cloud(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const puffs: readonly (readonly [number, number, number])[] = [
    [x - r, y + r / 4, r * 0.75],
    [x, y - r / 3, r],
    [x + r, y + r / 4, r * 0.66],
  ];
  puffs.forEach(([a, b, rr]) => disc(g, a, b, rr, color));
  g.fillRect(x - r * 1.75, y + r / 4, r * 3.5, r * 0.75);
}

export function sky(
  g: CanvasRenderingContext2D,
  P: WeatherPalette,
  kind: Sky,
  cx: number,
  cy: number,
  r: number,
  t: number,
) {
  if (kind === "sun") {
    g.strokeStyle = P.C.amber;
    g.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.6 + i * 0.5236;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15);
      g.lineTo(cx + Math.cos(a) * r * 1.65, cy + Math.sin(a) * r * 1.65);
      g.stroke();
    }
    disc(g, cx, cy, r * 0.85, P.C.amber);
    return;
  }
  if (kind === "rain") {
    g.strokeStyle = P.rain;
    g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const x = cx - r * 1.3 + (i * r * 2.6) / 9,
        y = cy + ((t * r * 2.2 + i * 13) % (r * 1.3));
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 2, y + 6);
      g.stroke();
    }
    cloud(g, cx, cy - r / 2, r * 0.75, P.cloud);
    return;
  }
  const d = Math.sin(t * 0.5) * r * 0.25;
  cloud(g, cx + r / 2 - d, cy - r / 3, r * 0.66, P.cloudDark);
  cloud(g, cx - r / 4 + d, cy + r / 5, r * 0.75, P.cloud);
}

function nowView(g: CanvasRenderingContext2D, P: WeatherPalette, t: number) {
  const { C } = P;
  sky(g, P, "rain", 66, 92, 30, t);
  drawText(g, 142, 78, `${WX.temp}°C`, C.ink, "bold 34px system-ui, sans-serif");
  drawText(g, 142, 100, WX.desc, C.ink, BODY);
  drawText(g, 142, 118, `feels ${WX.feels}  wind ${WX.wind} km/h`, C.muted, MONO);
  drawText(g, 142, 130, `humidity ${WX.hum}%`, C.muted, MONO);
  drawText(g, 142, 142, "today 8 to 14", C.muted, MONO);
  drawText(g, 142, 154, "updated just now", C.muted, MONO);
}

function forecastView(g: CanvasRenderingContext2D, P: WeatherPalette) {
  const { C } = P;
  const x0 = 34,
    x1 = 312,
    lo = 7,
    hi = 15;
  const xOf = (i: number) => x0 + (i * (x1 - x0)) / 23;
  const yOf = (v: number) => 92 - ((v - lo) * 54) / (hi - lo);
  for (const v of [lo, hi]) {
    g.fillStyle = C.dim;
    for (let x = x0; x < x1; x += 4) g.fillRect(x, yOf(v), 1, 1);
    drawText(g, 4, yOf(v) + 3, String(v), C.muted, MONO9);
  }
  g.strokeStyle = C.amber;
  g.lineWidth = 1.5;
  g.beginPath();
  WX.hours.forEach((v, i) => (i ? g.lineTo(xOf(i), yOf(v)) : g.moveTo(xOf(i), yOf(v))));
  g.stroke();
  disc(g, xOf(0), yOf(WX.hours[0]), 3, C.amber);
  drawText(g, xOf(0) + 6, yOf(WX.hours[0]) - 4, "11 C now", C.ink, MONO9);
  drawText(g, 4, 110, "rain", C.muted, MONO9);
  drawText(g, 4, 144, "0%", C.muted, MONO9);
  WX.rain.forEach((v, i) => {
    const h = (v * 40) / 100;
    g.fillStyle = h ? P.rain : C.dim;
    g.fillRect(xOf(i) - 4, 144 - h, 8, Math.max(h, 1));
  });
  drawText(g, xOf(0) - 2, 102, "70%", P.rain, MONO9);
  for (let i = 0; i < 24; i += 6)
    drawText(g, xOf(i) - 6, 156, `${String((1 + i) % 24).padStart(2, "0")}h`, C.muted, MONO9);
}

function weekView(g: CanvasRenderingContext2D, P: WeatherPalette) {
  const { C } = P;
  const bx0 = 112,
    bx1 = 270,
    lo = 5,
    hi = 17;
  const xOf = (v: number) => bx0 + ((v - lo) * (bx1 - bx0)) / (hi - lo);
  WX.days.forEach(([d, mn, mx, k], i) => {
    const y = 36 + i * 17;
    if (!i) {
      g.fillStyle = C.dim;
      g.fillRect(2, y - 3, W - 4, 15);
    }
    drawText(g, 8, y + 8, d, i ? C.muted : C.ink, MONO);
    disc(g, 62, y + 4, 4, k === "sun" ? C.amber : k === "rain" ? P.rain : P.cloud);
    drawText(g, bx0 - 22, y + 8, String(mn).padStart(3), C.muted, MONO);
    g.fillStyle = C.dim;
    g.fillRect(bx0, y + 4, bx1 - bx0, 1);
    g.fillStyle = C.amber;
    g.fillRect(xOf(mn), y + 2, xOf(mx) - xOf(mn), 5);
    drawText(g, bx1 + 6, y + 8, String(mx), C.ink, MONO);
  });
}

const ORACLE_HINTS = [
  "Double-click: a haiku about right now",
  "Serial: ask should I bike to work?",
  "model: oracle (ai model <name> to switch)",
];

function oracleView(
  g: CanvasRenderingContext2D,
  P: WeatherPalette,
  st: WeatherState,
  t: number,
  now: number,
) {
  const { C } = P;
  const answer = st.answer === null ? undefined : ANSWERS[st.answer];
  if (st.asking) {
    drawText(g, 8, 56, "Asking oracle", C.ink, BODY);
    for (let i = 0; i < 3; i++)
      disc(g, 112 + i * 12, 52, 3, Math.sin(t * 5 - i) > 0 ? C.teal : C.dim);
  } else if (!answer) {
    drawText(g, 8, 56, "Ask the Bench Oracle", C.ink, BODY);
    ORACLE_HINTS.forEach((l, i) => drawText(g, 8, 80 + i * 14, l, C.muted, MONO));
  } else {
    sky(g, P, answer.scene, 290, 50, 11, t);
    if (answer.q) drawText(g, 8, 40, `> ${answer.q}`, C.muted, MONO9);
    drawText(g, 8, 60, answer.title, answer.color, BOLD);
    typedLines(answer.lines, now - st.answerAt).forEach((l, i) =>
      drawText(g, 8, 86 + i * 19, l, C.ink, BODY),
    );
    drawText(g, 8, 156, "claude-opus-5-5 via oracle  2.8 s  612 > 94 tokens", C.muted, MONO9);
  }
}

/** One whole frame. `t` drives the sky (frozen with reduced motion), `now` the typing. */
export function drawWeather(
  g: CanvasRenderingContext2D,
  P: WeatherPalette,
  st: WeatherState,
  t: number,
  now: number,
) {
  const { C } = P;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  const title = st.view < 3 ? "Weather" : "Bench";
  drawText(g, 8, 19, title, C.ink, BOLD);
  drawText(g, 14 + g.measureText(title).width, 19, WEATHER_VIEWS[st.view] ?? "", C.muted, BODY);
  drawText(g, 186, 12, WX.place, C.muted, MONO9);
  for (let i = 0; i < 5; i++) disc(g, 258 + i * 10, 20, 3, i === st.view ? C.ink : C.dim);
  disc(g, 312, 20, 4, C.teal);
  g.fillStyle = C.dim;
  g.fillRect(0, 28, W, 1);
  if (st.view === 0) nowView(g, P, t);
  else if (st.view === 1) forecastView(g, P);
  else if (st.view === 2) weekView(g, P);
  else oracleView(g, P, st, t, now);
  g.fillStyle = C.paper;
  g.fillRect(0, H - 11, W, 11);
  drawText(
    g,
    6,
    H - 2,
    st.view === 3 ? "click: view  double: new haiku" : "click: view  double: refresh  hold: oracle",
    C.muted,
    MONO8,
  );
  const right = st.asking ? "asking the ai..." : st.footer;
  g.font = MONO8;
  drawText(
    g,
    W - 6 - g.measureText(right).width,
    H - 2,
    right,
    st.asking ? C.amber : C.teal,
    MONO8,
  );
}
