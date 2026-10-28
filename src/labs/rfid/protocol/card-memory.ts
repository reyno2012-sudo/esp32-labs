// A MIFARE Classic 1K's memory: 16 sectors × 4 blocks × 16 bytes, as the lab's example card holds it.
import { bccOf, RF, type Uid } from "./bytes";

export type Block = number[];
export type BlockKind = "maker" | "empty" | "data" | "value" | "trailer";

/** The factory trailer: key A (reads as 00), access bits FF 07 80, user byte 69, key B. */
const TRAILER = [0, 0, 0, 0, 0, 0, 0xff, 0x07, 0x80, 0x69, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

/** Block 0: UID, BCC, SAK, ATQA and the maker's bytes. */
export const makerBlock = (u: Uid): Block => [
  ...u,
  bccOf(u),
  0x08,
  0x04,
  0x00,
  0x62,
  0x63,
  0x64,
  0x65,
  0x66,
  0x67,
  0x68,
  0x69,
];

const le32 = (x: number) => [x & 0xff, (x >>> 8) & 0xff, (x >>> 16) & 0xff, (x >>> 24) & 0xff];

/** A value block: value, inverted value, value (little-endian), then address, ~address twice. */
export function valueBlock(v: number, addr: number): Block {
  return [
    ...le32(v >>> 0),
    ...le32(~v >>> 0),
    ...le32(v >>> 0),
    addr,
    ~addr & 0xff,
    addr,
    ~addr & 0xff,
  ];
}

/** The signed 32-bit value of a value block's first four bytes. */
export const valueOf = (b: readonly number[]) =>
  (b[0] ?? 0) | ((b[1] ?? 0) << 8) | ((b[2] ?? 0) << 16) | ((b[3] ?? 0) << 24);

/** The example white card, fresh from the factory or after the R5 writes. */
export function exampleCard(after: boolean, uid: Uid = RF.card.uid): Block[] {
  const blocks: Block[] = Array.from({ length: 64 }, () => new Array<number>(16).fill(0));
  blocks[0] = makerBlock(uid);
  for (let s = 0; s < 16; s++) blocks[s * 4 + 3] = [...TRAILER];
  if (after) {
    blocks[4] = [..."hello bench"].map((c) => c.charCodeAt(0)).concat(new Array<number>(5).fill(0));
    blocks[8] = valueBlock(47, 8);
    blocks[9] = valueBlock(50, 9);
  }
  return blocks;
}

/** What a block holds, judged by its address and its bytes (as the firmware's dump does). */
export function blockKind(b: readonly number[], i: number): BlockKind {
  if (i % 4 === 3) return "trailer";
  if (i === 0) return "maker";
  const at = (k: number) => b[k] ?? 0;
  let copiesAgree = true;
  for (let k = 0; k < 4; k++)
    if (at(k) !== at(k + 8) || at(k) !== (~at(k + 4) & 0xff)) copiesAgree = false;
  const isValue =
    copiesAgree && at(12) === at(14) && at(13) === at(15) && (~at(12) & 0xff) === at(13);
  if (isValue && b.some((x) => x)) return "value";
  return b.every((x) => x === 0) ? "empty" : "data";
}

/** Colour token per block kind (the 3D cabinets and their legend). */
export const KIND_TOKEN = {
  maker: "--warn",
  empty: "--line",
  data: "--ok",
  value: "--w-sda",
  trailer: "--danger",
} as const satisfies Record<BlockKind, `--${string}`>;

export type ByteRole = "ka" | "ab" | "ud" | "kb" | "uid" | "val" | "txt" | "";

/** What byte k of a block is, for colouring it (trailer: key A · access bits · user byte · key B). */
export function byteRole(b: readonly number[], k: number, kind: BlockKind): ByteRole {
  if (kind === "trailer") return k < 6 ? "ka" : k < 9 ? "ab" : k === 9 ? "ud" : "kb";
  if (kind === "maker") return k < 5 ? "uid" : "";
  if (kind === "value") return "val";
  if (kind === "data" && b[k]) return "txt";
  return "";
}
