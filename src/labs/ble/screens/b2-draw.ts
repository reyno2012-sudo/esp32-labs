// B2's views: packet · air · budget.
import { DISPLAY_FONT, drawText, type ScopePalette } from "@/lib/canvas";
import { type AdField, b2Bytes, b2Pdu } from "../protocol/advertising";
import { b2Budget } from "../protocol/budget";
import { hx, int8 } from "../protocol/hex";
import type { B2State } from "./b2";

const T = (
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: string,
  col: string,
  font?: string,
) => drawText(g, x, y, s, col, font);
const BOLD = `bold 12px ${DISPLAY_FONT}`;

export function drawPacket(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  t: number,
  st: B2State,
  advF: AdField[],
  rspF: AdField[],
  adv: number[],
) {
  const COLS = [C.blue, C.amber, C.teal, C.violet, C.coral];
  const col = (i: number) => COLS[i % 5] ?? C.blue;
  T(g, 6, 44, `${st.mode}  ${b2Pdu(st)}  every ${st.interval} ms`, st.on ? C.blue : C.muted, BOLD);
  const rowCells = (
    y: number,
    fields: AdField[],
    bytes: number[],
    flash: boolean,
    title: string,
  ) => {
    T(g, 6, y + 8, `${title} ${bytes.length}/31`, bytes.length ? C.muted : C.dim);
    const owner: (readonly [number, boolean])[] = [];
    fields.forEach(([, , d], fi) => {
      for (let j = 0; j < d.length + 2; j++) owner.push([fi, j < 2]);
    });
    for (let i = 0; i < 31; i++) {
      const o = owner[i];
      g.fillStyle = o ? col(o[0]) : C.dim;
      if (o) g.globalAlpha = o[1] ? 0.55 : 1;
      g.fillRect(82 + i * 7, y, 6, 9);
      g.globalAlpha = 1;
      const changed = st.changed[i] ?? -9;
      if (flash && o && t - changed < 0.7) {
        g.fillStyle = C.ink;
        g.globalAlpha = 1 - (t - changed) / 0.7;
        g.fillRect(82 + i * 7, y, 6, 9);
        g.globalAlpha = 1;
      }
    }
  };
  const decode = (y: number, fields: AdField[]) => {
    fields.forEach(([type, name, d], i) => {
      let s = `${hx(type)} ${name} (${d.length} B)`;
      if (type === 0x01) s = "Flags 06: discoverable, LE only";
      if (type === 0x09) s = `Name "${String.fromCharCode(...d)}"`;
      if (type === 0x0a) s = `TX power ${int8(d[0] ?? 0)} dBm`;
      if (type === 0x19) s = "Appearance 0540 (generic sensor)";
      if (name === "Maker FFFF")
        s = `FFFF: ${st.presses} presses ${st.temp.toFixed(2)}C up ${st.uptime}s`;
      if (name === "iBeacon") s = `iBeacon major ${st.major} minor ${st.minor}, -59 dBm at 1 m`;
      if (name === "Services") s = "Services: FEAA (Eddystone)";
      if (name === "Eddystone") s = `Eddystone-URL ${st.url}`;
      g.fillStyle = col(i);
      g.fillRect(6, y + i * 11 - 5, 4, 5);
      T(g, 14, y + i * 11, s, C.ink);
    });
    return y + fields.length * 11;
  };
  rowCells(52, advF, adv, true, "advert");
  const y = decode(76, advF);
  const rsp = b2Bytes(rspF);
  rowCells(y, rspF, rsp, false, "scan rsp");
  if (rsp.length) decode(y + 22, rspF);
  else
    T(
      g,
      6,
      y + 22,
      st.scanresp ? "(nothing left to put here)" : "off: a scanner that asks gets no answer",
      C.muted,
    );
}

export function drawAir(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  t: number,
  st: B2State,
  advLen: number,
) {
  // Simulated events from the settings, like b2v::AirSim.
  const now = t * 1000;
  if (!st.on) st.nextEv = now;
  while (st.on && st.nextEv <= now) {
    const d = Math.floor(Math.random() * 11);
    st.evs.push([st.nextEv, d]);
    st.lastEv = st.nextEv;
    st.nextEv += st.interval + d;
  }
  const span = Math.max(120, Math.min(6000, st.interval * 3 + 60));
  st.evs = st.evs.filter(([e]) => now - e < span);
  g.strokeStyle = C.blue;
  g.strokeRect(14, 57, 24, 18);
  T(g, 17, 69, "B2", C.ink);
  const since = now - st.lastEv;
  if (st.on && since < 400)
    for (let i = 0; i < 3; i++) {
      g.globalAlpha = Math.max(0, 1 - since / 400 - i * 0.2);
      g.beginPath();
      g.arc(26, 66, 14 + (since / 400) * 22 + i * 5, 0, 7);
      g.stroke();
    }
  g.globalAlpha = 1;
  ["37", "38", "39"].forEach((n, c) => {
    g.fillStyle = C.dim;
    g.fillRect(70, 50 + c * 16, 242, 1);
    T(g, 46, 52 + c * 16, n, C.muted);
  });
  const chCol = [C.blue, C.teal, C.violet];
  st.evs.forEach(([e, d], i, a) => {
    const x = 312 - ((now - e) * 242) / span;
    chCol.forEach((col, c) => {
      g.fillStyle = col;
      g.fillRect(x + c * 2, 46 + c * 16, 2, 9);
    });
    if (i >= a.length - 3) T(g, x - 6, 99, `+${d}`, C.dim);
  });
  T(g, 70, 109, `last ${span} ms`, C.dim);
  T(g, 294, 109, "now", C.dim);
  const airUs = (16 + advLen) * 8;
  const k = 200 / ((airUs + 150) * 3);
  T(g, 6, 123, "one event:", C.muted);
  ["37 2402", "38 2426", "39 2480"].forEach((n, c) => {
    const x = 70 + c * (airUs + 150) * k;
    g.fillStyle = chCol[c] ?? C.blue;
    g.fillRect(x, 116, Math.max(2, airUs * k), 9);
    T(g, x, 134, `ch${n}`, C.muted);
  });
  T(g, 6, 147, `${airUs} us each, ${(airUs + 150) * 3} us per event`, C.ink);
  const ps = 1000 / (st.interval + 5);
  T(
    g,
    6,
    157,
    `${ps.toFixed(1)} events/s = ${Math.round(ps * 3)} packets/s${st.on ? "" : "  (off)"}`,
    st.on ? C.teal : C.muted,
  );
}

export function drawBudget(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  st: B2State,
  advLen: number,
) {
  const e = b2Budget(st.interval, st.tx, advLen);
  T(g, 6, 40, "ESTIMATE for a coin-cell beacon chip, not this board", C.amber);
  let x = 6;
  const parts: [number, string, string][] = [
    [e.tx, C.blue, "sending"],
    [e.rx, C.teal, "listening"],
    [e.wake, C.amber, "waking"],
    [e.sleep, C.muted, "sleeping"],
  ];
  parts.forEach(([v, c, n], i) => {
    const w = (v / e.total) * 300;
    g.fillStyle = c;
    g.fillRect(x, 46, w, 10);
    x += w;
    g.fillRect(6 + i * 78, 61, 5, 5);
    T(g, 14 + i * 78, 67, `${n} ${v.toFixed(1)} uA`, C.muted);
  });
  T(g, 6, 80, "average", C.muted);
  T(g, 6, 98, `${e.total.toFixed(1)} uA`, C.ink, BOLD);
  T(g, 100, 80, "on a CR2032", C.muted);
  T(
    g,
    100,
    98,
    e.days > 730 ? `${(e.days / 365).toFixed(1)} years` : `${Math.round(e.days)} days`,
    e.days > 365 ? C.teal : e.days > 60 ? C.amber : C.coral,
    BOLD,
  );
  T(g, 210, 80, "settings", C.muted);
  T(g, 210, 98, `${st.tx} dBm, ${st.interval} ms`, C.ink, BOLD);
  T(g, 4, 106, "this board draws ~80 mA: far too much for a coin cell", C.muted);
  const maxD = b2Budget(10000, st.tx, advLen).days;
  g.strokeStyle = C.blue;
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const ms = 20 * Math.pow(500, i / 40);
    const px = 30 + i * 7;
    const py = 150 - (b2Budget(ms, st.tx, advLen).days / maxD) * 36;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
  g.fillStyle = C.dim;
  g.fillRect(30, 150, 280, 1);
  const pos = Math.log(st.interval / 20) / Math.log(500);
  g.fillStyle = C.amber;
  g.beginPath();
  g.arc(30 + pos * 280, 150 - (e.days / maxD) * 36, 3, 0, 7);
  g.fill();
  T(g, 4, 120, "life", C.dim);
  T(g, 28, 157, "20ms", C.dim);
  T(g, 150, 157, "interval (log)", C.dim);
  T(g, 288, 157, "10s", C.dim);
}
