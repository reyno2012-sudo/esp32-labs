import { describe, expect, it } from "vitest";
import { decodeAccess, encodeAccess } from "./access-bits";
import { walkModel, walkSteps } from "./anticollision";
import { bccOf, crcA, hxs, parseHexBytes, RF } from "./bytes";
import { blockKind, exampleCard, valueBlock, valueOf } from "./card-memory";
import { rangeAt } from "./field";
import { spiFrame, REGS } from "./spi";

describe("RFID protocol maths", () => {
  it("computes CRC_A and BCC like ISO 14443-3", () => {
    expect(hxs(crcA([0x50, 0x00]))).toBe("57 CD"); // HLTA
    expect(hxs(crcA([0x08]))).toBe("B6 DD"); // SAK
    expect(bccOf(RF.card.uid)).toBe(0x9c ^ 0x4f ^ 0x2a ^ 0x1b);
    expect(parseHexBytes("9c:4f 2a-1b", 4)).toEqual([0x9c, 0x4f, 0x2a, 0x1b]);
    expect(parseHexBytes("9C 4F", 4)).toBeNull();
  });

  it("builds and recognises value blocks", () => {
    const b = valueBlock(-5, 8);
    expect(valueOf(b)).toBe(-5);
    expect(blockKind(b, 8)).toBe("value");
    expect(blockKind([...b.slice(0, 4), 0, 0, 0, 0, ...b.slice(8)], 8)).toBe("data");
    const card = exampleCard(true);
    expect([0, 3, 4, 5, 8].map((i) => blockKind(card[i] ?? [], i))).toEqual([
      "maker",
      "trailer",
      "data",
      "empty",
      "value",
    ]);
  });

  it("encodes the transport access bits as FF 07 80 and refuses broken copies", () => {
    expect(hxs(encodeAccess([0, 0, 0, 1]))).toBe("FF 07 80");
    expect(decodeAccess([0xff, 0x07, 0x80])).toEqual([0, 0, 0, 1]);
    const cond = [0, 6, 6, 3] as const;
    const [b6, b7, b8] = encodeAccess(cond);
    expect(decodeAccess([b6, b7, b8])).toEqual(cond);
    expect(decodeAccess([0xff, 0x07, 0x81])).toBeNull();
  });

  it("finds the example card and tag colliding at bit 23, the tag winning", () => {
    const m = walkModel(RF.card.uid, RF.tag.uid);
    expect(m.p).toBe(23);
    expect(m.winner).toBe("B");
    expect(walkSteps(m)).toHaveLength(7);
    expect(walkSteps(walkModel(RF.card.uid, RF.card.uid))).toHaveLength(1);
  });

  it("puts the register address on MOSI and the answer on MISO", () => {
    const version = REGS[0];
    if (!version) throw new Error("no registers");
    const f = spiFrame(version, true, "none");
    expect(f.addr).toBe(0xee);
    expect(f.answer).toBe(0x92);
    expect(spiFrame(version, true, "power").answer).toBe(0x00);
    expect(spiFrame(version, false, "miso").addr).toBe(0x6e);
  });

  it("gives the reader a range of about 36 mm at the default gain", () => {
    expect(Math.round(rangeAt(33))).toBe(36);
    expect(rangeAt(48)).toBeGreaterThan(rangeAt(18));
  });
});
