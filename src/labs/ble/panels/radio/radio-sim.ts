// B1 "Three channels, many shouts": three devices advertise on 37, 38, 39; a scanner listens on
// one channel per 100 ms for part of it. Time is in simulated ms.

export const ADV_CHANNELS = [37, 38, 39] as const;
export type AdvChannel = (typeof ADV_CHANNELS)[number];
export const SCAN_EVERY = 100;

/** Centre frequency of a BLE channel, MHz. */
export const channelMHz = (ch: number): number =>
  ch === 37 ? 2402 : ch === 38 ? 2426 : ch === 39 ? 2480 : ch <= 10 ? 2404 + ch * 2 : 2406 + ch * 2;

export interface Advertiser {
  readonly name: "phone" | "speaker" | "keyboard";
  readonly every: number;
  next: number;
  /** Row on the timeline. */
  readonly y: number;
}

export interface AirPacket {
  readonly d: Advertiser;
  readonly ch: AdvChannel;
  readonly at: number;
  /** Heard: it landed in a listening window on its own channel. */
  readonly ok: boolean;
}

/** The scanner listens on 37, then 38, then 39, one interval each, for `windowPct` % of it. */
export function listening(t: number, windowPct: number): { ch: AdvChannel; on: boolean } {
  const k = Math.floor(t / SCAN_EVERY);
  return { ch: ADV_CHANNELS[k % 3] ?? 37, on: t - k * SCAN_EVERY < (SCAN_EVERY * windowPct) / 100 };
}

export class RadioSim {
  simMs = 0;
  packets: AirPacket[] = [];
  heard = 0;
  missed = 0;
  readonly devices: Advertiser[] = [
    { name: "phone", every: 180, next: 5, y: 238 },
    { name: "speaker", every: 100, next: 40, y: 262 },
    { name: "keyboard", every: 320, next: 70, y: 286 },
  ];

  step(dt: number, windowPct: number, random = Math.random): void {
    this.simMs += dt;
    for (const d of this.devices) {
      while (d.next <= this.simMs) {
        // One event: the same packet on 37, 38, 39 in a row, then a random 0-10 ms delay.
        let caught = false;
        ADV_CHANNELS.forEach((ch, i) => {
          const at = d.next + i * 2.5;
          const l = listening(at, windowPct);
          const ok = l.on && l.ch === ch;
          this.packets.push({ d, ch, at, ok });
          caught = caught || ok;
        });
        if (caught) this.heard++;
        else this.missed++;
        d.next += d.every + random() * 10;
      }
    }
    this.packets = this.packets.filter((p) => p.at > this.simMs - 620);
  }

  resetCounts(): void {
    this.heard = 0;
    this.missed = 0;
  }
}
