// The ESP32-S3 DevKitC-1 header, USB at the bottom, as the pinout drawing lists it top to bottom.
import type { PinSide, PinUse } from "./lesson";

export const HEADER: Readonly<Record<PinSide, readonly string[]>> = {
  L: [
    "3V3",
    "3V3",
    "RST",
    "4",
    "5",
    "6",
    "7",
    "15",
    "16",
    "17",
    "18",
    "8",
    "3",
    "46",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "5V",
    "GND",
  ],
  R: [
    "GND",
    "43",
    "44",
    "1",
    "2",
    "42",
    "41",
    "40",
    "39",
    "38",
    "37",
    "36",
    "35",
    "0",
    "45",
    "48",
    "47",
    "21",
    "20",
    "19",
    "GND",
    "GND",
  ],
};

const ALIAS: Readonly<Record<string, string>> = { "43": "TX 43", "44": "RX 44" };

/** Strapping, USB, PSRAM and UART pins: usable, but best left alone on this board. */
const AVOID = new Set(["0", "3", "45", "46", "19", "20", "35", "36", "37", "43", "44"]);

export type PinClass = "power" | "gnd" | "avoid" | "safe";

export function classifyPin(pin: string): PinClass {
  if (pin === "3V3" || pin === "5V") return "power";
  if (pin === "GND") return "gnd";
  if (pin === "RST" || AVOID.has(pin)) return "avoid";
  return "safe";
}

export const pinLabel = (pin: string) => ALIAS[pin] ?? pin;

/** Header position of a pin a lesson uses: its explicit index, else its first appearance. */
export const pinIndex = (use: PinUse) => use.idx ?? HEADER[use.side].indexOf(use.pin);
