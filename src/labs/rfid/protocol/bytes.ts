// Byte helpers shared by every RFID lesson: the example cards, hex formatting and the two
// checksums ISO 14443-3 uses (BCC and CRC_A).

export type Uid = readonly number[];

/** Example UIDs used everywhere in the RFID lessons (your own card and tag print theirs in R2). */
export const RF = {
  card: { name: "white card", uid: [0x9c, 0x4f, 0x2a, 0x1b] as Uid },
  tag: { name: "key tag", uid: [0x9c, 0x4f, 0x6a, 0x0d] as Uid },
} as const;

/** One byte as two upper-case hex digits. */
export const hx = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");

/** Bytes as "9C 4F 2A 1B". */
export const hxs = (bytes: readonly number[]) => bytes.map(hx).join(" ");

/** UID check byte: the XOR of the four UID bytes. */
export const bccOf = (u: Uid) => (u[0] ?? 0) ^ (u[1] ?? 0) ^ (u[2] ?? 0) ^ (u[3] ?? 0);

/** ISO 14443-3 CRC_A, the same maths as kit/lib/rfid-kit/src/rfid_format.h. Low byte first. */
export function crcA(bytes: readonly number[]): [number, number] {
  let crc = 0x6363;
  for (const b of bytes) {
    let ch = (b ^ (crc & 0xff)) & 0xff;
    ch = (ch ^ (ch << 4)) & 0xff;
    crc = ((crc >> 8) ^ (ch << 8) ^ (ch << 3) ^ (ch >> 4)) & 0xffff;
  }
  return [crc & 0xff, crc >> 8];
}

export const withCrc = (bytes: readonly number[]) => [...bytes, ...crcA(bytes)];

/** Printable ASCII, dots for the rest (as in the firmware's dump). */
export const asciiOf = (bytes: readonly number[]) =>
  bytes.map((x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : ".")).join("");

/** Parses "9C 4F 2A 1B" (any separators) into exactly `count` bytes, or null. */
export function parseHexBytes(text: string, count: number): number[] | null {
  const pairs = text.replace(/[^0-9a-f]/gi, "").match(/../g);
  return pairs && pairs.length === count ? pairs.map((x) => parseInt(x, 16)) : null;
}
