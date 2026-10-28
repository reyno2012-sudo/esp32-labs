// B3 "The Bench service, live": the GATT rows and the ATT packets each operation sends.
import type { BleT } from "../../i18n";
import { ascii, hx } from "../../protocol/hex";

export type Op = "read" | "write" | "subscribe" | "notify";

export interface GattRow {
  /** The characteristic's name in the firmware (its 2901 descriptor): stays in English. */
  readonly name: string;
  readonly uuid: string;
  /** Value handle. */
  readonly h: number;
  readonly props: string;
  /** The CCCD's handle (value handle + 1) for notifying rows. */
  readonly cccd?: number;
  readonly ops: Partial<Record<Op, readonly number[]>>;
  show(v: readonly number[], t: BleT): string;
}

const at = (v: readonly number[], i: number) => v[i] ?? 0;

export const GATT_ROWS: readonly GattRow[] = [
  {
    name: "LED",
    uuid: "ba5e0001",
    h: 0x10,
    props: "read · write",
    ops: { read: [0xff, 0x50, 0x00], write: [0x00, 0x80, 0xff] },
    show: (v) => `R ${at(v, 0)} G ${at(v, 1)} B ${at(v, 2)}`,
  },
  {
    name: "Message",
    uuid: "ba5e0002",
    h: 0x13,
    props: "read · write",
    ops: { write: ascii("hi bench") },
    show: (v) => `“${String.fromCharCode(...v)}”`,
  },
  {
    name: "Button",
    uuid: "ba5e0003",
    h: 0x16,
    props: "read · notify",
    cccd: 0x17,
    ops: { subscribe: [0x01, 0x00], notify: [0x02, 0x08, 0x00] },
    show: (v, t) =>
      v.length === 2
        ? t("table.show.cccd")
        : t("table.show.gesture", {
            gesture: at(v, 0),
            name: ["", "click", "double", "long"][at(v, 0)] ?? "",
            count: at(v, 1) | (at(v, 2) << 8),
          }),
  },
  {
    name: "Temperature",
    uuid: "ba5e0004",
    h: 0x1a,
    props: "read · notify",
    ops: { read: [0x2e, 0x10] },
    show: (v, t) => t("table.show.celsius", { value: (((at(v, 1) << 24) >> 16) | at(v, 0)) / 100 }),
  },
  {
    name: "Uptime",
    uuid: "ba5e0005",
    h: 0x1e,
    props: "read",
    ops: { read: [0x2c, 0x01, 0x00, 0x00] },
    show: (v, t) => t("table.show.seconds", { value: at(v, 0) | (at(v, 1) << 8) | (at(v, 2) << 16) }),
  },
];

/** How an operation travels; its explanation lives in the catalogue (table.ops.<op>.what). */
interface OpSpec {
  req(r: GattRow, v: readonly number[]): number[];
  rsp: ((r: GattRow, v: readonly number[]) => number[]) | null;
  /** "in": the phone asks the board; "out": the board sends on its own. */
  dir: "in" | "out";
}

export const OPS: Readonly<Record<Op, OpSpec>> = {
  read: {
    req: (r) => [0x0a, r.h, 0x00],
    rsp: (_, v) => [0x0b, ...v],
    dir: "in",
  },
  write: {
    req: (r, v) => [0x12, r.h, 0x00, ...v],
    rsp: () => [0x13],
    dir: "in",
  },
  subscribe: {
    req: (r, v) => [0x12, r.cccd ?? r.h + 1, 0x00, ...v],
    rsp: () => [0x13],
    dir: "in",
  },
  notify: {
    req: (r, v) => [0x1b, r.h, 0x00, ...v],
    rsp: null,
    dir: "out",
  },
};

export const handleLabel = (r: GattRow): string => `${r.uuid} · ${hx(r.h)}h · ${r.props}`;
