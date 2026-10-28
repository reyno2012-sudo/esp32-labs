// The logic of wifi-lab-w1 (scanner views, auto-scan, joining) as pure functions. Each one
// changes the state it is given and returns what the firmware prints; the preview only draws.
import { EXAMPLE_NETS, netName, type WifiNet } from "./example-nets";
import type { LogLine } from "./log";

export type Link = "none" | "joining" | "up";

export const SCANNER_VIEWS = ["networks", "channels", "radar", "status"] as const;

const SCAN_MS = 2400;
const AUTO_EVERY_MS = 10_000;
const JOIN_MS = 2500;
const PAGE_MS = 4000;
const HISTORY = 60;

export interface ScannerState {
  view: number;
  page: number;
  flipAt: number;
  nets: WifiNet[];
  scanning: boolean;
  scanStart: number;
  lastMs: number;
  scans: number;
  auto: boolean;
  finishedAt: number;
  link: Link;
  linkAt: number;
  lastSample: number;
  rssiHist: number[];
}

/** Power-on: no saved network, the start-up scan already running. */
export const initScanner = (now = 0): ScannerState => ({
  view: 0,
  page: 0,
  flipAt: now,
  nets: [],
  scanning: true,
  scanStart: now,
  lastMs: 0,
  scans: 0,
  auto: true,
  finishedAt: 0,
  link: "none",
  linkAt: 0,
  lastSample: 0,
  rssiHist: [],
});

export function bootScanner(st: ScannerState, now: number): LogLine[] {
  st.scanStart = now;
  st.flipAt = now;
  return [
    ["[I][connection.h:44] begin(): No saved network. Type 'join <number>' after a scan.", "info"],
    [
      "[I][main.cpp:196] setup(): Wi-Fi lab W1: station mode, MAC 28:84:85:9E:3B:E4. Radio: 2.4 GHz only.",
      "info",
    ],
    ["[I][main.cpp:68] scanNow(): scan started (start-up)", "info"],
    ...setView(st, 0, now),
  ];
}

export function setView(st: ScannerState, v: number, now: number, via?: string): LogLine[] {
  const n = SCANNER_VIEWS.length;
  st.view = ((v % n) + n) % n;
  st.page = 0;
  st.flipAt = now;
  const lines: LogLine[] = via ? [[via, "you"]] : [];
  lines.push([
    `[I][main.cpp:73] setView(): view ${st.view + 1}: ${SCANNER_VIEWS[st.view]}`,
    "info",
  ]);
  return lines;
}

export function setAuto(st: ScannerState, on: boolean): LogLine[] {
  st.auto = on;
  return [[`[I][main.cpp:79] setAuto(): auto-scan ${on ? "on" : "off"}`, "info"]];
}

export function startScan(st: ScannerState, why: string, now: number): LogLine[] {
  if (st.scanning) return [];
  st.scanning = true;
  st.scanStart = now;
  return [[`[I][main.cpp:68] scanNow(): scan started (${why})`, "info"]];
}

/** The scan table the firmware prints, strongest first. `rand` is Math.random in the preview. */
export function finishScan(st: ScannerState, now: number, rand: () => number): LogLine[] {
  st.scanning = false;
  st.lastMs = Math.round(2100 + rand() * 700);
  st.scans++;
  st.finishedAt = now;
  st.nets = EXAMPLE_NETS.map((n) => ({ ...n, rssi: n.rssi + Math.round(rand() * 6 - 3) })).sort(
    (a, b) => b.rssi - a.rssi,
  );
  return [
    [
      `[I][main.cpp:166] loop(): scan ${st.scans} done: ${st.nets.length} networks in ${st.lastMs} ms`,
      "info",
    ],
    [" #   dBm  ch  security    ssid", "plain"],
    ...st.nets.map((n, i): LogLine => [
      `${String(i + 1).padStart(2)}  ${String(n.rssi).padStart(4)}  ${String(n.ch).padStart(2)}  ${n.auth.padEnd(10)}  ${netName(n)}`,
      "plain",
    ]),
  ];
}

/** "join 1" plus the password line: saves the strongest network and starts joining it. */
export function joinFirst(st: ScannerState, now: number): LogLine[] {
  const first = st.nets[0];
  if (!first)
    return [["[W][main.cpp:93] startJoin(): join needs a number from the last scan table", "warn"]];
  const lines: LogLine[] = [
    ["join 1", "you"],
    [
      `Password for '${first.ssid}' (the monitor shows what you type; it is stored on the chip only):`,
      "plain",
    ],
    ["••••••••••••", "you"],
    [
      `[I][connection.h:57] save(): Saved '${first.ssid}' (password: 12 characters, not shown)`,
      "info",
    ],
    [`[I][connection.h:83] connect(): Joining '${first.ssid}'...`, "info"],
  ];
  st.link = "joining";
  st.linkAt = now;
  return [...lines, ...setView(st, 3, now)];
}

/** The firmware's loop(): joins finish, the signal is sampled, scans start and end, pages flip. */
export function stepScanner(st: ScannerState, now: number, rand: () => number): LogLine[] {
  const lines: LogLine[] = [];
  if (st.link === "joining" && now - st.linkAt > JOIN_MS) {
    st.link = "up";
    st.linkAt = now;
    const n = st.nets[0] ?? EXAMPLE_NETS[0];
    if (n) {
      lines.push([
        `[I][connection.h:98] loop(): Connected to '${n.ssid}': IP 192.168.1.42 (example), channel ${n.ch}, ${n.rssi} dBm`,
        "info",
      ]);
      lines.push([
        "[I][connection.h:101] loop(): Reachable as bench.local (try: ping bench.local)",
        "info",
      ]);
    }
  }
  if (st.link === "up" && now - st.lastSample > 1000) {
    st.lastSample = now;
    const base = (st.nets[0] ?? EXAMPLE_NETS[0])?.rssi ?? -60;
    st.rssiHist.push(base + Math.round(Math.sin(now / 3000) * 3 + rand() * 2 - 1));
    if (st.rssiHist.length > HISTORY) st.rssiHist.shift();
  }
  if (st.scanning && now - st.scanStart >= SCAN_MS) lines.push(...finishScan(st, now, rand));
  if (st.auto && st.link !== "joining" && !st.scanning && now - st.finishedAt >= AUTO_EVERY_MS)
    lines.push(...startScan(st, "auto", now));
  if (st.view === 0 && now - st.flipAt >= PAGE_MS) {
    st.page++;
    st.flipAt = now;
  }
  return lines;
}
