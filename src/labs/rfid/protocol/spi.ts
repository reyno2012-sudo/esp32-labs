// R1's register access over SPI: what the four wires carry for one 2-byte transfer.
import { hx } from "./bytes";

export interface Register {
  readonly name: "VersionReg" | "ComIrqReg" | "TxControlReg" | "RFCfgReg";
  readonly a: number;
  readonly v: number;
}

// What each value means is interface text: spi.regs.<name> in the labs-rfid catalogue.
export const REGS: readonly Register[] = [
  { name: "VersionReg", a: 0x37, v: 0x92 },
  { name: "ComIrqReg", a: 0x04, v: 0x14 },
  { name: "TxControlReg", a: 0x14, v: 0x83 },
  { name: "RFCfgReg", a: 0x26, v: 0x40 },
];

/** Wiring faults the panel can simulate; their labels are spi.faults.<fault>. */
export const FAULTS = ["none", "miso", "power", "ss"] as const;
export type Fault = (typeof FAULTS)[number];

export interface SpiFrame {
  readonly r: Register;
  readonly read: boolean;
  readonly fault: Fault;
  readonly addr: number;
  readonly data: number;
  readonly answer: number;
  readonly mosi: readonly number[];
  readonly miso: readonly number[];
}

const bitsMsbFirst = (byte: number) => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1);

/** Address byte: read = 0x80 | reg << 1, write = reg << 1. A write sends 03h. */
export function spiFrame(r: Register, read: boolean, fault: Fault): SpiFrame {
  const addr = read ? 0x80 | (r.a << 1) : (r.a << 1) & 0x7e;
  const data = read ? 0x00 : 0x03;
  const answer = fault === "power" ? 0x00 : fault === "miso" || fault === "ss" ? 0xff : r.v;
  return {
    r,
    read,
    fault,
    addr,
    data,
    answer,
    mosi: [...bitsMsbFirst(addr), ...bitsMsbFirst(data)],
    miso: bitsMsbFirst(answer),
  };
}

export const BIT_NAMES = [
  "R/W",
  "A5",
  "A4",
  "A3",
  "A2",
  "A1",
  "A0",
  "0",
  "D7",
  "D6",
  "D5",
  "D4",
  "D3",
  "D2",
  "D1",
  "D0",
] as const;

export type BitCaptionId =
  | "rwRead"
  | "rwWrite"
  | "addrRead"
  | "addrWrite"
  | "zero"
  | "write"
  | "answer"
  | "power"
  | "float"
  | "floatSs";

/** The caption for the bit under the cursor: which explanation (spi.bits.<id>) and its values. */
export function bitCaption(
  f: SpiFrame,
  bit: number,
): { readonly id: BitCaptionId; readonly values: Readonly<Record<string, string>> } {
  if (bit === 0) return { id: f.read ? "rwRead" : "rwWrite", values: {} };
  if (bit < 7)
    return {
      id: f.read ? "addrRead" : "addrWrite",
      values: {
        a: hx(f.r.a),
        bits: f.r.a.toString(2).padStart(6, "0"),
        name: f.r.name,
        addr: hx(f.addr),
      },
    };
  if (bit === 7) return { id: "zero", values: {} };
  if (!f.read) return { id: "write", values: { data: hx(f.data) } };
  if (f.fault === "none") return { id: "answer", values: { answer: hx(f.answer) } };
  if (f.fault === "power") return { id: "power", values: {} };
  return { id: f.fault === "ss" ? "floatSs" : "float", values: {} };
}
