// R6's edge lab experiments. Example numbers are illustrative (a typical RC522 on 15 cm jumpers),
// not measured on your board. The panel's words (what, look, axis titles) are edge.<key>.* in
// the labs-rfid catalogue. Each parser reads the exact table the firmware prints
// (kit/lib/rfid-lab-kit/src/edge.h).

export type Row = readonly [label: string, value: number];

export interface EdgeExperiment {
  readonly key: "spi" | "gain" | "timeout" | "timing" | "irq" | "crc" | "stress";
  /** The experiment's name as the firmware prints and draws it; the panel shows edge.<key>.label. */
  readonly label: string;
  readonly cmd: string;
  readonly example: readonly Row[];
  /** Fixed top of the scale (percentages). */
  readonly max?: number;
  /** The bar outlined as the reference. */
  readonly mark?: string;
  /** A dashed line after bar n. */
  readonly between?: number;
  /** Dashed outlines behind the bars. */
  readonly ghost?: readonly number[];
  parse(text: string): Row[];
}

const rows = (t: string, re: RegExp, f: (m: RegExpMatchArray) => Row) => [...t.matchAll(re)].map(f);
const num = (s: string | undefined) => Number(s ?? 0);

export const EDGE: readonly EdgeExperiment[] = [
  {
    key: "spi",
    label: "SPI clock",
    cmd: "edge spi",
    example: [
      ["1", 0],
      ["2", 0],
      ["4", 0],
      ["8", 0],
      ["10", 0],
      ["13", 0],
      ["16", 0.4],
      ["20", 3.1],
      ["26", 22],
      ["40", 61],
    ],
    mark: "10",
    parse: (t) =>
      rows(t, /^\s*(\d+)\s+([\d.]+)\s*%\s+\d+\s*\/\s*\d+/gm, (m) => [m[1] ?? "", num(m[2])]),
  },
  {
    key: "gain",
    label: "Gain vs distance",
    cmd: "edge gain",
    max: 100,
    example: [
      ["18", 0],
      ["23", 13],
      ["33", 87],
      ["38", 100],
      ["43", 100],
      ["48", 100],
    ],
    mark: "33",
    parse: (t) => rows(t, /^\s*(\d+)\s*dB\s+(\d+)\s*%/gm, (m) => [m[1] ?? "", num(m[2])]),
  },
  {
    key: "timeout",
    label: "Card reply time",
    cmd: "edge timeout",
    max: 100,
    example: [
      ["25ms", 100],
      ["5ms", 100],
      ["1ms", 100],
      ["500", 100],
      ["300", 100],
      ["200", 100],
      ["150", 100],
      ["120", 100],
      ["100", 95],
      ["80", 0],
      ["60", 0],
      ["40", 0],
    ],
    between: 8,
    parse: (t) =>
      rows(t, /^\s*(\d+)\s*us\s+(\d+)\s*%\s+(\d+)\s*%/gm, (m) => [
        num(m[1]) >= 1000 ? `${num(m[1]) / 1000}ms` : (m[1] ?? ""),
        num(m[2]),
      ]),
  },
  {
    key: "timing",
    label: "Time per step",
    cmd: "edge timing",
    example: [
      ["WUPA", 480],
      ["SELECT", 1260],
      ["AUTH", 2350],
      ["READ", 2210],
    ],
    ghost: [360, 1140, 1950, 1990],
    parse: (t) =>
      rows(t, /^\s*(WUPA|SELECT|AUTH|READ)\s+(\d+)\s+([\d.]+)\s+(\d+)/gm, (m) => [
        m[1] ?? "",
        num(m[3]),
      ]),
  },
  {
    key: "irq",
    label: "Polling vs IRQ",
    cmd: "edge irq",
    example: [
      ["poll", 37],
      ["irq", 16],
    ],
    parse: (t) =>
      rows(t, /^\s*(poll|irq)\s+([\d.]+)\s+([\d.]+)\s*$/gm, (m) => [m[1] ?? "", num(m[2])]),
  },
  {
    key: "crc",
    label: "CRC: chip vs CPU",
    cmd: "edge crc",
    example: [
      ["chip", 95],
      ["ESP32", 0.6],
    ],
    parse: (t) => {
      const m = /chip coprocessor ([\d.]+) us\/frame.*?ESP32 ([\d.]+) us\/frame/s.exec(t);
      return m
        ? [
            ["chip", num(m[1])],
            ["ESP32", num(m[2])],
          ]
        : [];
    },
  },
  {
    key: "stress",
    label: "Stress run",
    cmd: "edge stress 500",
    example: [
      ["ok", 496],
      ["absent", 2],
      ["CRC", 1],
      ["proto", 1],
      ["coll", 0],
      ["NAK", 0],
      ["other", 0],
    ],
    mark: "ok",
    parse: (t) =>
      rows(t, /^\s*(ok|absent|CRC|proto|coll|NAK|other)\s+(\d+)\s*$/gm, (m) => [
        m[1] ?? "",
        num(m[2]),
      ]),
  },
];

/** Strips the serial monitor's time stamps ("14:02:07.123 > "). */
export const cleanMonitor = (t: string) => t.replace(/^\d{2}:\d{2}:\d{2}\.\d{3} > ?/gm, "");

/** Rounds a chart's top up to 1, 2, 4, 5 or 10 × 10ⁿ so the 4 grid lines land on plain numbers. */
export function niceTop(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 4, 5, 10].map((k) => k * p).find((x) => x >= v) ?? 10 * p;
}
