// Views several labs share: the Bench service table, the live link and the activity log.
import { DISPLAY_FONT, drawText, type ScopePalette } from "@/lib/canvas";
import { hx } from "../../protocol/hex";
import { MARK_TINT, type LoggingState } from "../../kit/state";
import type { BenchState, OpKind } from "./bench";

/** The gatt view: one row per characteristic; an operation lights its row and sends a dot. */
export function drawGatt(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  t: number,
  st: BenchState,
  vault = false,
): void {
  const T = (x: number, y: number, s: string, col: string) => drawText(g, x, y, s, col);
  T(6, 40, "Bench service ba5e0000-...", C.muted);
  g.strokeStyle = C.muted;
  g.lineWidth = 1;
  g.strokeRect(292, 66, 22, 44);
  const [r, gr, b] = st.led;
  const rows: [string, string, string][] = [
    ["LED", "R W", `${hx(r)} ${hx(gr)} ${hx(b)}`],
    ["Message", "R W", `"${st.message.slice(0, 14)}"`],
    ["Button", "R N", `#${st.count}`],
    ["Temperature", "R N", `${st.temp.toFixed(2)} C`],
    ["Uptime", "R", `${Math.floor(t)}s`],
  ];
  if (vault) rows.push(["Vault", "R W lock", "encrypted"]);
  const OPC: Readonly<Record<OpKind, string>> = {
    read: C.teal,
    write: C.blue,
    notify: C.violet,
    subscribe: C.amber,
    refused: C.coral,
  };
  rows.forEach(([n, p, v], i) => {
    const y = 46 + i * 18;
    const op = st.ops[i];
    const age = op ? t - op.at : 9;
    g.fillStyle = C.dim;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.roundRect(4, y - 2, 238, 16, 3);
    g.fill();
    g.globalAlpha = 1;
    if (op && age < 0.9) {
      g.fillStyle = OPC[op.kind];
      g.globalAlpha = 0.8 * (1 - age / 0.9);
      g.beginPath();
      g.roundRect(4, y - 2, 238, 16, 3);
      g.fill();
      g.globalAlpha = 1;
    }
    T(10, y + 9, n, C.ink);
    T(84, y + 9, p, C.muted);
    if (st.sub[i]) {
      g.fillStyle = C.amber;
      g.fillRect(126, y + 1, 7, 6);
      g.fillRect(125, y + 7, 9, 1);
    }
    T(140, y + 9, v, age < 0.9 ? C.ink : C.muted);
    // The LED's own colour is data, shown as a swatch.
    if (i === 0) {
      g.fillStyle = `rgb(${r},${gr},${b})`;
      g.fillRect(222, y + 1, 14, 10);
    }
    if (op && age < 0.6) {
      const k = age / 0.6;
      const out = op.kind === "notify";
      const x = out ? 244 + k * 46 : 290 - k * 46;
      const yy = y + 6 + (88 - y - 6) * (out ? k : 1 - k);
      g.fillStyle = OPC[op.kind];
      g.beginPath();
      g.arc(x, yy, 3, 0, 7);
      g.fill();
      T(248, y + 9, op.kind, OPC[op.kind]);
    }
  });
}

/** The link view: the connection events ticking between peripheral and central, and its numbers. */
export function drawLink(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  t: number,
  st: BenchState,
): void {
  const T = (x: number, y: number, s: string, col: string, font?: string) =>
    drawText(g, x, y, s, col, font);
  const B = `bold 12px ${DISPLAY_FONT}`;
  g.strokeStyle = C.blue;
  g.lineWidth = 1;
  g.strokeRect(8, 40, 44, 44);
  g.strokeRect(134, 36, 32, 52);
  T(12, 64, "periph", C.ink);
  T(136, 64, "central", C.ink);
  T(12, 94, "this board", C.muted);
  T(134, 94, "phone", C.muted);
  if (st.radio !== "connected") {
    T(60, 60, "waiting...", C.muted);
    return;
  }
  const period = Math.max((st.interval * 20) / 1000, 0.15);
  const k = (t % period) / period;
  g.fillStyle = C.dim;
  g.fillRect(54, 56, 76, 1);
  g.fillRect(54, 68, 76, 1);
  g.fillStyle = st.encrypted ? C.violet : C.blue;
  g.beginPath();
  g.arc(54 + k * 76, 56, 3, 0, 7);
  g.fill();
  g.fillStyle = C.teal;
  g.beginPath();
  g.arc(130 - k * 76, 68, 3, 0, 7);
  g.fill();
  const stats: [string, string, number, number, string][] = [
    ["interval", `${st.interval.toFixed(2)} ms`, 190, 40, C.blue],
    ["MTU", "255 B", 264, 40, C.ink],
    ["latency", String(st.latency), 190, 76, C.ink],
    ["timeout", "720 ms", 264, 76, C.ink],
    ["PHY tx/rx", st.phy, 190, 112, C.ink],
    ["RSSI", `${st.rssi} dBm`, 264, 112, C.teal],
  ];
  stats.forEach(([l, v, x, y, c]) => {
    T(x, y, l, C.muted);
    T(x, y + 18, v, c, B);
  });
  T(8, 120, st.encrypted ? "encrypted + bonded" : "plain text", st.encrypted ? C.violet : C.muted);
  T(8, 132, `5A:3C:91:2E:7B:44  up ${Math.floor(t % 300)}s`, C.muted);
  T(8, 144, `rx ${st.rx} ops`, C.blue);
  T(8, 154, `tx ${st.tx} ops`, C.violet);
}

/** The log view: the last ten lines, newest at the bottom. */
export function drawLog(g: CanvasRenderingContext2D, C: ScopePalette, st: LoggingState): void {
  const lines = st.log.slice(-10);
  lines.forEach(([ts, m, s], i) => {
    const y = 42 + i * 12;
    drawText(g, 4, y, ts, C.dim);
    drawText(g, 50, y, m, C[MARK_TINT[m]]);
    drawText(g, 60, y, s, i === lines.length - 1 ? C.ink : C.muted);
  });
}
