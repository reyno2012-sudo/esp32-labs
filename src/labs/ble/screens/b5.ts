// B5 Phone app: sketch · live · speed · gatt · link · log.
import { DISPLAY_FONT, drawText, type ScopePalette } from "@/lib/canvas";
import type { ScreenSpec } from "@/labs/shared/lab-screen/types";
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { bleSimLog, later } from "../kit/state";
import { type BenchState, benchInit } from "./shared/bench";
import { drawGatt, drawLink, drawLog } from "./shared/draw";

type Ink = "teal" | "amber" | "violet" | "coral";

interface SpeedRun {
  start: number;
  target: number;
  kBps: number;
  sent: number;
  /** The monitor the run reports to when it finishes. */
  term: TerminalPrinter;
}

export interface B5State extends BenchState {
  strokes: { pts: [number, number][]; c: Ink }[];
  cmds: number;
  writes: number;
  bytes: number;
  /** [temperature, touch, free heap, RSSI] every 200 ms. */
  samples: [number, number, number, number][];
  sampleAt: number;
  touchAt: number;
  subSensors: boolean;
  sent: number;
  runs: { kBps: number; mtu: number; interval: number; phy: string }[];
  speed: SpeedRun | null;
  mtu: number;
}

const INKS: readonly Ink[] = ["teal", "amber", "violet", "coral"];
const nowS = () => performance.now() / 1000;

function connected(
  st: B5State,
  term: TerminalPrinter,
  warning = "[W] connect the app first",
): boolean {
  if (st.radio === "connected") return true;
  term.line(warning, "warn");
  return false;
}

function startSpeed(st: B5State, term: TerminalPrinter) {
  if (!connected(st, term, "[W] speed: connect first")) return;
  if (st.speed) return;
  bleSimLog(st, term, "<", "write Speed: start 50000 bytes");
  bleSimLog(st, term, ">", `speed: 50000 bytes in ${st.mtu - 3}-byte packets`);
  st.speed = {
    start: nowS(),
    target: 50000,
    kBps: st.interval < 20 ? (st.phy.startsWith("2M") ? 64 : 41) : 22,
    sent: 0,
    term,
  };
  st.view = 2;
}

export const b5Screen: ScreenSpec<B5State> = {
  views: ["sketch", "live", "speed", "gatt", "link", "log"],
  captions: [
    (t) => t("labs-ble:screens.b5.captions.0"),
    (t) => t("labs-ble:screens.b5.captions.1"),
    (t) => t("labs-ble:screens.b5.captions.2"),
    (t) => t("labs-ble:screens.b5.captions.3"),
    (t) => t("labs-ble:screens.b5.captions.4"),
    (t) => t("labs-ble:screens.b5.captions.5"),
  ],
  boot: [
    "ble-lab-b5: NimBLE 2.5.1 up, address 7C:DF:A1:0B:5E:3C, TX power 9 dBm",
    '  - advertising as "Bench B5"',
    "",
    'Bluetooth lab B5 Phone app  (ble-lab-b5)  ·  phones see "Bench B5"',
  ],
  init: () => ({
    ...benchInit(),
    strokes: [],
    cmds: 0,
    writes: 0,
    bytes: 0,
    samples: [],
    sampleAt: 0,
    touchAt: -9,
    subSensors: false,
    sent: 0,
    runs: [],
    speed: null,
    mtu: 23,
    log: [["    2.1", "-", 'advertising as "Bench B5"']],
    footer: '- advertising as "Bench B5"',
  }),
  actions: [
    {
      label: (_, t) => t("labs-ble:screens.b5.actions.appConnect"),
      run(st, term) {
        if (st.radio === "connected") return;
        st.radio = "connected";
        st.mtu = 247;
        bleSimLog(st, term, "+", "connected: 5A:3C:91:2E:7B:44");
        bleSimLog(st, term, "-", "MTU 247: 244 bytes of data per packet");
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b5.actions.appDrawAStroke"),
      run(st, term) {
        if (!connected(st, term)) return;
        const y0 = 30 + Math.random() * 60;
        const n = st.strokes.length;
        const pts = Array.from({ length: 24 }, (_, i): [number, number] => [
          20 + i * 11,
          y0 + Math.sin(i / 3 + n) * 22,
        ]);
        st.strokes.push({ pts, c: INKS[n % 4] ?? "teal" });
        st.cmds += 2;
        st.writes += 2;
        st.bytes += 5 + 24 * 3 + 5;
        st.rx += 2;
        st.view = 0;
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b5.actions.appSubscribeSensors"),
      run(st, term) {
        if (!connected(st, term)) return;
        st.subSensors = true;
        bleSimLog(st, term, "<", "subscribe Sensors");
        st.view = 1;
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b5.actions.touchTheWireOnGpio1"),
      run(st) {
        st.touchAt = nowS();
        st.view = 1;
      },
    },
    { label: (_, t) => t("labs-ble:screens.b5.actions.appSpeed50Kb"), run: startSpeed },
    {
      label: (_, t) => t("labs-ble:screens.b5.actions.appFast2m"),
      run(st, term) {
        if (!connected(st, term)) return;
        bleSimLog(st, term, "<", "write Link: 1");
        bleSimLog(st, term, ">", "asked for 7.5-15 ms");
        later(st, 500, () => {
          st.interval = 15;
          bleSimLog(st, term, "-", "new params: 15.00 ms, latency 0");
          bleSimLog(st, term, "<", "write Link: 3");
          bleSimLog(st, term, ">", "asked for the 2M PHY");
        });
        later(st, 1000, () => {
          st.phy = "2M/2M";
          bleSimLog(st, term, "-", "PHY now 2M / 2M");
        });
        st.view = 4;
      },
    },
  ],
  onCommand(line, st, term) {
    const [cmd, arg] = line.split(/\s+/);
    const up = st.radio === "connected";
    if (cmd === "clear") {
      st.strokes = [];
      st.view = 0;
      bleSimLog(st, term, "-", "sketch cleared");
      return true;
    }
    if (cmd === "speed") {
      startSpeed(st, term);
      return true;
    }
    if (cmd === "phy" && up) {
      st.phy = arg === "2m" ? "2M/2M" : "1M/1M";
      bleSimLog(st, term, ">", `asked for the ${arg === "2m" ? "2M" : "1M"} PHY`);
      return true;
    }
    if (cmd === "params" && up) {
      st.interval = arg === "slow" ? 112.5 : 15;
      bleSimLog(st, term, "-", `new params: ${st.interval.toFixed(2)} ms`);
      return true;
    }
    if (cmd === "disconnect" && up) {
      st.radio = "advertising";
      st.subSensors = false;
      bleSimLog(st, term, "!", "disconnected 0x16: we hung up");
      return true;
    }
    return false;
  },
  draw(g, C, view, t, st) {
    sample(st, t);
    finishSpeed(st);
    if (view === 0) drawSketch(g, C, st);
    else if (view === 1) drawLive(g, C, st);
    else if (view === 2) drawSpeed(g, C, t, st);
    else if (view === 3) drawGatt(g, C, t, st);
    else if (view === 4) drawLink(g, C, t, st);
    else drawLog(g, C, st);
  },
};

// The simulated board's sensors, sampled every 200 ms whatever the view.
function sample(st: B5State, t: number) {
  if (t - st.sampleAt < 0.2) return;
  st.sampleAt = t;
  const touching = t - st.touchAt < 1.5;
  st.samples.push([
    41.2 + Math.sin(t / 7) * 0.15 + Math.random() * 0.03,
    30000 + (touching ? 21000 : 0) + Math.random() * 600,
    238000 + Math.sin(t) * 1500,
    st.radio === "connected" ? -55 - Math.round(Math.random() * 5) : 0,
  ]);
  if (st.samples.length > 60) st.samples.shift();
  if (st.subSensors && st.radio === "connected") {
    st.sent++;
    st.tx++;
  }
}

// A speed run in progress finishes by itself.
function finishSpeed(st: B5State) {
  const sp = st.speed;
  if (!sp) return;
  const ms = (nowS() - sp.start) * 1000;
  sp.sent = Math.min(sp.target, ms * sp.kBps);
  if (sp.sent < sp.target) return;
  st.runs.push({ kBps: sp.kBps, mtu: st.mtu, interval: st.interval, phy: st.phy.slice(0, 2) });
  if (st.runs.length > 6) st.runs.shift();
  bleSimLog(
    st,
    sp.term,
    "+",
    `speed: 50000 B in ${Math.round(sp.target / sp.kBps)} ms = ${sp.kBps.toFixed(1)} kB/s`,
  );
  st.speed = null;
}

const T = (
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: string,
  col: string,
  font?: string,
) => drawText(g, x, y, s, col, font);
const BOLD = `bold 12px ${DISPLAY_FONT}`;

function drawSketch(g: CanvasRenderingContext2D, C: ScopePalette, st: B5State) {
  st.strokes.forEach((s) => {
    g.strokeStyle = C[s.c];
    g.lineWidth = 4;
    g.lineCap = "round";
    g.beginPath();
    s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  });
  if (!st.strokes.length) {
    T(
      g,
      10,
      70,
      st.radio === "connected" ? "Draw in the app's Sketch tab" : "Open the ble-app, connect",
      C.ink,
      BOLD,
    );
    T(g, 10, 86, "Every stroke arrives as a write without response", C.muted);
    T(g, 10, 98, "to Canvas (ba5e0010) and lands here.", C.muted);
  }
  T(g, 6, 154, `${st.cmds} cmds ${st.writes} writes ${st.bytes} B`, C.muted);
}

function drawLive(g: CanvasRenderingContext2D, C: ScopePalette, st: B5State) {
  const names = ["temperature", "touch GPIO 1", "free heap", "link RSSI"];
  const cols = [C.amber, C.teal, C.violet, C.blue];
  names.forEach((n, k) => {
    const y = 34 + k * 30;
    const col = cols[k] ?? C.ink;
    const vals = st.samples.map((s) => s[k as 0 | 1 | 2 | 3]);
    const last = vals.at(-1) ?? 0;
    T(g, 6, y + 7, n, C.muted);
    T(
      g,
      6,
      y + 24,
      k === 0
        ? `${last.toFixed(2)} C`
        : k === 1
          ? String(Math.round(last))
          : k === 2
            ? `${Math.round(last / 1024)} kB`
            : last
              ? `${last} dBm`
              : "-",
      col,
      BOLD,
    );
    g.fillStyle = C.dim;
    g.fillRect(110, y + 24, 204, 1);
    if (vals.length > 1) {
      const lo = Math.min(...vals);
      const max = Math.max(...vals);
      const hi = max - lo < 1e-3 ? lo + 1 : max;
      g.strokeStyle = col;
      g.lineWidth = 1;
      g.beginPath();
      vals.forEach((v, i) => {
        const x = 110 + (i * 203) / 59;
        const yy = y + 23 - ((v - lo) * 23) / (hi - lo);
        if (i) g.lineTo(x, yy);
        else g.moveTo(x, yy);
      });
      g.stroke();
    }
  });
  T(
    g,
    110,
    155,
    st.subSensors
      ? `notifying the app: ${st.sent} sent`
      : `app not subscribed to Sensors (${st.sent} sent)`,
    st.subSensors ? C.teal : C.muted,
  );
}

function drawSpeed(g: CanvasRenderingContext2D, C: ScopePalette, t: number, st: B5State) {
  if (st.speed) {
    T(g, 6, 42, "sending...", C.amber);
    g.strokeStyle = C.blue;
    g.strokeRect(6, 50, 20, 30);
    g.strokeStyle = C.muted;
    g.strokeRect(290, 46, 22, 38);
    for (let i = 0; i < 8; i++) {
      const k = (t * 2 + i / 8) % 1;
      g.globalAlpha = 1 - k * 0.5;
      g.fillStyle = C.violet;
      g.fillRect(30 + k * 252, 62, 6, 6);
    }
    g.globalAlpha = 1;
    const pct = st.speed.sent / st.speed.target;
    g.strokeStyle = C.dim;
    g.strokeRect(6, 92, 308, 8);
    g.fillStyle = C.violet;
    g.fillRect(7, 93, 306 * pct, 6);
    T(g, 6, 114, `${Math.round(st.speed.sent)} / 50000 B  ${st.speed.kBps.toFixed(1)} kB/s`, C.ink);
    T(g, 6, 128, "A wait = the stack's buffers were full:", C.muted);
    T(g, 6, 138, "the radio sends only in connection events.", C.muted);
  } else if (!st.runs.length) {
    T(g, 6, 60, "No speed runs yet", C.ink, BOLD);
    T(g, 6, 78, "App: Speed tab, Run. Or serial: speed 50000", C.muted);
    T(g, 6, 104, "kB/s ~ (MTU - 3) x packets per event / interval", C.muted);
  } else {
    const peak = Math.max(...st.runs.map((r) => r.kBps));
    st.runs.forEach((r, i) => {
      const y = 36 + i * 20;
      const w = (r.kBps * 150) / peak;
      g.fillStyle = C.violet;
      g.globalAlpha = i === st.runs.length - 1 ? 1 : 0.55;
      g.fillRect(6, y, w, 12);
      g.globalAlpha = 1;
      T(g, 10 + w, y + 9, `${r.kBps.toFixed(1)} kB/s`, C.ink);
      T(g, 216, y + 9, `MTU ${r.mtu} ${r.interval.toFixed(1)}ms ${r.phy}`, C.muted);
    });
  }
}
