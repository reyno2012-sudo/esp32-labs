// B6 Keyboard & media: media · slides · typer · keys · link · log.
import { DISPLAY_FONT, drawText, MONO_FONT, type ScopePalette } from "@/lib/canvas";
import type { ScreenSpec } from "@/labs/shared/lab-screen/types";
import type { BleState } from "../kit/state";

export interface B6State extends BleState {
  playing: boolean;
  slide: number;
  slideAt: number;
  dir: number;
  last: string | null;
  lastAt: number;
  typed: string;
  layout: "us" | "de";
  /** The last reports as text, newest first. */
  reports: string[];
}

export const b6Screen: ScreenSpec<B6State> = {
  views: ["media", "slides", "typer", "keys", "link", "log"],
  captions: [
    (t) => t("labs-ble:screens.b6.captions.0"),
    (t) => t("labs-ble:screens.b6.captions.1"),
    (t) => t("labs-ble:screens.b6.captions.2"),
    (t) => t("labs-ble:screens.b6.captions.3"),
    (t) => t("labs-ble:screens.b6.captions.4"),
    (t) => t("labs-ble:screens.b6.captions.5"),
  ],
  boot: [
    "ble-lab-b6: NimBLE 2.5.1 up, address 2C:4F:52:1A:9B:06, TX power 9 dBm",
    '  - advertising as keyboard "Bench B6"',
    "  - layout German (QWERTZ). Pair: Bluetooth settings > Bench B6",
  ],
  init: () => ({
    view: 0,
    timers: [],
    radio: "advertising",
    playing: false,
    slide: 1,
    slideAt: -1e9,
    dir: 1,
    last: null,
    lastAt: -1e9,
    typed: "",
    layout: "de",
    reports: [],
    footer: "advertising as keyboard",
  }),
  actions: [
    {
      label: (_, t) => t("labs-ble:screens.b6.actions.phonePairBenchB6"),
      run(st, term) {
        st.radio = "connected";
        st.encrypted = true;
        st.bonded = true;
        st.rssi = -52;
        st.footer = "secured: Just Works, bonded";
        term.line("  + connected: 5A:31:C2:77:0E:18", "info");
        term.line("  + secured: Just Works, bonded, key 16 B", "info");
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b6.actions.buttonClick"),
      run(st, term) {
        if (!st.encrypted)
          return term.line(
            '[W] not paired yet: open Bluetooth settings and pick "Bench B6"',
            "warn",
          );
        if (st.view === 1) {
          st.slide++;
          st.dir = 1;
          st.slideAt = performance.now();
          return term.line("  > key right arrow (mod 00 key 4F)");
        }
        st.playing = !st.playing;
        st.last = "play/pause";
        st.lastAt = performance.now();
        st.reports.unshift("down media CD 00  play/pause", "up   media 00 00  (released)");
        term.line("  > media key: play/pause (usage 0CD)");
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b6.actions.typeYes"),
      run(st, term) {
        if (!st.encrypted) return term.line("[W] not paired yet", "warn");
        st.typed = "yes";
        st.reports.unshift(
          "down mod 00 key 1D  types 'y'",
          "up   all zero",
          "down mod 00 key 08  types 'e'",
        );
        term.line("> type yes");
        term.line("  > typing 3 keys (DE)");
      },
    },
  ],
  onCommand(line, st, term) {
    const [cmd, ...rest] = line.trim().split(/\s+/);
    const arg = rest.join(" ");
    if (cmd === "type") {
      if (!st.encrypted) {
        term.line("[W] not paired yet", "warn");
        return true;
      }
      st.typed = arg;
      term.line(`  > typing ${arg.length} keys (${st.layout.toUpperCase()})`);
      return true;
    }
    if (cmd === "layout" && (arg === "us" || arg === "de")) {
      st.layout = arg;
      term.line(`  - layout ${arg === "us" ? "US (QWERTY)" : "German (QWERTZ)"} (saved)`);
      return true;
    }
    if (cmd === "media") {
      st.last = arg;
      st.lastAt = performance.now();
      term.line(`  > media key: ${arg}`);
      return true;
    }
    return false;
  },
  draw(g, C, view, _t, st) {
    // The gallery shows any view: the button's meaning follows the view drawn.
    st.view = view;
    if (view === 0) drawMedia(g, C, st);
    else if (view === 1) drawSlides(g, C, st);
    else if (view === 2) drawTyper(g, C, st);
    else if (view === 3) {
      T(g, 6, 40, "report 1 (keyboard): mod, 0, key x6", C.muted);
      (st.reports.length ? st.reports : ["no reports yet: pair, then press"])
        .slice(0, 7)
        .forEach((r, i) => T(g, 6, 58 + i * 13, r, i ? C.muted : C.ink, SMALL9));
    } else if (view === 4) {
      T(
        g,
        8,
        50,
        st.encrypted ? "interval 30.00 ms · MTU 23 · encrypted + bonded" : "waiting for a host...",
        st.encrypted ? C.violet : C.muted,
        SMALL10,
      );
    } else T(g, 8, 50, st.footer ?? "", C.muted, SMALL10);
  },
};

const T = (
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: string,
  col: string,
  font?: string,
  align?: CanvasTextAlign,
) => drawText(g, x, y, s, col, font, align);
const SMALL9 = `9px ${MONO_FONT}`;
const SMALL10 = `10px ${MONO_FONT}`;

function drawMedia(g: CanvasRenderingContext2D, C: ScopePalette, st: B6State) {
  const since = (performance.now() - st.lastAt) / 1000;
  const icons: [number, string][] = [
    [36, "|◀"],
    [96, st.playing ? "❚❚" : "▶"],
    [156, "▶|"],
    [222, "vol−"],
    [282, "vol+"],
  ];
  icons.forEach(([x, s], i) => {
    const hot = i === 1 && since < 0.5;
    g.strokeStyle = hot ? C.blue : C.dim;
    g.beginPath();
    g.arc(x, 66, i === 1 ? 22 : 17, 0, 7);
    g.stroke();
    if (hot) {
      g.strokeStyle = C.blue;
      g.globalAlpha = 1 - since * 2;
      g.beginPath();
      g.arc(x, 66, 22 + since * 40, 0, 7);
      g.stroke();
      g.globalAlpha = 1;
    }
    T(g, x, 71, s, st.encrypted ? C.ink : C.dim, `14px ${DISPLAY_FONT}`, "center");
  });
  T(
    g,
    8,
    100,
    st.encrypted
      ? st.last && since < 4
        ? `sent: ${st.last}`
        : "volume +0 steps since power-on"
      : "pair me: Bluetooth settings > Bench B6",
    st.encrypted ? C.ink : C.amber,
  );
  const boxes: [number, string, string][] = [
    [20, "this board", C.blue],
    [150, "phone / Mac", C.muted],
    [280, "your speaker", C.muted],
  ];
  boxes.forEach(([x, s, c]) => {
    g.strokeStyle = c;
    g.strokeRect(x - 16, 113, 32, 14);
    T(g, x, 138, s, C.muted, undefined, "center");
  });
  g.fillStyle = C.blue;
  g.fillRect(37, 120, 96, 1);
  g.fillStyle = C.amber;
  g.fillRect(167, 120, 96, 1);
  if (since < 0.9) {
    const k = since / 0.9;
    g.fillStyle = k < 0.5 ? C.blue : C.amber;
    g.beginPath();
    g.arc(k < 0.5 ? 37 + k * 2 * 96 : 167 + (k - 0.5) * 2 * 96, 120, 3, 0, 7);
    g.fill();
  }
  T(g, 6, 154, "click play/pause · 2x next · hold mute · hold 2 s: view", C.muted);
}

function drawSlides(g: CanvasRenderingContext2D, C: ScopePalette, st: B6State) {
  const k = Math.max(0, 1 - (performance.now() - st.slideAt) / 300);
  const off = k * k * 120 * st.dir;
  g.fillStyle = C.dim;
  g.fillRect(84 + off, 44, 140, 82);
  g.fillStyle = C.paper;
  g.strokeStyle = C.ink;
  g.fillRect(90 + off, 40, 140, 82);
  g.strokeRect(90 + off, 40, 140, 82);
  g.fillStyle = C.muted;
  g.fillRect(102 + off, 52, 70, 6);
  T(g, 196 + off, 112, String(st.slide), C.ink, `bold 26px ${DISPLAY_FONT}`);
  T(g, 6, 154, "click next · 2x back · hold black · hold 2 s: view", C.muted);
}

function drawTyper(g: CanvasRenderingContext2D, C: ScopePalette, st: B6State) {
  T(g, 8, 42, "layout (layout us|de)", C.muted);
  T(
    g,
    8,
    60,
    st.layout === "us" ? "US (QWERTY)" : "German (QWERTZ)",
    C.blue,
    `bold 12px ${DISPLAY_FONT}`,
  );
  g.strokeStyle = C.dim;
  g.strokeRect(6, 70, 308, 26);
  T(g, 12, 87, st.typed || "serial: type hello bench", st.typed ? C.ink : C.muted, SMALL10);
  if (st.typed) {
    g.fillStyle = C.teal;
    g.fillRect(6, 100, 308, 3);
    T(g, 6, 114, `typed ${st.typed.length} keys`, C.muted);
  }
}
