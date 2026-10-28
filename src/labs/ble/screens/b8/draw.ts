// B8's views: devices · explore · keyboard · mouse · reports · link · log.
import { DISPLAY_FONT, drawText, MONO_FONT, type ScopePalette } from "@/lib/canvas";
import { MARK_TINT } from "../../kit/state";
import { hx } from "../../protocol/hex";
import type { B8State } from "./state";

type Ctx = CanvasRenderingContext2D;
const T = (g: Ctx, x: number, y: number, s: string, col: string, font?: string) =>
  drawText(g, x, y, s, col, font);
const BOLD = `bold 12px ${DISPLAY_FONT}`;

/** What the board is busy with, as a box over the view. */
function busy(g: Ctx, C: ScopePalette, t: number, st: B8State) {
  if (!st.phase) return;
  g.fillStyle = C.paper;
  g.strokeStyle = C.amber;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(40, 74, 240, 46, 8);
  g.fill();
  g.stroke();
  T(g, 52, 98, `${st.phase} ${st.phase === "connecting" ? st.target : ""}`, C.ink, BOLD);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.9 + i / 3) % 1;
    g.fillStyle = i ? C.dim : C.blue;
    g.beginPath();
    g.arc(56 + k * 208, 110, 2, 0, 7);
    g.fill();
  }
}

const hint = (g: Ctx, C: ScopePalette, st: B8State, what: string) =>
  T(
    g,
    6,
    66,
    st.radio !== "connected"
      ? `No ${what} yet: connect one on the devices view.`
      : `Connected. Long press (or host) to use the ${what}.`,
    C.muted,
  );

export function drawB8(g: Ctx, C: ScopePalette, view: number, t: number, st: B8State): void {
  if (view === 0) drawDevices(g, C, st);
  else if (view === 1) {
    if (!drawExplore(g, C, st)) return busy(g, C, t, st);
  } else if (view === 2) {
    if (st.hosting !== "keyboard") {
      hint(g, C, st, "keyboard");
      return busy(g, C, t, st);
    }
    return drawKeyboard(g, C, t, st);
  } else if (view === 3) {
    if (st.hosting !== "mouse") {
      hint(g, C, st, "mouse");
      return busy(g, C, t, st);
    }
    return drawMouse(g, C, st);
  } else if (view === 4) {
    if (!st.hosting) {
      hint(g, C, st, "keyboard or mouse");
      return busy(g, C, t, st);
    }
    return drawReports(g, C, st);
  } else if (view === 5) return drawLink(g, C, t, st);
  else return drawLog(g, C, st);
  busy(g, C, t, st);
}

function drawDevices(g: Ctx, C: ScopePalette, st: B8State) {
  T(g, 6, 41, "#  device (connectable only)       signal  dBm", C.dim);
  st.devices.forEach((d, i) => {
    const y = 53 + i * 12;
    if (i === st.pick) {
      g.fillStyle = C.dim;
      g.fillRect(0, y - 9, 320, 12);
    }
    T(g, 6, y, String(i + 1), C.muted);
    if (d.hid) {
      g.strokeStyle = C.teal;
      g.lineWidth = 1;
      g.strokeRect(20.5, y - 7.5, 12, 7);
    }
    T(g, 38, y, d.name, i === st.pick ? C.ink : C.muted);
    if (d.bonded) {
      g.strokeStyle = C.amber;
      g.beginPath();
      g.arc(171, y - 3, 3, 0, 7);
      g.moveTo(174, y - 3);
      g.lineTo(181, y - 3);
      g.stroke();
    }
    const bars = d.rssi >= -55 ? 4 : d.rssi >= -67 ? 3 : d.rssi >= -78 ? 2 : 1;
    const col = d.rssi >= -67 ? C.teal : d.rssi >= -82 ? C.amber : C.coral;
    for (let k = 0; k < 4; k++) {
      const h = 3 + k * 3;
      g.fillStyle = k < bars ? col : C.dim;
      g.fillRect(230 + k * 4, y + 1 - h, 3, h);
    }
    T(g, 256, y, String(d.rssi), col);
    if (d.hid) T(g, 284, y, "HID", C.teal);
  });
}

/** False when there is nothing to explore yet. */
function drawExplore(g: Ctx, C: ScopePalette, st: B8State): boolean {
  if (!st.tree.length) {
    T(g, 6, 51, "Connect to a device first: devices view,", C.muted);
    T(g, 6, 63, "pick it (double-click), then long press.", C.muted);
    return false;
  }
  T(
    g,
    6,
    41,
    `${st.target}  ${st.tree.filter((n) => n.l === 0).length} services ${st.tree.filter((n) => n.l === 1).length} chars`,
    C.ink,
  );
  st.tree.slice(0, 8).forEach((n, i) => {
    const y = 53 + i * 11;
    T(g, 6 + n.l * 10, y, n.t, n.l === 0 ? C.blue : n.l === 1 ? C.ink : C.dim);
    if (n.p) T(g, 160, y, n.p, C.muted);
    if (n.v) T(g, 186, y, n.v, n.l === 0 ? C.dim : C.teal);
  });
  if (st.treeNote)
    st.treeNote
      .split("\n")
      .forEach((l, i) =>
        T(g, 6, 141 + i * 10, l, st.treeNote.startsWith("A key") ? C.teal : C.amber),
      );
  return true;
}

function drawKeyboard(g: Ctx, C: ScopePalette, t: number, st: B8State) {
  const lines: string[] = [];
  let cur = "";
  for (const ch of st.text) {
    if (ch === "\n" || cur.length === 26) {
      lines.push(cur);
      cur = ch === "\n" ? "" : ch;
    } else cur += ch;
  }
  lines.push(cur);
  const shown = lines.slice(-5);
  const big = `16px ${MONO_FONT}`;
  shown.forEach((l, i) => T(g, 6, 50 + i * 17, l, C.ink, big));
  const last = shown.at(-1) ?? "";
  g.font = big;
  if (Math.floor(t * 2) % 2) {
    g.fillStyle = C.teal;
    g.fillRect(6 + g.measureText(last).width, 37 + (shown.length - 1) * 17, 9, 15);
  }
  ["Ctl", "Sft", "Alt", "Cmd", "Ctl", "Sft", "AGr", "Cmd"].forEach((c, i) => {
    const x = 6 + i * 26 + (i >= 4 ? 8 : 0);
    const on = st.mods & (1 << i);
    g.fillStyle = on ? C.amber : C.dim;
    g.beginPath();
    g.roundRect(x, 124, 23, 12, 2);
    g.fill();
    T(g, x + 3, 133, c, on ? C.paper : C.muted);
  });
  T(
    g,
    228,
    133,
    `keys${st.held.map((k) => " " + hx(k)).join("")}`,
    st.held.length ? C.teal : C.dim,
  );
  T(
    g,
    6,
    151,
    `layout ${st.de ? "DE" : "US"}  ${st.keys} keys  ${st.boot ? "boot protocol" : "report protocol"}`,
    C.muted,
  );
  if (st.mediaAt && performance.now() - st.mediaAt < 2500) {
    g.fillStyle = C.violet;
    g.beginPath();
    g.roundRect(196, 140, 118, 14, 3);
    g.fill();
    T(g, 202, 150, st.media, C.paper);
  }
}

function drawMouse(g: Ctx, C: ScopePalette, st: B8State) {
  const PAINT = [C.blue, C.teal, C.amber, C.coral, C.violet, C.ink];
  g.lineCap = "round";
  for (let i = 1; i < st.strokes.length; i++) {
    const a = st.strokes[i - 1];
    const b = st.strokes[i];
    if (!a?.down || !b?.down) continue;
    g.strokeStyle = PAINT[b.colour] ?? C.ink;
    g.lineWidth = b.size;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  }
  st.trail.forEach(([x, y], i) => {
    g.globalAlpha = (i + 1) / (st.trail.length + 1);
    g.fillStyle = C.muted;
    g.beginPath();
    g.arc(x, y, 1, 0, 7);
    g.fill();
  });
  g.globalAlpha = 1;
  const since = performance.now() - st.clickAt;
  if (since < 500) {
    g.strokeStyle = C.ink;
    g.globalAlpha = 1 - since / 500;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(st.mx, st.my, 4 + since / 20, 0, 7);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.fillStyle = C.ink;
  g.beginPath();
  g.moveTo(st.mx, st.my);
  g.lineTo(st.mx, st.my + 12);
  g.lineTo(st.mx + 8, st.my + 9);
  g.closePath();
  g.fill();
  PAINT.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(6 + i * 12, 146, 10, 8);
    if (i === st.colour) {
      g.strokeStyle = C.ink;
      g.strokeRect(5.5 + i * 12, 145.5, 11, 9);
    }
  });
  T(g, 104, 154, `L draw  R colour  M clear  wheel ${st.brush}`, C.muted);
}

function drawReports(g: Ctx, C: ScopePalette, st: B8State) {
  const mouse = st.hosting === "mouse";
  T(
    g,
    6,
    41,
    st.boot
      ? "Boot protocol: fixed 8-byte format"
      : `Report Map ${mouse ? 66 : 72} B, ${mouse ? 9 : 11} fields`,
    C.muted,
  );
  if (!st.reports.length) T(g, 6, 66, "Press a key or move the mouse.", C.muted);
  const MOUSE = [C.amber, C.blue, C.violet, C.violet, C.coral];
  st.reports.slice(-6).forEach((r, k) => {
    const y = 53 + k * 19;
    T(g, 6, y, `#${r.id} ${r.kind}`, C.ink);
    r.bytes.forEach((b, i) => {
      const col =
        r.kind === "mouse"
          ? (MOUSE[i] ?? C.muted)
          : r.kind === "media"
            ? C.teal
            : i === 0
              ? C.amber
              : i === 1
                ? C.dim
                : C.teal;
      T(g, 66 + i * 16, y, hx(b), col);
    });
    T(g, 66, y + 9, r.decoded, C.muted);
  });
}

function drawLink(g: Ctx, C: ScopePalette, t: number, st: B8State) {
  if (st.radio !== "connected") return T(g, 8, 60, "no link", C.muted);
  g.strokeStyle = C.blue;
  g.lineWidth = 1;
  g.beginPath();
  g.roundRect(8, 40, 44, 44, 6);
  g.stroke();
  g.beginPath();
  g.roundRect(134, 36, 32, 52, 6);
  g.stroke();
  T(g, 12, 66, "central", C.ink);
  T(g, 136, 66, "periph", C.ink);
  const k = (t / 0.6) % 1;
  g.fillStyle = st.encrypted ? C.violet : C.blue;
  g.beginPath();
  g.arc(54 + k * 78, 56, 3, 0, 7);
  g.fill();
  g.fillStyle = C.teal;
  g.beginPath();
  g.arc(132 - k * 78, 68, 3, 0, 7);
  g.fill();
  T(g, 12, 98, "this board", C.muted);
  T(g, 128, 98, st.target, C.muted);
  const stat = (x: number, y: number, l: string, v: string, c = C.ink) => {
    T(g, x, y + 7, l, C.muted);
    T(g, x, y + 24, v, c, BOLD);
  };
  stat(190, 34, "interval", "30.00 ms", C.blue);
  stat(264, 34, "MTU", "65 B");
  stat(190, 70, "latency", "0");
  stat(264, 70, "timeout", "5000 ms");
  stat(190, 106, "PHY tx/rx", "1M/1M");
  stat(264, 106, "RSSI", `${st.rssi} dBm`, C.teal);
  T(
    g,
    8,
    121,
    `${st.encrypted ? "encrypted" : "plain text"}${st.hosting === "keyboard" && st.encrypted ? " + MITM" : ""}${st.bonded ? " + bonded" : ""}`,
    st.encrypted ? C.violet : C.muted,
  );
}

function drawLog(g: Ctx, C: ScopePalette, st: B8State) {
  const shown = st.log.slice(-10);
  shown.forEach((l, i) => {
    const y = 41 + i * 12;
    T(g, 4, y, l.time, C.dim);
    T(g, 50, y, l.mark, C[MARK_TINT[l.mark]]);
    T(g, 60, y, l.text.slice(0, 43), i === shown.length - 1 ? C.ink : C.muted);
  });
  if (!st.log.length) T(g, 8, 45, "Nothing on the air yet.", C.muted);
}
