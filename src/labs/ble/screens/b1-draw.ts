// B1's views: radar · list · inspect · air.
import { DISPLAY_FONT, drawText, type ScopePalette } from "@/lib/canvas";
import type { B1State, Kind } from "./b1";

/** Distance guess from RSSI: -59 dBm at 1 m, path-loss exponent 2.5. */
export const dist = (rssi: number) => Math.pow(10, (-59 - rssi) / 25);

const T = drawText;
const BOLD = `bold 12px ${DISPLAY_FONT}`;

const kindColour = (C: ScopePalette, k: Kind): string =>
  ({
    phone: C.blue,
    audio: C.amber,
    input: C.teal,
    tag: C.coral,
    computer: C.violet,
    bench: C.ink,
    unknown: C.muted,
  })[k];

const strongest = (st: B1State) => [...st.devices].sort((a, b) => b.rssi - a.rssi);

export function drawRadar(g: CanvasRenderingContext2D, C: ScopePalette, t: number, st: B1State) {
  const cx = 82;
  const cy = 98;
  const rim = 64;
  const rad = (m: number) => (Math.log10(1 + Math.min(m, 20)) / Math.log10(21)) * rim;
  const picked = st.devices[st.pick];
  g.strokeStyle = C.dim;
  g.lineWidth = 1;
  [1, 3, 10].forEach((m) => {
    g.beginPath();
    g.arc(cx, cy, rad(m), 0, 7);
    g.stroke();
    T(g, cx + rad(m) - 6, cy - 3, `${m}m`, C.dim);
  });
  g.beginPath();
  g.arc(cx, cy, rim, 0, 7);
  g.stroke();
  const sweep = (t * 1.6) % 6.283;
  if (st.scanning)
    for (let i = 0; i < 14; i++) {
      const a = sweep - i * 0.04;
      g.globalAlpha = 0.5 - i * 0.03;
      g.strokeStyle = C.teal;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * rim, cy + Math.sin(a) * rim);
      g.stroke();
    }
  g.globalAlpha = 1;
  g.fillStyle = C.blue;
  g.beginPath();
  g.arc(cx, cy, 3, 0, 7);
  g.fill();
  st.devices.forEach((d, i) => {
    const r = rad(dist(d.rssi));
    const x = cx + Math.cos(d.at) * r;
    const y = cy + Math.sin(d.at) * r;
    const behind = (sweep - d.at + 6.283) % 6.283;
    g.fillStyle = kindColour(C, d.kind);
    g.globalAlpha = st.scanning ? 0.6 + 0.4 * Math.max(0, 1 - behind / 2.5) : 0.6;
    g.beginPath();
    g.arc(x, y, d.rssi > -60 ? 4 : d.rssi > -75 ? 3 : 2, 0, 7);
    g.fill();
    g.globalAlpha = 1;
    if (i === st.pick) {
      g.strokeStyle = C.ink;
      g.beginPath();
      g.arc(x, y, 8 + Math.sin(t * 6) * 1.5, 0, 7);
      g.stroke();
    }
  });
  T(g, 170, 50, `${st.devices.length} devices`, C.ink, BOLD);
  T(
    g,
    170,
    62,
    `${st.pps[59] ?? 0} packets/s  ${st.scanning ? (st.active ? "active" : "passive") : "paused"}`,
    st.scanning ? C.teal : C.amber,
  );
  strongest(st)
    .slice(0, 6)
    .forEach((d, i) => {
      const y = 76 + i * 14;
      g.fillStyle = kindColour(C, d.kind);
      g.beginPath();
      g.arc(174, y, 3, 0, 7);
      g.fill();
      T(g, 182, y + 3, d.label, d === picked ? C.ink : C.muted);
      T(g, 284, y + 3, `${dist(d.rssi).toFixed(1)}m`, C.muted);
    });
}

export function drawList(g: CanvasRenderingContext2D, C: ScopePalette, st: B1State) {
  const picked = st.devices[st.pick];
  T(g, 6, 40, "#  name / maker        addr    dBm         age", C.dim);
  strongest(st).forEach((d, i) => {
    const y = 52 + i * 12;
    if (d === picked) {
      g.fillStyle = C.dim;
      g.fillRect(0, y - 8, 320, 12);
    }
    T(g, 6, y, String(i + 1), C.muted);
    g.fillStyle = kindColour(C, d.kind);
    g.fillRect(20, y - 6, 6, 7);
    T(g, 30, y, d.label, d === picked ? C.ink : C.muted);
    T(g, 144, y, d.addr, d.addr === "rpa" ? C.violet : C.muted);
    const col = d.rssi >= -67 ? C.teal : d.rssi >= -82 ? C.amber : C.coral;
    T(g, 186, y, String(Math.round(d.rssi)), col);
    g.fillStyle = col;
    g.fillRect(210, y - 5, Math.max(0, Math.min(60, d.rssi + 100)), 5);
    T(g, 290, y, `${((i * 0.7) % 3).toFixed(0)}s`, C.muted);
  });
}

export function drawInspect(g: CanvasRenderingContext2D, C: ScopePalette, st: B1State) {
  const d = st.devices[st.pick];
  if (!d) return;
  T(g, 6, 46, d.label, kindColour(C, d.kind), BOLD);
  T(
    g,
    6,
    60,
    `2C:4F:..:${(st.pick * 17 + 0x1a).toString(16).toUpperCase()}  ${d.addr}  connectable${st.active ? " +rsp" : ""}`,
    C.muted,
  );
  T(
    g,
    6,
    72,
    `${Math.round(d.rssi)} dBm ~${dist(d.rssi).toFixed(1)} m · every ${d.kind === "phone" ? 182 : 100} ms`,
    C.ink,
  );
  const fields: [number, string, string][] =
    d.kind === "phone"
      ? [
          [3, C.blue, "Flags 1A: discoverable"],
          [11, C.amber, "Apple: Nearby info (9 B)"],
          [3, C.teal, "TX power 12 dBm"],
        ]
      : [
          [3, C.blue, "Flags 06: discoverable, LE only"],
          [10, C.amber, `Name "${d.label}"`],
          [12, C.teal, "Maker data (10 B)"],
        ];
  T(g, 6, 86, `advert ${fields.reduce((a, f) => a + f[0], 0)}/31`, C.muted);
  let i = 0;
  fields.forEach(([n, col]) => {
    for (let k = 0; k < n; k++, i++) {
      g.fillStyle = col;
      g.globalAlpha = k < 2 ? 0.5 : 1;
      g.fillRect(90 + i * 7, 80, 6, 7);
    }
  });
  g.globalAlpha = 1;
  for (; i < 31; i++) {
    g.fillStyle = C.dim;
    g.fillRect(90 + i * 7, 80, 6, 7);
  }
  fields.forEach(([, col, s], k) => {
    g.fillStyle = col;
    g.fillRect(6, 96 + k * 11, 4, 5);
    T(g, 14, 101 + k * 11, s, C.ink);
  });
  if (st.active) {
    T(g, 6, 140, "scan rsp 12/31", C.muted);
    for (let k = 0; k < 31; k++) {
      g.fillStyle = k < 12 ? C.violet : C.dim;
      g.fillRect(90 + k * 7, 134, 6, 7);
    }
    T(g, 6, 152, "Name / 128-bit service", C.ink);
  }
}

export function drawAir(g: CanvasRenderingContext2D, C: ScopePalette, st: B1State) {
  T(g, 6, 40, "packets / s, last minute", C.muted);
  const peak = Math.max(...st.pps);
  const y0 = 120;
  g.fillStyle = C.dim;
  g.fillRect(6, y0, 180, 1);
  st.pps.forEach((p, i) => {
    const h = (p * (st.scanning ? st.window / 100 : 0.05) * 74) / peak;
    g.fillStyle = C.teal;
    g.globalAlpha = 0.6;
    g.fillRect(6 + i * 3, y0 - h, 2, h);
  });
  g.globalAlpha = 1;
  g.strokeStyle = C.amber;
  g.beginPath();
  st.pps.forEach((_, i) => {
    const y = y0 - 30 - Math.sin(i / 9) * 6;
    if (i) g.lineTo(6 + i * 3, y);
    else g.moveTo(6, y);
  });
  g.stroke();
  T(g, 6, 132, `peak ${peak}/s`, C.teal);
  T(g, 86, 132, "devices (max 7)", C.amber);
  T(
    g,
    6,
    144,
    `${st.scanning ? (st.active ? "active" : "passive") : "paused"} · ${st.window}/100 ms · ${st.window}% listening`,
    C.muted,
  );
  const kinds: [string, number, string][] = [
    ["public", 1, C.ink],
    ["random static", 1, C.teal],
    ["private (RPA)", 3, C.violet],
    ["private (NRPA)", 2, C.muted],
  ];
  T(g, 200, 40, "address types", C.muted);
  kinds.forEach(([n, c, col], k) => {
    const y = 52 + k * 22;
    T(g, 200, y, `${n}  ${c}`, C.muted);
    g.strokeStyle = C.dim;
    g.strokeRect(200, y + 4, 112, 6);
    g.fillStyle = col;
    g.fillRect(200, y + 4, (c * 112) / 7, 6);
  });
  T(g, 200, 146, "rpa = a phone hiding", C.violet);
}
