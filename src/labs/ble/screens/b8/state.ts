import type { BleState, Mark } from "../../kit/state";

export interface B8Device {
  name: string;
  hid: boolean;
  rssi: number;
  bonded: boolean;
}

/** One row of the explore view: a service (0), characteristic (1) or descriptor (2). */
export interface TreeNode {
  l: 0 | 1 | 2;
  t: string;
  /** Properties, e.g. "RN". */
  p?: string;
  /** The value read, or a note. */
  v?: string;
}

export interface HidReportLine {
  id: number;
  kind: "kbd" | "media" | "mouse";
  bytes: number[];
  decoded: string;
}

export interface Stroke {
  x: number;
  y: number;
  down: boolean;
  colour: number;
  size: number;
}

export interface B8State extends BleState {
  rssi: number;
  encrypted: boolean;
  bonded: boolean;
  devices: B8Device[];
  pick: number;
  /** What the board is busy with ("connecting", "pairing"...), drawn as a box over the view. */
  phase: string;
  target: string;
  tree: TreeNode[];
  treeNote: string;
  hosting: "" | "keyboard" | "mouse";
  de: boolean;
  boot: boolean;
  text: string;
  mods: number;
  held: number[];
  keys: number;
  media: string;
  mediaAt: number;
  mx: number;
  my: number;
  brush: number;
  colour: number;
  strokes: Stroke[];
  trail: [number, number][];
  clickAt: number;
  reports: HidReportLine[];
  log: { time: string; mark: Mark; text: string }[];
}

export function b8Init(): B8State {
  return {
    view: 0,
    radio: "scanning",
    rssi: 0,
    encrypted: false,
    bonded: false,
    footer: "",
    footerCol: "teal",
    devices: [
      { name: "Bench Keys", hid: true, rssi: -48, bonded: false },
      { name: "Bench Mouse", hid: true, rssi: -56, bonded: false },
      { name: "JBL speaker", hid: false, rssi: -61, bonded: false },
      { name: "Bench B3", hid: false, rssi: -66, bonded: false },
      { name: "Apple", hid: false, rssi: -74, bonded: false },
    ],
    pick: 0,
    phase: "",
    target: "",
    tree: [],
    treeNote: "",
    hosting: "",
    de: false,
    boot: false,
    text: "",
    mods: 0,
    held: [],
    keys: 0,
    media: "",
    mediaAt: 0,
    mx: 160,
    my: 94,
    brush: 3,
    colour: 0,
    strokes: [],
    trail: [],
    clickAt: 0,
    reports: [],
    log: [],
    timers: [],
  };
}
