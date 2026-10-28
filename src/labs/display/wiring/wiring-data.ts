// The display's 8 jumper wires, in the order lesson 03 places them, and the ESP32 left header.
import type { CSSProperties } from "react";
import { HEADER } from "@/domain/board";

/** The display module's pins; also the keys of their explanations (labs-display wires.*). */
export type DisplayPin = "GND" | "VCC" | "SCL" | "SDA" | "RES" | "DC" | "CS" | "BLK";

export interface DisplayWire {
  /** Pin label on the display module. */
  readonly disp: DisplayPin;
  /** Pin label on the ESP32. */
  readonly esp: string;
  /** Position on the ESP32 left header, top (0) to bottom (21). */
  readonly idx: number;
  /** Wire colour token. */
  readonly color: `--${string}`;
  /** Seconds per dash cycle when signals flow; 0 = a steady line (power, reset, backlight). */
  readonly speed: number;
}

export const WIRES: readonly DisplayWire[] = [
  {
    disp: "GND",
    esp: "GND",
    idx: 21,
    color: "--w-gnd",
    speed: 0,
  },
  {
    disp: "VCC",
    esp: "3V3",
    idx: 0,
    color: "--w-vcc",
    speed: 0,
  },
  {
    disp: "SCL",
    esp: "GPIO 12",
    idx: 17,
    color: "--w-scl",
    speed: 0.35,
  },
  {
    disp: "SDA",
    esp: "GPIO 11",
    idx: 16,
    color: "--w-sda",
    speed: 0.6,
  },
  {
    disp: "RES",
    esp: "GPIO 8",
    idx: 11,
    color: "--w-res",
    speed: 0,
  },
  {
    disp: "DC",
    esp: "GPIO 9",
    idx: 14,
    color: "--w-dc",
    speed: 1.6,
  },
  {
    disp: "CS",
    esp: "GPIO 10",
    idx: 15,
    color: "--w-cs",
    speed: 2.4,
  },
  {
    disp: "BLK",
    esp: "GPIO 7",
    idx: 6,
    color: "--w-blk",
    speed: 0,
  },
];

export const LEFT_HEADER = HEADER.L;

/** "4" → "GPIO 4"; power and control pins keep their name. */
export const headerLabel = (pin: string) => (/^\d+$/.test(pin) ? `GPIO ${pin}` : pin);

/** CSS custom properties for inline styles, e.g. cssVars({ "--speed": "0.35s" }). */
export const cssVars = (vars: Record<`--${string}`, string>) => vars as CSSProperties;
