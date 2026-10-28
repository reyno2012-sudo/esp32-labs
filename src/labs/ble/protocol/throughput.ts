// Notification throughput over one BLE connection: MTU, interval, packets per event, PHY and
// data length extension (long packets). The same formula B5's Speed tab measures.

export interface LinkSettings {
  /** ATT MTU, bytes. */
  readonly mtu: number;
  /** Connection interval, ms. */
  readonly interval: number;
  /** Radio packets the central allows per connection event. */
  readonly cap: number;
  readonly phy: 1 | 2;
  /** Data length extension: 251-byte link-layer payloads instead of 27. */
  readonly dle: boolean;
}

export interface Throughput {
  /** Link-layer payload limit. */
  readonly ll: number;
  /** Radio packets per notification. */
  readonly frags: number;
  /** Air time of one notification with its acknowledgements, µs. */
  readonly notifUs: number;
  readonly perEvent: number;
  readonly kBps: number;
  readonly limit: "cap" | "time";
}

/** Air time of a packet with `n` payload bytes (preamble, address, header, CRC included), µs. */
export const airUs = (n: number, phy: 1 | 2): number => (phy === 2 ? (n + 11) * 4 : (n + 10) * 8);
/** Inter-frame space, µs. */
export const IFS_US = 150;

export function throughput(s: LinkSettings): Throughput {
  const ll = s.dle ? 251 : 27;
  // ATT payload + 4-byte L2CAP header, cut into radio packets.
  const frags = Math.ceil((s.mtu + 4) / ll);
  const last = s.mtu + 4 - (frags - 1) * ll;
  const ack = airUs(0, s.phy) + IFS_US;
  const notifUs =
    (frags - 1) * (airUs(ll, s.phy) + IFS_US + ack) + airUs(last, s.phy) + IFS_US + ack;
  // Leave the end of the interval free.
  const eventUs = s.interval * 1000 - 1250;
  const byTime = Math.max(0, Math.floor(eventUs / notifUs));
  const byCap = Math.floor(s.cap / frags);
  const perEvent = Math.min(byTime, byCap);
  // Bytes per ms = kB/s.
  const kBps = (perEvent * (s.mtu - 3)) / s.interval;
  return {
    ll,
    frags,
    notifUs,
    perEvent,
    kBps,
    /** What caps it: the central's packets per event, or air time (the event is full). */
    limit: byCap <= byTime ? "cap" : "time",
  };
}

export interface AirPacket {
  /** Start, µs from the first event. */
  readonly at: number;
  /** Width, µs. */
  readonly us: number;
  /** Start of its event, µs. */
  readonly event: number;
  /** Board → central (data) or central → board (empty acknowledgement). */
  readonly dir: "data" | "ack";
  /** When the data packet of this pair starts, µs: both light up together. */
  readonly litAt: number;
}

/** Every radio packet of the first `events` connection events, to scale. */
export function airTimeline(s: LinkSettings, model: Throughput, events = 3): AirPacket[] {
  const out: AirPacket[] = [];
  const ackUs = s.phy === 2 ? 44 : 80;
  for (let e = 0; e < events; e++) {
    const start = e * s.interval * 1000;
    let t = start;
    for (let n = 0; n < model.perEvent; n++)
      for (let f = 0; f < model.frags; f++) {
        const bytes = f < model.frags - 1 ? model.ll : s.mtu + 4 - (model.frags - 1) * model.ll;
        const us = airUs(bytes, s.phy);
        const litAt = t;
        out.push({ at: t, us, event: start, dir: "data", litAt });
        t += us + IFS_US;
        out.push({ at: t, us: ackUs, event: start, dir: "ack", litAt });
        t += ackUs + IFS_US;
      }
  }
  return out;
}
