// B1 Listen: radar · list · inspect · air.
import type { ScreenSpec } from "@/labs/shared/lab-screen/types";
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import type { BleState } from "../kit/state";
import { dist, drawAir, drawInspect, drawList, drawRadar } from "./b1-draw";

export type Kind = "phone" | "audio" | "input" | "tag" | "computer" | "bench" | "unknown";
export type Addr = "static" | "rpa" | "pub" | "nrpa";

interface Device {
  label: string;
  kind: Kind;
  rssi: number;
  /** Where the RSSI hovers; it wobbles ±2.5 dB around it. */
  base: number;
  addr: Addr;
  /** Bearing on the radar, radians. */
  at: number;
}

export interface B1State extends BleState {
  active: boolean;
  scanning: boolean;
  window: number;
  pick: number;
  devices: Device[];
  pps: number[];
}

const BOOT = [
  "ble-lab-b1: NimBLE 2.5.1 up, address 7C:DF:A1:0B:5E:3C, TX power 9 dBm",
  "  + active scan, 100/100 ms (100% listening)",
  "",
  'Bluetooth lab B1 Listen  (ble-lab-b1)  ·  phones see "Bench B1"',
  "  scan [on|off]                listen, or pause (alone: toggle; long press too)",
  "  list                         print every device heard in the last 30 s",
  "  pick <n>                     inspect device n from the list",
] as const;

const scanFooter = (st: B1State) =>
  `+ ${st.active ? "active" : "passive"} scan, 100/${st.window} ms`;

function toggleScan(st: B1State, term: TerminalPrinter) {
  st.scanning = !st.scanning;
  st.radio = st.scanning ? "scanning" : "off";
  st.footer = st.scanning ? "+ active scan, 100/100 ms" : "- scan stopped";
  term.line(`  ${st.scanning ? "+ active scan, 100/100 ms (100% listening)" : "- scan stopped"}`);
}

const phone = (st: B1State): Device | undefined => st.devices[1];

export const b1Screen: ScreenSpec<B1State> = {
  views: ["radar", "list", "inspect", "air"],
  captions: [
    (t) => t("labs-ble:screens.b1.captions.0"),
    (t) => t("labs-ble:screens.b1.captions.1"),
    (t) => t("labs-ble:screens.b1.captions.2"),
    (t) => t("labs-ble:screens.b1.captions.3"),
  ],
  boot: BOOT,
  init() {
    const dev = (label: string, kind: Kind, rssi: number, addr: Addr, at: number): Device => ({
      label,
      kind,
      rssi,
      base: rssi,
      addr,
      at,
    });
    return {
      view: 0,
      timers: [],
      radio: "scanning",
      active: true,
      scanning: true,
      window: 100,
      pick: 0,
      footer: "+ active scan, 100/100 ms",
      devices: [
        dev("Bench B2", "bench", -41, "static", 0.4),
        dev("Apple", "phone", -47, "rpa", 1.9),
        dev("JBL Flip 6", "audio", -61, "pub", 3.3),
        dev("MX Keys", "input", -69, "rpa", 4.6),
        dev("Microsoft", "computer", -76, "nrpa", 5.4),
        dev("Apple", "tag", -82, "rpa", 2.6),
        dev("unknown", "unknown", -88, "nrpa", 0.9),
      ],
      pps: Array.from(
        { length: 60 },
        (_, i) => 40 + Math.round(18 * Math.sin(i / 5) + 12 * Math.sin(i / 1.7)),
      ),
    };
  },
  actions: [
    {
      label: (_, t) => t("labs-ble:screens.b1.actions.phoneCloser"),
      run(st, term) {
        const d = phone(st);
        if (!d) return;
        d.base = Math.min(-36, d.base + 8);
        term.line(`  - phone now about ${d.base} dBm`);
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b1.actions.phoneWalkAway"),
      run(st, term) {
        const d = phone(st);
        if (!d) return;
        d.base = Math.max(-92, d.base - 10);
        term.line(`  - phone now about ${d.base} dBm`);
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b1.actions.doubleClickNext"),
      run(st, term) {
        st.pick = (st.pick + 1) % st.devices.length;
        term.line(`  - picked ${st.pick + 1}: ${st.devices[st.pick]?.label ?? ""}`);
      },
    },
    { label: (_, t) => t("labs-ble:screens.b1.actions.longPressScan"), run: (st, term) => toggleScan(st, term) },
  ],
  onCommand(line, st, term) {
    const words = line.split(/\s+/);
    const [cmd, arg] = words;
    if (cmd === "help") {
      BOOT.slice(3).forEach((l) => term.line(l));
      return true;
    }
    if (cmd === "list") {
      term.line(`${st.devices.length} devices heard in the last 30 s (strongest first):`);
      [...st.devices]
        .sort((a, b) => b.rssi - a.rssi)
        .forEach((d, i) =>
          term.line(
            `${String(i + 1).padStart(3)}  ${String(Math.round(d.rssi)).padStart(4)}  ${dist(d.rssi).toFixed(1).padStart(4)}  ${d.kind.padEnd(14)}  ${d.addr.padEnd(6)}  ${d.label}`,
          ),
        );
      return true;
    }
    const n = Number(arg);
    if (cmd === "pick" && n >= 1 && n <= st.devices.length) {
      st.pick = n - 1;
      st.view = 2;
      term.line(`  - picked ${arg}: ${st.devices[st.pick]?.label ?? ""}`);
      return true;
    }
    if (cmd === "mode") {
      st.active = arg ? arg === "active" : !st.active;
      st.footer = scanFooter(st);
      term.line(`  ${st.footer}`, "info");
      return true;
    }
    if (cmd === "scan") {
      toggleScan(st, term);
      return true;
    }
    if (cmd === "timing") {
      st.window = Math.max(10, Math.min(100, Number(words[2] || 100) || 100));
      st.footer = scanFooter(st);
      term.line(`  ${st.footer} (${st.window}% listening)`, "info");
      return true;
    }
    return false;
  },
  draw(g, C, view, t, st) {
    st.devices.forEach((d, i) => {
      d.rssi = d.base + Math.sin(t * 0.9 + i * 2) * 2.5;
    });
    if (view === 0) drawRadar(g, C, t, st);
    else if (view === 1) drawList(g, C, st);
    else if (view === 2) drawInspect(g, C, st);
    else drawAir(g, C, st);
  },
};
