// The rfid-lab screen, drawn like kit/lib/rfid-lab-kit/src/rfid_views.h. One drawer for both the
// simulator and the "What the screen shows" panel.
import { DISPLAY_FONT, MONO_FONT, SCREEN_H, SCREEN_W, type ScopePalette } from "@/lib/canvas";
import { hx, hxs, type Uid } from "../protocol/bytes";
import { type Block, blockKind, type BlockKind } from "../protocol/card-memory";
import { EDGE, type EdgeExperiment } from "../edge/edge-data";

export const RFID_VIEWS = ["chip", "card", "trace", "memory", "credits", "edge"] as const;
export const RFID_HINTS = [
  "double-click: selftest",
  "double-click: inventory",
  "double-click: trace",
  "double-click: dump",
  "double-click: credits add 1",
  "double-click: edge next",
] as const;

export interface TraceFrame {
  /** ms since the first frame. */
  readonly t: number;
  readonly dir: ">" | "<";
  readonly bytes: readonly number[];
  readonly name: string;
  /** Encrypted on air (shown grey). */
  readonly crypto?: boolean;
}

export interface CardData {
  readonly uid: Uid;
  mem: Block[];
}

/** Everything the screen shows; the simulator's state is a superset. */
export interface RfidScreenState {
  /** Index into RFID_VIEWS. */
  view: number;
  /** The card in the field, or null. */
  uid: Uid | null;
  rate: number;
  taps: number;
  polling: boolean;
  /** Collision bit, 0 = none. */
  coll: number;
  /** -1 not run, 0 failed, 1 passed, 2 not supported, 3 consistent. */
  selfTest: number;
  /** RFCfgReg gain setting 0-7. */
  gain: number;
  irq: boolean;
  mhz: number;
  trace: boolean;
  frames: readonly TraceFrame[];
  dump: CardData | null;
  credits: { readonly v: number; readonly b: number } | null;
  edge: EdgeExperiment | null;
  busy: string | null;
  progress: number;
  note: string;
  noteBad: boolean;
  /** A lab shows only its own views: n dots, i lit. */
  dots?: { readonly n: number; readonly i: number };
  /** Footer left; defaults to the view's double-click hint. */
  hint?: string;
}

const BOLD = `bold 12px ${DISPLAY_FONT}`;
const SANS = `11px ${DISPLAY_FONT}`;
const MONO = `8px ${MONO_FONT}`;
const GAINS_DB = [18, 23, 18, 23, 33, 38, 43, 48] as const;

/** Draws the whole 320×170 screen. `still` freezes the animations (reduced motion). */
export function drawRfidScreen(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  s: RfidScreenState,
  t: number,
  still = false,
): void {
  const W = SCREEN_W;
  const H = SCREEN_H;
  const id = (u: Uid, sep = ":") => u.map(hx).join(sep);
  const T = (x: number, y: number, str: string, col: string, font = MONO) => {
    g.font = font;
    g.fillStyle = col;
    g.fillText(str, x, y);
  };
  const stat = (x: number, y: number, label: string, value: string, col = C.ink) => {
    T(x, y + 7, label, C.muted);
    T(x, y + 24, value, col, BOLD);
  };
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);

  const views: (() => void)[] = [
    () => {
      // chip
      const cx = 52;
      const cy = 92;
      g.fillStyle = C.muted;
      for (let i = 0; i < 8; i++) {
        const o = -21 + i * 6;
        g.fillRect(cx + o, cy - 34, 2, 6);
        g.fillRect(cx + o, cy + 28, 2, 6);
        g.fillRect(cx - 34, cy + o, 6, 2);
        g.fillRect(cx + 28, cy + o, 6, 2);
      }
      g.fillStyle = C.chip;
      g.fillRect(cx - 28, cy - 28, 56, 56);
      g.globalAlpha = still ? 0.9 : 0.55 + 0.4 * Math.sin(t * 3);
      g.fillStyle = C.teal;
      g.fillRect(cx - 9, cy - 9, 18, 18);
      g.globalAlpha = 1;
      T(cx - 20, cy + 23, "MFRC522", C.muted);
      stat(104, 38, "VersionReg", "92h", C.teal);
      const selfTest =
        ["not run", "FAILED", "passed", "not supported", "consistent"][s.selfTest + 1] ?? "not run";
      stat(
        220,
        38,
        "self-test",
        selfTest,
        s.selfTest === 1 || s.selfTest === 3 ? C.teal : s.selfTest === 0 ? C.coral : C.muted,
      );
      stat(104, 80, "SPI clock (max 10)", `${s.mhz} MHz`, s.mhz > 10 ? C.amber : C.ink);
      stat(220, 80, "waits by", s.irq ? "IRQ wire" : "polling");
      const db = GAINS_DB[s.gain] ?? 33;
      T(104, 129, "receiver gain", C.muted);
      g.strokeStyle = C.dim;
      g.strokeRect(104.5, 133.5, 100, 8);
      g.fillStyle = C.blue;
      g.fillRect(105, 134, ((db - 18) * 98) / 30, 7);
      T(210, 140, `${db} dB`, C.ink);
      const ops = 1200 + Math.floor(t * 61);
      T(250, 129, "bus", C.muted);
      T(250, 140, `${ops} SPI ops`, C.ink);
      T(250, 151, `${Math.floor(ops / 17)} cmds`, C.ink);
    },
    () => {
      // card
      const ax = 70;
      const ay = 100;
      for (let i = 0; i < 4; i++) {
        const k = still ? i / 4 : (t * 0.6 + i * 0.25) % 1;
        g.strokeStyle = C.blue;
        g.globalAlpha = 1 - k;
        g.beginPath();
        g.arc(ax, ay, 14 + k * 52, 0, 7);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = C.amber;
      g.strokeRect(ax - 22, ay - 16, 44, 32);
      g.strokeRect(ax - 18, ay - 12, 36, 24);
      if (!s.uid) {
        T(146, 76, "Hold a card or tag", C.ink, SANS);
        T(146, 96, "flat on the reader", C.ink, SANS);
        T(
          146,
          112,
          `${s.polling ? "polling 12x/s" : "polling paused"}, ${s.taps} taps so far`,
          C.muted,
        );
        return;
      }
      const bob = still ? 0 : Math.sin(t * 2) * 2;
      g.fillStyle = C.card;
      g.fillRect(ax - 30, ay - 52 + bob, 60, 38);
      g.strokeStyle = C.muted;
      g.strokeRect(ax - 26, ay - 48 + bob, 34, 24);
      g.fillStyle = C.amber;
      g.fillRect(ax + 14, ay - 42 + bob, 8, 8);
      T(146, 43, "UID", C.muted);
      T(146, 58, id(s.uid, " "), C.teal, BOLD);
      T(146, 72, "MIFARE Classic 1K", C.ink);
      stat(146, 80, "ATQA", "00 04");
      stat(210, 80, "SAK", "08");
      stat(262, 80, "UID size", "4 B");
      T(146, 129, "found in the last 20 polls", C.muted);
      g.strokeStyle = C.dim;
      g.strokeRect(146.5, 133.5, 120, 8);
      g.fillStyle = s.rate >= 90 ? C.teal : s.rate >= 50 ? C.amber : C.coral;
      g.fillRect(147, 134, (s.rate * 118) / 100, 7);
      T(272, 140, `${s.rate}%`, C.ink);
      if (s.coll) T(146, 153, `collision at bit ${s.coll}`, C.amber);
    },
    () => {
      // trace
      if (!s.trace) return T(8, 46, "Sniffer off. Serial: trace on", C.muted);
      if (!s.frames.length) return T(8, 46, "Nothing yet: tap a card.", C.muted);
      s.frames.slice(-10).forEach((f, i) => {
        const y = 42 + i * 12;
        const col = f.dir === ">" ? C.amber : C.teal;
        T(4, y, f.t.toFixed(1).padStart(6), C.muted);
        T(44, y, f.dir, col);
        T(
          54,
          y,
          hxs(f.bytes.slice(0, 9)) + (f.bytes.length > 9 ? " .." : ""),
          f.crypto ? C.muted : C.ink,
        );
        T(228, y, f.name.replace(" (short)", "").slice(0, 15), col);
      });
      T(4, 154, "ms   > reader to card   < card to reader", C.dim);
    },
    () => {
      // memory
      if (!s.dump) {
        T(8, 50, "No dump yet.", C.ink);
        T(8, 64, "Hold a card and double-click,", C.muted);
        T(8, 76, "or type: dump", C.muted);
        return;
      }
      const col: Record<BlockKind, string> = {
        maker: C.amber,
        empty: C.dim,
        data: C.teal,
        value: C.blue,
        trailer: C.coral,
      };
      const mem = s.dump.mem;
      for (let sec = 0; sec < 16; sec++) {
        T(8 + sec * 18 + (sec < 10 ? 6 : 3), 41, String(sec), C.muted);
        for (let b = 0; b < 4; b++) {
          const i = sec * 4 + b;
          g.fillStyle = col[blockKind(mem[i] ?? [], i)];
          g.fillRect(8 + sec * 18, 44 + b * 18, 16, 16);
        }
      }
      (["maker", "empty", "data", "value", "trailer"] as const).forEach((k, i) => {
        g.fillStyle = col[k];
        g.fillRect(8 + i * 60, 124, 7, 7);
        T(18 + i * 60, 131, k, C.muted);
      });
      T(8, 146, `${id(s.dump.uid)}  16 sectors x 4 blocks x 16 B`, C.ink);
    },
    () => {
      // credits
      if (!s.credits) {
        T(110, 56, "No credits read yet.", C.ink);
        T(110, 70, "credits init 50   (serial)", C.muted);
        T(110, 82, "then: credits add 5 / use 3", C.muted);
        return;
      }
      const coins = Math.max(
        0,
        Math.min(8, Math.floor(s.credits.v / 10) + (s.credits.v > 0 ? 1 : 0)),
      );
      for (let i = 0; i < coins; i++) {
        const y = 140 - i * 9 + (i === coins - 1 && !still ? Math.sin(t * 3) * 1.5 : 0);
        g.fillStyle = C.amber;
        g.fillRect(28, y, 56, 8);
      }
      T(110, 47, "credits (block 8, a value block)", C.muted);
      T(110, 82, String(s.credits.v), C.ink, `bold 28px ${DISPLAY_FONT}`);
      T(110, 103, `backup ${s.credits.b} (block 9)`, C.muted);
      T(110, 123, "The card does the maths: you send", C.muted);
      T(110, 134, '"add 5", it computes, TRANSFER commits.', C.muted);
    },
    () => {
      // edge
      const e = s.edge;
      if (!e) {
        T(8, 46, "No experiment yet. Serial:", C.ink);
        EDGE.forEach((x, i) => T(14, 60 + i * 12, `${x.cmd.padEnd(16)} ${x.label}`, C.muted));
        return;
      }
      T(8, 41, e.label, C.ink);
      const data = e.example;
      const top = e.max ?? Math.max(...data.map((r) => r[1])) * 1.1;
      const base = 136;
      const hMax = 84;
      const slot = (W - 16) / data.length;
      const bw = slot - 4;
      g.fillStyle = C.dim;
      g.fillRect(8, base, W - 16, 1);
      data.forEach(([l, v], i) => {
        const h = (v / top) * hMax;
        const x = 8 + i * slot + 2;
        g.fillStyle = C.blue;
        g.fillRect(x, base - h, bw, h);
        if (e.mark === l) {
          g.strokeStyle = C.ink;
          g.strokeRect(x - 2, base - hMax - 2, bw + 4, hMax + 4);
        }
        g.font = MONO;
        T(x + (bw - g.measureText(String(v)).width) / 2, base - h - 3, String(v), C.ink);
        T(x + (bw - g.measureText(l).width) / 2, base + 9, l, C.muted);
      });
      T(
        8,
        156,
        e.key === "spi"
          ? "errors from 16 MHz (spec: 10)"
          : e.key === "timeout"
            ? "card answers within 100 us"
            : "the conclusion, in one line",
        C.teal,
      );
    },
  ];
  views[s.view]?.();

  // Header: title, view dots, card-present dot. Footer: button hint, last result or progress.
  T(8, 18, "RFID", C.ink, BOLD);
  T(42, 18, RFID_VIEWS[s.view] ?? "", C.muted, SANS);
  const dots = s.dots ?? { n: 6, i: s.view };
  for (let i = 0; i < dots.n; i++) {
    g.fillStyle = i === dots.i ? C.ink : C.dim;
    g.beginPath();
    g.arc(286 - (dots.n - 1) * 10 + i * 10, 18, 3, 0, 7);
    g.fill();
  }
  g.fillStyle = s.uid ? C.teal : C.dim;
  g.beginPath();
  g.arc(304, 18, 5, 0, 7);
  g.fill();
  if (s.uid) {
    g.strokeStyle = C.teal;
    g.beginPath();
    g.arc(304, 18, 8, 0, 7);
    g.stroke();
  }
  g.fillStyle = C.dim;
  g.fillRect(0, 28, W, 1);
  g.fillStyle = C.paper;
  g.fillRect(0, H - 11, W, 11);
  T(6, H - 3, s.hint ?? RFID_HINTS[s.view] ?? "", C.muted);
  const right = s.busy ? `${s.busy} ${Math.round(s.progress)}%` : s.note.slice(0, 34);
  g.font = MONO;
  T(
    W - 6 - g.measureText(right).width,
    H - 3,
    right,
    s.busy ? C.amber : s.noteBad ? C.coral : C.teal,
  );
  if (s.busy) {
    g.fillStyle = C.amber;
    g.fillRect(0, H - 1, (W * s.progress) / 100, 1);
  }
}
