import { bleCrc24 } from "../../protocol/crc24";
import type { BleT } from "../../i18n";
import { ascii, hx, hxs, int8 } from "../../protocol/hex";

type Ad = readonly [type: number, data: readonly number[]];

/** A sample device; its label lives in the catalogue (anatomy.samples.<key>). */
interface Sample {
  /** PDU type: 0 ADV_IND, 2 ADV_NONCONN_IND, 6 ADV_SCAN_IND. */
  readonly pdu: number;
  /** 1 = random address. */
  readonly txAdd: number;
  readonly addr: readonly number[];
  readonly ad: readonly Ad[];
}

export const SAMPLES = {
  phone: {
    pdu: 0x0,
    txAdd: 1,
    addr: [0x5a, 0x3c, 0x91, 0x2e, 0x7b, 0x44],
    ad: [
      [0x01, [0x1a]],
      [0xff, [0x4c, 0x00, 0x10, 0x05, 0x01, 0x18, 0x7a, 0x9e, 0x3f]],
      [0x0a, [0x0c]],
    ],
  },
  jbl: {
    pdu: 0x0,
    txAdd: 0,
    addr: [0x2c, 0x4f, 0xc2, 0x10, 0x8a, 0x61],
    ad: [
      [0x01, [0x06]],
      [0xff, [0x57, 0x00, 0x1d, 0x22, 0x01, 0x05, 0x64, 0x00, 0x00, 0x18, 0x03, 0x02, 0x00, 0x01]],
      [0x09, ascii("JBL Flip 6")],
    ],
  },
  keyboard: {
    pdu: 0x0,
    txAdd: 1,
    addr: [0xd4, 0x12, 0x8b, 0x77, 0x01, 0xe9],
    ad: [
      [0x01, [0x05]],
      [0x19, [0xc1, 0x03]],
      [0x03, [0x12, 0x18]],
      [0x09, ascii("MX Keys")],
    ],
  },
  bench: {
    pdu: 0x2,
    txAdd: 0,
    addr: [0x7c, 0xdf, 0xa1, 0x0b, 0x5e, 0x3c],
    ad: [
      [0x01, [0x06]],
      [0x09, ascii("Bench B2")],
      [0xff, [0xff, 0xff, 0x01, 0x07, 0x00, 0x5e, 0x10, 0x2c, 0x01]],
    ],
  },
} as const satisfies Record<string, Sample>;

export type SampleKey = keyof typeof SAMPLES;
export const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];

const b = (d: readonly number[], i: number) => d[i] ?? 0;
const pair = (d: readonly number[]) => hxs([b(d, 1), b(d, 0)]).replace(" ", "");

// Each AD type's explanation; composes sentences, so it takes the translator.
const AD_WHAT: Readonly<Record<number, (d: readonly number[], t: BleT) => string>> = {
  0x01: (d, t) => {
    const flags = b(d, 0);
    const mode = flags & 2 ? "general" : flags & 1 ? "limited" : "none";
    return t(flags & 4 ? "anatomy.ad.flagsLeOnly" : "anatomy.ad.flagsClassic", {
      value: hx(flags),
      mode: t(`anatomy.ad.discoverable.${mode}`),
    });
  },
  0x09: (d, t) => t("anatomy.ad.name", { name: String.fromCharCode(...d) }),
  0x0a: (d, t) => t("anatomy.ad.tx", { dbm: int8(b(d, 0)) }),
  0x19: (d, t) => t("anatomy.ad.appearance", { value: pair(d), bytes: hxs(d) }),
  0x03: (d, t) => t("anatomy.ad.services", { value: pair(d) }),
  0xff: (d, t) => {
    const id = b(d, 0) | (b(d, 1) << 8);
    if (id === 0x004c)
      return t("anatomy.ad.apple", {
        bytes: hxs(d.slice(0, 2)),
        type: hx(b(d, 2)),
        count: b(d, 3),
      });
    if (id === 0x0057) return t("anatomy.ad.jbl");
    if (id === 0xffff)
      return t("anatomy.ad.bench", {
        presses: b(d, 3) | (b(d, 4) << 8),
        celsius: (b(d, 5) | (b(d, 6) << 8)) / 100,
        uptime: b(d, 7) | (b(d, 8) << 8),
      });
    return t("anatomy.ad.maker");
  },
};

type PduType = 0 | 2 | 6;
const isPdu = (n: number): n is PduType => n === 0 || n === 2 || n === 6;
const AD_COLOURS = ["var(--ok)", "var(--warn)", "var(--copper)", "var(--w-sda)"] as const;

export interface PacketField {
  /** Stable id (React key). */
  readonly id: string;
  readonly name: string;
  readonly bytes: readonly number[];
  /** A CSS colour (a token reference). */
  readonly col: string;
  readonly what: string;
}

/** One advertising packet as sent on air, field by field, with what each field means. */
export function anatomy(key: SampleKey, t: BleT): { fields: PacketField[]; used: number } {
  const s: Sample = SAMPLES[key];
  const adData = s.ad.flatMap(([type, d]) => [d.length + 1, type, ...d]);
  const header = [s.pdu | (s.txAdd << 6), 6 + adData.length];
  const addrLE = [...s.addr].reverse();
  const pduBytes = [...header, ...addrLE, ...adData];
  const top = s.addr[0] ?? 0;
  const address = s.txAdd
    ? top >> 6 === 1
      ? t("anatomy.field.addressResolvable")
      : t("anatomy.field.addressRandom")
    : t("anatomy.field.addressPublic");
  const fields: PacketField[] = [
    {
      id: "preamble",
      name: t("anatomy.field.preamble"),
      bytes: [0xaa],
      col: "var(--muted)",
      what: t("anatomy.field.preambleWhat"),
    },
    {
      id: "access",
      name: t("anatomy.field.access"),
      bytes: [0xd6, 0xbe, 0x89, 0x8e],
      col: "var(--muted)",
      what: t("anatomy.field.accessWhat"),
    },
    {
      id: "header",
      name: t("anatomy.field.header"),
      bytes: header,
      col: "var(--w-cs)",
      what: t("anatomy.field.headerWhat", {
        pdu: s.pdu,
        pduName: isPdu(s.pdu) ? t(`anatomy.pdu.${s.pdu}`) : "",
        txAdd: s.txAdd,
        kind: s.txAdd ? t("anatomy.field.random") : t("anatomy.field.public"),
        length: header[1],
        data: adData.length,
      }),
    },
    {
      id: "adva",
      name: "AdvA",
      bytes: addrLE,
      col: "var(--ble)",
      what: t("anatomy.field.advaWhat", { address: s.addr.map(hx).join(":"), kind: address }),
    },
    ...s.ad.map(([type, d], i) => ({
      id: `ad${i}`,
      name: t("anatomy.field.ad", { n: i + 1 }),
      bytes: [d.length + 1, type, ...d],
      col: AD_COLOURS[i % 4] ?? "var(--ok)",
      what: t("anatomy.field.adWhat", {
        length: hx(d.length + 1),
        type: hx(type),
        meaning: AD_WHAT[type]?.(d, t) ?? "",
      }),
    })),
    {
      id: "crc",
      name: "CRC",
      bytes: bleCrc24(pduBytes),
      col: "var(--muted)",
      what: t("anatomy.field.crcWhat"),
    },
  ];
  return { fields, used: adData.length };
}
