// B2 Be seen: packet · air · budget · log.
import type { ScreenSpec } from "@/labs/shared/lab-screen/types";
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { bleSimLog, type LoggingState } from "../kit/state";
import {
  type AdField,
  B2_MODES,
  type BeaconSettings,
  b2Bytes,
  b2Fields,
  b2Pdu,
  b2Url,
} from "../protocol/advertising";
import { hx, hxs } from "../protocol/hex";
import { drawAir, drawBudget, drawPacket } from "./b2-draw";
import { drawLog } from "./shared/draw";

export interface B2State extends LoggingState, BeaconSettings {
  interval: number;
  on: boolean;
  /** The advertisement's bytes last frame, and when each byte last changed (s). */
  prev: number[];
  changed: number[];
  lastT: number;
  /** Simulated advertising events [time ms, random delay ms], for the air view. */
  evs: [number, number][];
  lastEv: number;
  nextEv: number;
}

const announce = (st: B2State, term: TerminalPrinter) => {
  const f = b2Fields(st);
  bleSimLog(
    st,
    term,
    "+",
    `${st.mode} ${b2Pdu(st)} every ${st.interval} ms, ${b2Bytes(f.adv).length}+${b2Bytes(f.rsp).length} B`,
  );
};

const press = (st: B2State, term: TerminalPrinter) => {
  st.presses++;
  bleSimLog(st, term, "-", `presses ${st.presses}: in the next packet`);
};

export const b2Screen: ScreenSpec<B2State> = {
  views: ["packet", "air", "budget", "log"],
  captions: [
    (t) => t("labs-ble:screens.b2.captions.0"),
    (t) => t("labs-ble:screens.b2.captions.1"),
    (t) => t("labs-ble:screens.b2.captions.2"),
    (t) => t("labs-ble:screens.b2.captions.3"),
  ],
  boot: [
    "ble-lab-b2: NimBLE 2.5.1 up, address 7C:DF:A1:0B:5E:3C, TX power 9 dBm",
    "  + bench ADV_IND every 100 ms, 24+7 B",
    "",
    'Bluetooth lab B2 Be seen  (ble-lab-b2)  ·  phones see "Bench B2"',
  ],
  init: () => ({
    view: 0,
    timers: [],
    radio: "advertising",
    mode: "bench",
    presses: 0,
    temp: 41.42,
    uptime: 12,
    tx: 9,
    interval: 100,
    connectable: true,
    scanresp: true,
    major: 1,
    minor: 2,
    url: "https://espressif.com",
    on: true,
    prev: [],
    changed: [],
    lastT: -1,
    log: [["    2.1", "+", "bench ADV_IND every 100 ms, 24+7 B"]],
    footer: "+ bench ADV_IND every 100 ms, 24+7 B",
    lastEv: 0,
    nextEv: 0,
    evs: [],
  }),
  actions: [
    { label: (_, t) => t("labs-ble:screens.b2.actions.buttonDoubleClickPress"), run: press },
    {
      label: (_, t) => t("labs-ble:screens.b2.actions.modeNext"),
      run(st, term) {
        st.mode = B2_MODES[(B2_MODES.indexOf(st.mode) + 1) % 4] ?? "bench";
        announce(st, term);
        st.view = 0;
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b2.actions.connectableOnOff"),
      run(st, term) {
        st.connectable = !st.connectable;
        if (!st.connectable && st.interval < 100) {
          st.interval = 100;
          bleSimLog(st, term, "!", "interval raised to 100 ms: the floor for non-connectable");
        }
        announce(st, term);
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b2.actions.interval1001000"),
      run(st, term) {
        st.interval = st.interval === 1000 ? 100 : 1000;
        announce(st, term);
      },
    },
  ],
  onCommand(line, st, term) {
    const [cmd, a, b] = line.split(/\s+/);
    const mode = B2_MODES.find((m) => m === a);
    if (cmd === "mode" && mode) {
      st.mode = mode;
      st.view = 0;
      announce(st, term);
      return true;
    }
    if (cmd === "url" && a) {
      if (!b2Url(a)) {
        bleSimLog(st, term, "x", "the URL doesn't fit: http(s)://, then at most 17 bytes");
        return true;
      }
      st.url = a;
      st.mode = "url";
      announce(st, term);
      return true;
    }
    if (cmd === "beacon" && a && b) {
      st.major = Number(a) & 255;
      st.minor = Number(b) & 255;
      st.mode = "ibeacon";
      announce(st, term);
      return true;
    }
    if (cmd === "interval" && a) {
      const lo = st.connectable ? 20 : 100;
      const ms = Number(a);
      if (!(ms >= lo && ms <= 10240)) {
        term.line(
          `[W] interval <ms>, ${lo}-10240 (${st.connectable ? "connectable" : "not connectable"}: ${lo} ms is the floor)`,
          "warn",
        );
        return true;
      }
      st.interval = ms;
      announce(st, term);
      return true;
    }
    if (cmd === "connectable" && (a === "on" || a === "off")) {
      st.connectable = a === "on";
      if (!st.connectable && st.interval < 100) st.interval = 100;
      announce(st, term);
      return true;
    }
    if (cmd === "scanresp" && (a === "on" || a === "off")) {
      st.scanresp = a === "on";
      announce(st, term);
      return true;
    }
    if (cmd === "power" && a) {
      st.tx = Math.max(-24, Math.min(20, Number(a) || 0));
      bleSimLog(st, term, "-", `TX power ${st.tx} dBm`);
      return true;
    }
    if (cmd === "adv") {
      st.on = a ? a === "on" : !st.on;
      st.radio = st.on ? "advertising" : "off";
      if (st.on) announce(st, term);
      else bleSimLog(st, term, "-", "advertising off: the board is invisible");
      return true;
    }
    if (cmd === "press") {
      press(st, term);
      return true;
    }
    if (cmd === "bytes") {
      const f = b2Fields(st);
      term.line(`${st.mode} · ${b2Pdu(st)} · every ${st.interval} ms · TX ${st.tx} dBm`);
      const packets: [string, AdField[]][] = [
        ["advertisement", f.adv],
        ["scan response", f.rsp],
      ];
      packets.forEach(([n, fs]) => {
        term.line(`  ${n}, ${b2Bytes(fs).length} of 31 bytes:`);
        fs.forEach(([type, name, d]) =>
          term.line(`    [${hx(d.length + 1)} ${hx(type)} | ${hxs(d)}]  ${name}`),
        );
      });
      return true;
    }
    return false;
  },
  draw(g, C, view, t, st) {
    // Live values tick once a second, like the firmware's tick().
    if (Math.floor(t) !== st.lastT) {
      st.lastT = Math.floor(t);
      st.uptime++;
      st.temp = 41.3 + Math.sin(t / 7) * 0.2;
    }
    const f = b2Fields(st);
    const adv = b2Bytes(f.adv);
    adv.forEach((b, i) => {
      if (st.prev[i] !== b) st.changed[i] = t;
    });
    st.prev = adv;
    if (view === 0) drawPacket(g, C, t, st, f.adv, f.rsp, adv);
    else if (view === 1) drawAir(g, C, t, st, adv.length);
    else if (view === 2) drawBudget(g, C, st, adv.length);
    else drawLog(g, C, st);
  },
};
