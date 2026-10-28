// The Bench service state B3, B4 and B5 share (they reuse the same GATT table).
import type { LoggingState } from "../../kit/state";

export type OpKind = "read" | "write" | "notify" | "subscribe" | "refused";

export interface BenchOp {
  readonly kind: OpKind;
  /** Seconds (performance.now() / 1000). */
  readonly at: number;
}

export interface BenchState extends LoggingState {
  rssi: number;
  interval: number;
  latency: number;
  phy: string;
  led: [number, number, number];
  message: string;
  count: number;
  temp: number;
  /** Last operation per GATT row (LED, Message, Button, Temperature, Uptime, Vault). */
  ops: (BenchOp | undefined)[];
  sub: boolean[];
  rx: number;
  tx: number;
  encrypted: boolean;
  bonded: boolean;
}

export function benchInit(): BenchState {
  return {
    view: 0,
    timers: [],
    radio: "advertising",
    rssi: -52,
    interval: 30,
    latency: 0,
    phy: "1M/1M",
    led: [0, 0, 0],
    message: "",
    count: 0,
    temp: 41.42,
    ops: [],
    sub: [false, false, false, false, false, false],
    rx: 0,
    tx: 0,
    encrypted: false,
    bonded: false,
    log: [["    2.1", "-", 'advertising as "Bench B3"']],
    footer: '- advertising as "Bench B3"',
  };
}

/** Lights row `i` of the gatt view with an operation. */
export const benchOp = (st: BenchState, i: number, kind: OpKind): void => {
  st.ops[i] = { kind, at: performance.now() / 1000 };
};
