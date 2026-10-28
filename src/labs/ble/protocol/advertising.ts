// A TypeScript copy of labs/ble-lab-b2/src/beacon_payload.h: the B2 beacon's AD structures, used by
// the builder panel, the timing panel and the B2 preview.
import { ascii, le16 } from "./hex";

export const B2_NAME = ascii("Bench B2");
export const B2_UUID = [
  0xba, 0x5e, 0x00, 0x00, 0xb1, 0xe5, 0x4a, 0xb1, 0x9e, 0x5c, 0xbe, 0x7c, 0xbe, 0x7c, 0xb0, 0xa7,
] as const;

const SCHEMES = ["http://www.", "https://www.", "http://", "https://"] as const;
const ENDINGS = [
  ".com/",
  ".org/",
  ".edu/",
  ".net/",
  ".info/",
  ".biz/",
  ".gov/",
  ".com",
  ".org",
  ".edu",
  ".net",
  ".info",
  ".biz",
  ".gov",
] as const;

/**
 * Eddystone-URL frame: 10, power at 0 m, scheme byte, then the URL with .com/ and friends
 * compressed to one byte. null when the URL has no known scheme or the frame passes 20 bytes.
 */
export function b2Url(url: string, power0m = -18): number[] | null {
  const sc = SCHEMES.findIndex((s) => url.startsWith(s));
  const scheme = SCHEMES[sc];
  if (scheme === undefined) return null;
  const out = [0x10, power0m & 255, sc];
  let s = url.slice(scheme.length);
  while (s.length) {
    const e = ENDINGS.findIndex((x) => s.startsWith(x));
    const ending = ENDINGS[e];
    if (ending !== undefined) {
      out.push(e);
      s = s.slice(ending.length);
    } else {
      out.push(s.charCodeAt(0));
      s = s.slice(1);
    }
  }
  return out.length <= 20 ? out : null;
}

export type B2Mode = "bench" | "ibeacon" | "url" | "name";
export const B2_MODES: readonly B2Mode[] = ["bench", "ibeacon", "url", "name"];

/** What the beacon puts on air. */
export interface BeaconSettings {
  mode: B2Mode;
  presses: number;
  temp: number;
  uptime: number;
  tx: number;
  major: number;
  minor: number;
  url: string;
  connectable: boolean;
  scanresp: boolean;
}

/** An AD structure as [type, name, data]. */
export type AdField = readonly [type: number, name: string, data: readonly number[]];

/** The advertisement and scan response fields, in the order the firmware adds them. */
export function b2Fields(st: BeaconSettings): { adv: AdField[]; rsp: AdField[] } {
  const adv: AdField[] = [[0x01, "Flags", [0x06]]];
  const rsp: AdField[] = [];
  if (st.mode === "bench") {
    adv.push(
      [0x09, "Name", B2_NAME],
      [
        0xff,
        "Maker FFFF",
        [
          0xff,
          0xff,
          0x01,
          ...le16(st.presses),
          ...le16(Math.round(st.temp * 100) & 0xffff),
          ...le16(st.uptime & 0xffff),
        ],
      ],
    );
    rsp.push([0x0a, "TX power", [st.tx & 255]], [0x19, "Appearance", [0x40, 0x05]]);
  } else if (st.mode === "ibeacon") {
    adv.push([
      0xff,
      "iBeacon",
      [0x4c, 0x00, 0x02, 0x15, ...B2_UUID, 0x00, st.major, 0x00, st.minor, -59 & 255],
    ]);
    rsp.push([0x09, "Name", B2_NAME]);
  } else if (st.mode === "url") {
    adv.push(
      [0x03, "Services", [0xaa, 0xfe]],
      [0x16, "Eddystone", [0xaa, 0xfe, ...(b2Url(st.url) ?? [])]],
    );
    rsp.push([0x09, "Name", B2_NAME]);
  } else {
    adv.push([0x09, "Name", B2_NAME], [0x0a, "TX power", [st.tx & 255]]);
  }
  return { adv, rsp: st.scanresp ? rsp : [] };
}

/** The bytes on air: length, type, data for every field. */
export const b2Bytes = (fields: readonly AdField[]): number[] =>
  fields.flatMap(([type, , d]) => [d.length + 1, type, ...d]);

export const b2Pdu = (st: Pick<BeaconSettings, "connectable" | "scanresp">): string =>
  st.connectable ? "ADV_IND" : st.scanresp ? "ADV_SCAN_IND" : "ADV_NONCONN_IND";
