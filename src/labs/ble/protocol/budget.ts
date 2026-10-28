// A coin-cell beacon's current budget, for B2's budget view. An estimate with stated assumptions,
// for a typical beacon chip (not this board).

const TX_DBM = [-24, -12, -8, -4, 0, 4, 8, 12, 16, 20];
const TX_MA = [3.2, 4.0, 4.3, 4.8, 5.3, 7.5, 10, 14, 19, 26];

/** Transmit current in mA at a TX power, interpolated from a datasheet-like table. */
export function b2TxMa(dbm: number): number {
  const at = (i: number) => [TX_DBM[i] ?? 0, TX_MA[i] ?? 0] as const;
  if (dbm <= at(0)[0]) return at(0)[1];
  for (let i = 1; i < TX_DBM.length; i++) {
    const [p1, m1] = at(i);
    const [p0, m0] = at(i - 1);
    if (dbm <= p1) return m0 + ((m1 - m0) * (dbm - p0)) / (p1 - p0);
  }
  return at(TX_DBM.length - 1)[1];
}

export interface Budget {
  /** Average current per part, µA. */
  readonly tx: number;
  readonly rx: number;
  readonly wake: number;
  readonly sleep: number;
  readonly total: number;
  /** Days on a CR2032 (220 mAh, 80 % usable). */
  readonly days: number;
}

/** Average current of one advertising event every `intervalMs` (+5 ms advDelay on average). */
export function b2Budget(intervalMs: number, dbm: number, bytes: number): Budget {
  const air = ((16 + bytes) * 8) / 1000;
  const per = intervalMs + 5;
  const tx = ((3 * air * b2TxMa(dbm)) / per) * 1000;
  const rx = ((3 * 0.15 * 5) / per) * 1000;
  const wake = ((0.4 * 2) / per) * 1000;
  const sleep = 2;
  const total = tx + rx + wake + sleep;
  return { tx, rx, wake, sleep, total, days: (220 * 0.8 * 1000) / total / 24 };
}
