// wifi-lab-w1's four views on the 320×170 canvas, ported from the firmware's drawing code.
import {
  DISPLAY_FONT,
  drawText,
  MONO_FONT,
  SCREEN_H as H,
  SCREEN_W as W,
  type ScopePalette,
} from "@/lib/canvas";
import {
  bssidAngle,
  bssidHue,
  CLEAN_CHANNELS,
  EXAMPLE_NETS,
  netName,
  signalBars,
  strength,
} from "./example-nets";
import { SCANNER_VIEWS, type ScannerState } from "./scanner-model";

const MONO = `9px ${MONO_FONT}`;
const BODY = `13px ${DISPLAY_FONT}`;

const strengthColor = (C: ScopePalette, rssi: number) =>
  ({ good: C.teal, fair: C.amber, poor: C.coral })[strength(rssi)];

/** Shortens `text` with ".." until it fits `w` pixels in the current font. */
export function fitText(g: CanvasRenderingContext2D, text: string, w: number): string {
  if (g.measureText(text).width <= w) return text;
  let t = text;
  while (t.length > 1 && g.measureText(`${t}..`).width > w) t = t.slice(0, -1);
  return `${t}..`;
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.fillStyle = color;
  g.fill();
}

const dottedLine = (
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  x0: number,
  x1: number,
  y: number,
) => {
  g.fillStyle = C.dim;
  for (let x = x0; x < x1; x += 4) g.fillRect(x, y, 1, 1);
};

function header(g: CanvasRenderingContext2D, C: ScopePalette, st: ScannerState) {
  drawText(g, 8, 19, "Wi-Fi", C.ink, `700 13px ${DISPLAY_FONT}`);
  drawText(g, 46, 19, SCANNER_VIEWS[st.view] ?? "", C.muted, BODY);
  drawText(
    g,
    186,
    13,
    st.scans === 0 && st.scanning ? "first scan..." : `${st.nets.length} networks  ${st.lastMs} ms`,
    C.muted,
    MONO,
  );
  for (let i = 0; i < SCANNER_VIEWS.length; i++)
    dot(g, 266 + i * 10, 20, 3, i === st.view ? C.ink : C.dim);
  dot(g, 312, 20, 4, st.link === "up" ? C.teal : st.link === "joining" ? C.amber : C.dim);
  g.fillStyle = C.dim;
  g.fillRect(0, 28, W, 1);
}

function footer(g: CanvasRenderingContext2D, C: ScopePalette, st: ScannerState, now: number) {
  g.fillStyle = C.paper;
  g.fillRect(0, H - 11, W, 11);
  drawText(g, 6, H - 3, "click: view  double: scan  hold: auto", C.muted, MONO);
  const label = st.scanning
    ? `scanning${".".repeat(Math.floor(now / 250) % 4)}`
    : st.auto
      ? "auto 10 s"
      : "auto off";
  drawText(g, W - 66, H - 3, label, st.scanning ? C.amber : st.auto ? C.teal : C.muted, MONO);
}

function list(g: CanvasRenderingContext2D, C: ScopePalette, st: ScannerState) {
  const { nets } = st;
  if (!nets.length) {
    drawText(g, 8, 92, "No networks yet", C.muted, BODY);
    return;
  }
  const pages = Math.ceil(nets.length / 5);
  const page = st.page % pages;
  for (let r = 0; r < 5; r++) {
    const n = nets[page * 5 + r];
    if (!n) break;
    const y = 32 + r * 25;
    if (r % 2) {
      g.globalAlpha = 0.03;
      g.fillStyle = C.ink;
      g.fillRect(0, y, W, 25);
      g.globalAlpha = 1;
    }
    const color = strengthColor(C, n.rssi);
    for (let b = 0; b < 4; b++) {
      const h = 4 + b * 3;
      g.fillStyle = b < signalBars(n.rssi) ? color : C.dim;
      g.fillRect(8 + b * 5, y + 18 - h, 3, h);
    }
    g.font = BODY;
    drawText(g, 34, y + 17, fitText(g, netName(n), 176), n.ssid ? C.ink : C.muted, BODY);
    drawText(g, 216, y + 15, `ch${String(n.ch).padStart(2)}`, C.muted, MONO);
    if (n.auth === "open") drawText(g, 244, y + 15, "open", C.coral, MONO);
    else {
      // A little padlock.
      g.strokeStyle = C.muted;
      g.lineWidth = 1;
      g.strokeRect(249.5, y + 7.5, 5, 5);
      g.fillStyle = C.muted;
      g.fillRect(248, y + 11, 8, 6);
    }
    drawText(g, 276, y + 15, String(n.rssi).padStart(4), color, MONO);
    drawText(g, 300, y + 15, "dB", C.muted, MONO);
  }
  if (pages > 1) drawText(g, W - 70, H - 15, `page ${page + 1}/${pages}`, C.muted, MONO);
}

function channels(g: CanvasRenderingContext2D, C: ScopePalette, st: ScannerState) {
  const { nets } = st;
  const x0 = 22,
    x1 = 312,
    base = 140,
    top = 40,
    slot = (x1 - x0) / 14;
  const cx = (c: number) => x0 + c * slot;
  const hy = (r: number) => base - ((Math.min(-30, Math.max(-95, r)) + 95) * (base - top)) / 65;
  for (const db of [-40, -60, -80]) {
    dottedLine(g, C, x0, x1, hy(db));
    drawText(g, 0, hy(db) + 3, String(db), C.muted, MONO);
  }
  // Weakest first, so the strongest curves end up on top.
  for (let k = nets.length - 1; k >= 0; k--) {
    const n = nets[k];
    if (!n) continue;
    const c = cx(n.ch),
      peak = hy(n.rssi),
      hw = slot * 2.2,
      color = bssidHue(n.bssid);
    g.strokeStyle = color;
    g.lineWidth = 1.4;
    g.beginPath();
    for (let dx = -hw; dx <= hw; dx += 2) {
      const f = dx / hw,
        y = base - (base - peak) * (1 - f * f);
      if (dx === -hw) g.moveTo(c + dx, y);
      else g.lineTo(c + dx, y);
    }
    g.stroke();
    if (k < 3) {
      g.font = MONO;
      drawText(
        g,
        Math.min(W - 40, Math.max(2, c - 20)),
        peak - 6,
        fitText(g, netName(n), 64),
        color,
        MONO,
      );
    }
  }
  g.fillStyle = C.muted;
  g.fillRect(x0, base, x1 - x0, 1);
  for (let c = 1; c <= 13; c++) {
    const count = nets.filter((n) => n.ch === c).length;
    drawText(
      g,
      cx(c),
      base + 11,
      String(c),
      CLEAN_CHANNELS.includes(c) ? C.amber : C.muted,
      MONO,
      "center",
    );
    if (count) drawText(g, cx(c), base + 21, String(count), C.ink, MONO, "center");
  }
}

function radar(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  st: ScannerState,
  t: number,
  reduce: boolean,
) {
  const { nets } = st;
  const cx = 222,
    cy = 98,
    rMax = 66;
  const rad = (r: number) => 6 + ((-30 - Math.min(-30, Math.max(-95, r))) * (rMax - 6)) / 65;
  g.strokeStyle = C.dim;
  g.lineWidth = 1;
  for (const db of [-50, -70, -90]) {
    g.beginPath();
    g.arc(cx, cy, rad(db), 0, 7);
    g.stroke();
    drawText(g, cx + 3, cy - rad(db) - 2, String(db), C.muted, MONO);
  }
  g.beginPath();
  g.moveTo(cx - rMax, cy);
  g.lineTo(cx + rMax, cy);
  g.moveTo(cx, cy - rMax);
  g.lineTo(cx, cy + rMax);
  g.stroke();
  // The sweep with its fading tail: fast while scanning.
  const a = reduce ? 0.8 : t * (st.scanning ? 4 : 1.2);
  g.strokeStyle = C.teal;
  for (let k = 0; k < 10; k++) {
    const ak = a - k * 0.06;
    g.globalAlpha = (200 - k * 20) / 255;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(ak) * rMax, cy + Math.sin(ak) * rMax);
    g.stroke();
  }
  g.globalAlpha = 1;
  for (let k = nets.length - 1; k >= 0; k--) {
    const n = nets[k];
    if (!n) continue;
    const ang = bssidAngle(n.bssid),
      r = rad(n.rssi);
    dot(g, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, k < 3 ? 4 : 2, strengthColor(C, n.rssi));
  }
  drawText(g, 8, 50, "Closest", C.ink, BODY);
  nets.slice(0, 5).forEach((n, k) => {
    dot(g, 11, 64 + k * 16, 3, strengthColor(C, n.rssi));
    g.font = MONO;
    drawText(g, 20, 67 + k * 16, fitText(g, netName(n), 102), C.ink, MONO);
    drawText(g, 126, 67 + k * 16, String(n.rssi), C.muted, MONO);
  });
}

const NOT_JOINED = [
  "1. Open the serial monitor",
  "2. Find your network in the scan table",
  "3. Type: join <number>",
  "4. Type the password on the next line",
  "   (stored on the chip only, never logged)",
];

function status(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  st: ScannerState,
  t: number,
  now: number,
) {
  if (st.link === "none") {
    drawText(g, 8, 54, "Not joined to a network yet", C.ink, BODY);
    NOT_JOINED.forEach((l, i) => drawText(g, 8, 76 + i * 14, l, C.muted, MONO));
    return;
  }
  const n = st.nets[0] ?? EXAMPLE_NETS[0];
  if (!n) return;
  if (st.link === "joining") {
    drawText(g, 8, 54, "Joining", C.amber, BODY);
    drawText(g, 8, 76, n.ssid, C.ink, BODY);
    drawText(g, 8, 96, `${Math.floor((now - st.linkAt) / 1000)} s ...`, C.muted, MONO);
    for (let k = 0; k < 8; k++) {
      const a = t * 6 + k * 0.785;
      g.globalAlpha = 1 - k * 0.11;
      dot(g, 270 + Math.cos(a) * 18, 80 + Math.sin(a) * 18, k ? 2 : 4, C.amber);
    }
    g.globalAlpha = 1;
    return;
  }
  const d = new Date();
  const p2 = (v: number) => String(v).padStart(2, "0");
  drawText(
    g,
    8,
    72,
    `${p2(d.getHours())}:${p2(d.getMinutes())}`,
    C.ink,
    `700 40px ${DISPLAY_FONT}`,
  );
  drawText(g, 126, 72, p2(d.getSeconds()), C.muted, `15px ${DISPLAY_FONT}`);
  drawText(
    g,
    8,
    94,
    d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    C.muted,
    BODY,
  );
  const hist = st.rssiHist;
  const r = hist.at(-1) ?? n.rssi;
  const facts: readonly (readonly [string, string])[] = [
    [n.ssid, C.teal],
    ["192.168.1.42 (example)", C.ink],
    ["bench.local", C.muted],
    [`ch ${n.ch}  ${r} dBm`, C.muted],
    [`up ${Math.floor((now - st.linkAt) / 60000)} min`, C.muted],
  ];
  facts.forEach(([s, c], i) => drawText(g, 188, 44 + i * 14, s, c, MONO));
  // The live signal chart: one sample a second, the last minute.
  const x0 = 30,
    x1 = 312,
    y0 = 108,
    y1 = 150;
  const yOf = (db: number) => y1 - ((Math.min(-30, Math.max(-95, db)) + 95) * (y1 - y0)) / 65;
  for (const db of [-50, -70, -90]) {
    dottedLine(g, C, x0, x1, yOf(db));
    drawText(g, 2, yOf(db) + 3, String(db), C.muted, MONO);
  }
  g.lineWidth = 1.3;
  g.beginPath();
  hist.forEach((v, i) => {
    const x = x1 - ((hist.length - 1 - i) * (x1 - x0)) / 59;
    if (i) g.lineTo(x, yOf(v));
    else g.moveTo(x, yOf(v));
  });
  g.strokeStyle = strengthColor(C, r);
  g.stroke();
}

/** One whole frame: the current view, then the status bar and footer over it. */
export function drawScanner(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  st: ScannerState,
  now: number,
  reduce: boolean,
) {
  const t = now / 1000;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  if (st.view === 0) list(g, C, st);
  else if (st.view === 1) channels(g, C, st);
  else if (st.view === 2) radar(g, C, st, t, reduce);
  else status(g, C, st, t, now);
  header(g, C, st);
  footer(g, C, st, now);
}
