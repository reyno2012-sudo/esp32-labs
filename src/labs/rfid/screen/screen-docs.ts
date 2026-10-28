// "What the screen shows": each view with numbered callouts, and the example state it is drawn with.
import { bccOf, RF, withCrc } from "../protocol/bytes";
import { exampleCard } from "../protocol/card-memory";
import { EDGE } from "../edge/edge-data";
import type { RfidScreenState, TraceFrame } from "./rfid-screen";

/** Where each numbered callout sits, [x, y] in screen pixels (320 × 170), per view. Their
 * explanations, and when each view shows, are screens.<view> in the labs-rfid catalogue. */
export const SCREEN_MARKS: readonly (readonly (readonly [number, number])[])[] = [
  [[22, 60], [96, 42], [212, 42], [96, 84], [212, 84], [96, 132], [242, 126], [304, 36], [4, 164], [316, 164]],
  [[14, 100], [36, 48], [136, 40], [136, 69], [136, 90], [136, 133], [136, 151]],
  [[20, 30], [46, 30], [110, 30], [262, 30]],
  [[308, 37], [17, 52], [100, 70], [100, 106], [300, 143]],
  [[96, 136], [100, 70], [100, 100]],
  [[64, 37], [312, 92], [145, 46], [158, 154]],
];

const u = RF.card.uid;
const bcc = bccOf(u);
const EXAMPLE_FRAMES: readonly TraceFrame[] = [
  { dir: ">", bytes: [0x52], name: "WUPA", t: 0 },
  { dir: "<", bytes: [0x04, 0x00], name: "ATQA", t: 0.371 },
  { dir: ">", bytes: [0x93, 0x20], name: "ANTICOLL CL1", t: 0.64 },
  { dir: "<", bytes: [...u, bcc], name: "UID + BCC", t: 1.2 },
  { dir: ">", bytes: withCrc([0x93, 0x70, ...u, bcc]), name: "SELECT CL1", t: 1.5 },
  { dir: "<", bytes: withCrc([0x08]), name: "SAK", t: 2.58 },
  { dir: ">", bytes: withCrc([0x50, 0x00]), name: "HLTA", t: 2.79 },
];
const EXAMPLE_DUMP = { uid: u, mem: exampleCard(true) };
const NOTES = [
  "self-test passed: 64/64 bytes",
  "",
  "",
  "dump: 16 sectors read",
  "credits: 47",
  "SPI sweep: errors from 16 MHz",
] as const;

/**
 * The screen as it looks after R1-R6, for one view. The card and trace views show a card
 * present (and the card view a collision); the others don't.
 */
export function exampleScreen(view: number): RfidScreenState {
  return {
    view,
    uid: view >= 1 && view <= 3 ? u : null,
    rate: 100,
    taps: 3,
    polling: true,
    coll: view === 1 ? 23 : 0,
    selfTest: 1,
    gain: 4,
    irq: true,
    mhz: 4,
    trace: true,
    frames: EXAMPLE_FRAMES,
    dump: EXAMPLE_DUMP,
    credits: { v: 47, b: 50 },
    edge: EDGE[0] ?? null,
    busy: null,
    progress: 0,
    note: NOTES[view] ?? "",
    noteBad: false,
  };
}
