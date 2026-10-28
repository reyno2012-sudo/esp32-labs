// R2-R5 step-by-step flows: the ESP32's SPI writes, the chip, and the card's answers.
import type { FlowShape, FlowShapes } from "./flow-text";
import { bccOf, crcA, hx, hxs, RF, withCrc } from "../protocol/bytes";

const u = RF.card.uid;
const b = bccOf(u);
const sel = withCrc([0x93, 0x70, ...u, b]);
const sak = withCrc([0x08]);

export const RFID_FLOWS: FlowShapes = {
  wake: {
    wait: [1, 5],
    steps: [
      {
        f: 0,
        t: 1,
        msg: "FIFO ← 52 · 7 bits",
        ms: 0.05,
        code: "SPI  12 52   FIFODataReg ← 52   (09h, write: 09 << 1 = 12)\nSPI  1A 07   BitFramingReg ← 7 bits in the last byte",
      },
      {
        f: 0,
        t: 1,
        msg: "Transceive + StartSend",
        ms: 0.02,
        code: "SPI  02 0C   CommandReg ← Transceive\nSPI  1A 87   BitFramingReg ← StartSend | 7 bits",
      },
      {
        f: 1,
        t: 2,
        msg: "WUPA 52 · 7 bits",
        ms: 0.085,
        net: true,
        code: "air  52h, least significant bit first: 0 1 0 0 1 0 1\n     symbols Z (start) · Z X Y Z X Y X (7 bits) · Y Y (end)\n     9.44 µs per bit = 128 carrier cycles → 106 kbit/s",
      },
      {
        f: 2,
        t: 2,
        ms: 0.086,
        code: "frame delay time = 1172 / fc ≈ 86.4 µs  (last bit 0)\n                   1236 / fc ≈ 91.2 µs  (last bit 1)",
      },
      {
        f: 2,
        t: 1,
        msg: "ATQA 04 00",
        ms: 0.19,
        net: true,
        code: "air  04 00   ATQA, low byte first\n     bits 7-6 of 04h = 00 → UID is 4 bytes\n     bit 2 → bit-frame anticollision supported",
      },
      {
        f: 1,
        t: 0,
        msg: "IRQ ↓ (RxIRq)",
        ms: 0.01,
        code: "IRQ pin   high → low\nor poll   SPI 88 → 30   ComIrqReg = RxIRq | IdleIRq",
      },
      {
        f: 0,
        t: 1,
        ms: 0.05,
        code: "SPI  8C → 00        ErrorReg: no error\nSPI  94 → 02        FIFOLevelReg: 2 bytes\nSPI  92 92 00 → 04 00   FIFODataReg, burst\nSPI  98 → 00        ControlReg: 0 = all 8 bits valid",
      },
    ],
  },
  select: {
    steps: [
      {
        f: 1,
        t: 2,
        msg: "93 20 · ANTICOLL",
        ms: 0.2,
        net: true,
        code: "air  93 20",
      },
      {
        f: 2,
        t: 1,
        msg: `${hxs(u)} ${hx(b)}`,
        ms: 0.47,
        net: true,
        code: `air  ${hxs(u)} ${hx(b)}\n     BCC = ${u.map(hx).join(" ^ ")} = ${hx(b)}`,
      },
      {
        f: 1,
        t: 1,
        ms: 0.1,
        code: `BCC ${hx(b)} ✓\nCRC_A(93 70 ${hxs(u)} ${hx(b)}) = ${hxs(sel.slice(7))}`,
      },
      {
        f: 1,
        t: 2,
        msg: "93 70 … SELECT",
        ms: 0.78,
        net: true,
        code: `air  ${hxs(sel)}`,
      },
      {
        f: 2,
        t: 1,
        msg: `SAK ${hxs(sak)}`,
        ms: 0.27,
        net: true,
        code: `air  ${hxs(sak)}\n     08h → MIFARE Classic 1K · UID complete`,
      },
      {
        f: 1,
        t: 2,
        msg: "50 00 · HLTA",
        ms: 0.36,
        net: true,
        code: `air  ${hxs(withCrc([0x50, 0x00]))}\n     no answer within 1 ms = halted`,
      },
    ],
  },
  read: {
    steps: [
      {
        f: 0,
        t: 1,
        msg: "FIFO ← 60 04 key UID",
        ms: 0.05,
        code: `FIFO 60 04 FF FF FF FF FF FF ${hxs(u)}\nSPI  02 0E   CommandReg ← MFAuthent\n(the key never goes into the sniffer)`,
      },
      {
        f: 1,
        t: 2,
        msg: `60 04 ${hxs(crcA([0x60, 0x04]))}`,
        ms: 0.36,
        net: true,
        code: "",
      },
      {
        f: 2,
        t: 1,
        ms: 0.36,
        net: true,
        code: "",
      },
      {
        f: 1,
        t: 2,
        ms: 0.7,
        net: true,
        code: "",
      },
      {
        f: 2,
        t: 1,
        ms: 0.36,
        net: true,
        code: "SPI  90 → 08   Status2Reg: MFCrypto1On",
      },
      {
        f: 1,
        t: 2,
        ms: 0.36,
        net: true,
        code: "",
      },
      {
        f: 2,
        t: 1,
        ms: 1.55,
        net: true,
        code: "68 65 6C 6C 6F 20 62 65 6E 63 68 00 00 00 00 00  |hello bench.....|  + CRC_A",
      },
      {
        f: 1,
        t: 0,
        ms: 0.06,
        code: "",
      },
    ],
  },
  credits: {
    steps: [
      {
        f: 1,
        t: 2,
        msg: "C2 08 · RESTORE",
        ms: 0.36,
        net: true,
        code: "air  C2 08 + CRC → ACK (4 bits: A)\n     00 00 00 00 + CRC → silence = ok",
      },
      {
        f: 1,
        t: 2,
        msg: "B0 09 · TRANSFER",
        ms: 0.36,
        net: true,
        code: "air  B0 09 + CRC → ACK\nblock 9 ← 50",
      },
      {
        f: 1,
        t: 2,
        msg: "C0 08 · DECREMENT 3",
        ms: 0.4,
        net: true,
        code: "air  C0 08 + CRC → ACK\n     03 00 00 00 + CRC → silence = ok\nregister = 50 − 3 = 47",
      },
      {
        f: 1,
        t: 2,
        msg: "B0 08 · TRANSFER",
        ms: 0.36,
        net: true,
        code: "air  B0 08 + CRC → ACK\nblock 8 ← 47",
      },
      {
        f: 1,
        t: 0,
        ms: 3,
        code: "credits 47 (block 8) · backup 50 (block 9)",
      },
    ],
  },
};

/** The flows a panel asks for, in its order (all of them when it names none). */
export function pickFlows(all: FlowShapes, keys: readonly string[] | undefined): FlowShapes {
  const picked: Record<string, FlowShape> = {};
  for (const k of keys ?? Object.keys(all)) {
    const flow = all[k];
    if (flow) picked[k] = flow;
  }
  return picked;
}
