import { describe, expect, it } from "vitest";
import { b2Bytes, b2Fields, b2Pdu, b2Url, type BeaconSettings } from "./advertising";
import { b2Budget } from "./budget";
import { bleCrc24 } from "./crc24";
import { B8_MAPS, b8Char, b8Extract, b8ParseHid, buildReport } from "./hid";
import { hostChar, LAYOUTS } from "./keyboard-layout";
import { midiPacket, quantise } from "./midi";
import { b4Method } from "./pairing";
import { throughput } from "./throughput";

const beacon: BeaconSettings = {
  mode: "bench",
  presses: 0,
  temp: 41.42,
  uptime: 12,
  tx: 9,
  major: 1,
  minor: 2,
  url: "https://espressif.com",
  connectable: true,
  scanresp: true,
};

describe("B2 advertising payloads", () => {
  it("packs the bench beacon into 24 + 7 bytes, like the firmware announces", () => {
    const f = b2Fields(beacon);
    expect([b2Bytes(f.adv).length, b2Bytes(f.rsp).length]).toEqual([24, 7]);
    expect(b2Bytes(f.adv).slice(0, 3)).toEqual([0x02, 0x01, 0x06]);
    expect(b2Pdu({ connectable: false, scanresp: false })).toBe("ADV_NONCONN_IND");
  });

  it("compresses Eddystone URLs and refuses ones that don't fit", () => {
    expect(b2Url("https://github.com/")).toEqual([
      0x10,
      0xee,
      3,
      ..."github".split("").map((c) => c.charCodeAt(0)),
      0,
    ]);
    expect(b2Url("ftp://x.com")).toBeNull();
    expect(b2Url("https://a-very-long-domain-name.example")).toBeNull();
  });

  it("estimates a longer coin-cell life for a longer interval", () => {
    expect(b2Budget(1000, 0, 24).days).toBeGreaterThan(b2Budget(100, 0, 24).days * 5);
  });
});

describe("link layer", () => {
  it("starts the CRC-24 from 555555", () => {
    expect(bleCrc24([])).toEqual([0x55, 0x55, 0x55]);
    expect(bleCrc24([0x02])).not.toEqual(bleCrc24([0x03]));
  });

  it("computes notification throughput from MTU, interval and packets per event", () => {
    const t = throughput({ mtu: 247, interval: 30, cap: 6, phy: 1, dle: true });
    expect(t.perEvent).toBe(6);
    expect(t.kBps).toBeCloseTo(48.8, 1);
    expect(throughput({ mtu: 247, interval: 30, cap: 6, phy: 1, dle: false }).frags).toBe(10);
  });
});

describe("B4 pairing method", () => {
  it("follows the IO capability matrix", () => {
    expect(b4Method(4, 0, true, true)).toBe("PI"); // phone types, board shows
    expect(b4Method(4, 1, true, true)).toBe("N");
    expect(b4Method(4, 1, false, true)).toBe("PI"); // legacy has no numeric comparison
    expect(b4Method(4, 3, true, true)).toBe("J");
    expect(b4Method(4, 0, true, false)).toBe("J");
  });
});

describe("keyboards", () => {
  it("swaps y and z between the US and German layouts", () => {
    const y = LAYOUTS.char.us.y;
    expect(y && hostChar(y, "de")).toBe("z");
    expect(b8Char(0x1c, 0, true)).toBe("z");
    expect(b8Char(0x1e, 0x02, false)).toBe("!");
  });

  it("parses the Report Maps into the fields the board decodes", () => {
    expect([B8_MAPS.combo.bytes.length, b8ParseHid(B8_MAPS.combo.bytes).fields.length]).toEqual([
      72, 11,
    ]);
    expect([B8_MAPS.mouse.bytes.length, b8ParseHid(B8_MAPS.mouse.bytes).fields.length]).toEqual([
      66, 9,
    ]);
    const boot = b8ParseHid(B8_MAPS.boot.bytes);
    expect(boot.bits[0]).toBe(64);
  });

  it("packs and reads a 12-bit signed mouse delta, padding stays 0", () => {
    const mouse = b8ParseHid(B8_MAPS.mouse.bytes);
    const data = buildReport(mouse, 2, (f) => (f.page === 9 ? 1 : f.usage === 0x30 ? -5 : 0));
    const x = mouse.fields.find((f) => f.usage === 0x30);
    expect(x && b8Extract(data, x.bit, x.size, true)).toBe(-5);
    expect(data[0]).toBe(0x1f);
    const combo = b8ParseHid(B8_MAPS.combo.bytes);
    expect(buildReport(combo, 1, (f) => (f.page === 7 && !f.variable ? [0x0b] : 0))).toEqual([
      0, 0, 0x0b, 0, 0, 0, 0, 0,
    ]);
  });
});

describe("BLE-MIDI", () => {
  it("drops repeated status bytes with running status", () => {
    const notes = [
      { note: 60, ts: 10 },
      { note: 64, ts: 12 },
    ];
    expect(midiPacket(notes, true).filter((b) => b.b !== null)).toHaveLength(8);
    expect(midiPacket(notes, false).filter((b) => b.b !== null)).toHaveLength(9);
  });

  it("delays every note to the next connection event", () => {
    const { notes, sent } = quantise(62.5, 15);
    sent.forEach((s, i) => expect(s - (notes[i] ?? 0)).toBeLessThan(15));
  });
});
