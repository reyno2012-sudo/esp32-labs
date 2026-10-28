import { DISPLAY_FONT, drawText, type ScopePalette } from "@/lib/canvas";
import type { BleState } from "./state";

const bars = (rssi: number) =>
  rssi >= -55 ? 4 : rssi >= -67 ? 3 : rssi >= -78 ? 2 : rssi >= -90 ? 1 : 0;

/**
 * The board's status bar and footer: lab id, view name, view dots, the radio icon (radar while
 * scanning, rings while advertising, two links when connected), lock, key and signal bars, and a
 * passkey box over the view while pairing waits for a person.
 */
export function drawBleChrome(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  labId: string,
  views: readonly string[],
  view: number,
  st: BleState,
  t: number,
): void {
  const T = (
    x: number,
    y: number,
    s: string,
    col: string,
    font?: string,
    align?: CanvasTextAlign,
  ) => drawText(g, x, y, s, col, font, align);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 320, 29);
  g.fillRect(0, 158, 320, 12);
  T(8, 18, labId, C.blue, `bold 12px ${DISPLAY_FONT}`);
  T(30, 18, views[view] ?? "", C.muted, `12px ${DISPLAY_FONT}`);
  let x = 302;
  const connected = st.radio === "connected";
  if (connected && st.rssi) {
    const n = bars(st.rssi);
    for (let i = 0; i < 4; i++) {
      const h = 3 + i * 3;
      g.fillStyle = i < n ? C.teal : C.dim;
      g.fillRect(x + i * 4, 21 - h, 3, h);
    }
  }
  x -= 18;
  if (connected && st.bonded) {
    g.strokeStyle = C.amber;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(x + 3, 14, 3, 0, 7);
    g.moveTo(x + 6, 14);
    g.lineTo(x + 13, 14);
    g.lineTo(x + 13, 18);
    g.stroke();
    x -= 18;
  }
  if (connected && st.encrypted) {
    g.strokeStyle = C.violet;
    g.beginPath();
    g.arc(x + 7, 11, 3, Math.PI, 0);
    g.stroke();
    g.fillStyle = C.violet;
    g.fillRect(x + 2, 12, 11, 8);
    x -= 16;
  }
  drawRadioIcon(g, C, st, x + 4, 15, t);
  const n = views.length;
  const first = x - 14 - (n - 1) * 9;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i === view ? C.ink : C.dim;
    g.beginPath();
    g.arc(first + i * 9, 15, 3, 0, 7);
    g.fill();
  }
  g.fillStyle = C.dim;
  g.fillRect(0, 28, 320, 1);
  if (st.passkey) drawPasskey(g, C, st.passkey, Boolean(st.compare), t);
  T(6, 166, st.passkey && st.compare ? "click = yes · long = no" : "click: next view", C.muted);
  if (st.footer)
    T(
      314,
      166,
      st.footer.slice(0, 34),
      st.footerCol ? C[st.footerCol] : C.teal,
      undefined,
      "right",
    );
}

function drawRadioIcon(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  st: BleState,
  cx: number,
  cy: number,
  t: number,
) {
  g.lineWidth = 1;
  const ring = (x: number, r: number) => {
    g.beginPath();
    g.arc(x, cy, r, 0, 7);
    g.stroke();
  };
  if (st.radio === "scanning") {
    g.strokeStyle = C.dim;
    ring(cx, 7);
    const a = t * 5;
    g.strokeStyle = C.teal;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
    g.stroke();
  } else if (st.radio === "advertising") {
    g.fillStyle = C.blue;
    g.beginPath();
    g.arc(cx, cy, 2, 0, 7);
    g.fill();
    for (let i = 0; i < 2; i++) {
      const k = (t * 1.2 + i * 0.5) % 1;
      g.globalAlpha = 1 - k;
      g.strokeStyle = C.blue;
      ring(cx, 3 + k * 6);
    }
    g.globalAlpha = 1;
  } else if (st.radio === "connected") {
    g.strokeStyle = C.blue;
    ring(cx - 3, 4);
    ring(cx + 3, 4);
  } else if (st.radio === "connecting") {
    g.strokeStyle = Math.floor(t * 6) % 2 ? C.amber : C.dim;
    ring(cx, 6);
  } else {
    g.strokeStyle = C.dim;
    ring(cx, 5);
  }
}

function drawPasskey(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  passkey: number,
  compare: boolean,
  t: number,
) {
  g.fillStyle = C.paper;
  g.strokeStyle = Math.floor(t * 2) % 2 ? C.amber : C.violet;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(16, 34, 288, 118, 10);
  g.fill();
  g.stroke();
  drawText(g, 30, 50, compare ? "NUMERIC COMPARISON" : "PASSKEY ENTRY", C.amber);
  drawText(
    g,
    30,
    62,
    compare ? "Same number on the other screen?" : "Type this on the other device:",
    C.muted,
  );
  drawText(
    g,
    160,
    112,
    String(passkey).padStart(6, "0"),
    C.ink,
    `bold 40px ${DISPLAY_FONT}`,
    "center",
  );
  drawText(
    g,
    30,
    140,
    compare ? "click = yes, it matches   long press = no" : "the other side has 30 s",
    C.muted,
  );
}
