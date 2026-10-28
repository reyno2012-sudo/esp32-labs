// R7: a tap, a block, a copy and a new card, across the app, the dev server and the board.
import type { FlowShapes } from "../seq/flow-text";
import { hxs, RF } from "../protocol/bytes";

const u = hxs(RF.card.uid).replace(/ /g, "");
const tagUid = hxs(RF.tag.uid).replace(/ /g, "");

export const doorLive = (_frame: number, secs: string) =>
  `reader task  waiting for a card … ${secs} s of 20\nweb server   still answering the app (status every second)`;

export const DOOR_FLOWS: FlowShapes = {
  tap: {
    wait: [-1, -1],
    steps: [
      {
        f: 4,
        t: 3,
        msg: `UID ${u}`,
        ms: 3,
        net: true,
        code: `WUPA → ATQA 04 00 → ANTICOLL → ${hxs(RF.card.uid)} → SELECT → SAK 08`,
      },
      {
        f: 3,
        t: 3,
        ms: 1,
        code: "White card · resident · not blocked · any time → granted\ntaps 12 → 13, lastSeen = now, list saved to NVS",
      },
      {
        f: 3,
        t: 3,
        msg: "OPEN 5 s",
        ms: 5,
        code: "",
      },
      {
        f: 3,
        t: 2,
        ms: 1,
        code: '{"type":"event","data":{"seq":42,"name":"White card","what":"tap","decision":"granted"}}',
      },
      {
        f: 2,
        t: 0,
        ms: 30,
        net: true,
        code: "",
      },
    ],
  },
  block: {
    wait: [0, 3],
    steps: [
      {
        f: 0,
        t: 1,
        msg: "PUT /api/card?uid=… {blocked}",
        ms: 2,
        net: true,
        code: `PUT /api/card?uid=${u}\n{"blocked": true}`,
      },
      {
        f: 1,
        t: 2,
        msg: "+ Authorization",
        ms: 20,
        net: true,
        code: "Authorization: Bearer 3f…(32 hex)",
      },
      {
        f: 2,
        t: 2,
        ms: 15,
        code: "token ✓  blocked: bool ✓\nWhite card: blocked = true · saved (1.2 KB)",
      },
      {
        f: 2,
        t: 0,
        ms: 20,
        net: true,
        code: '{"ok":true,"card":{"name":"White card","blocked":true,"now":"blocked",…}}',
      },
      {
        f: 4,
        t: 3,
        ms: 3,
        net: true,
        code: "",
      },
      {
        f: 3,
        t: 3,
        ms: 1,
        code: "",
      },
    ],
  },
  copy: {
    wait: [0, 5],
    steps: [
      {
        f: 0,
        t: 2,
        msg: "POST /api/copy",
        ms: 25,
        net: true,
        code: 'POST /api/copy  →  202 {"job":9}',
      },
      {
        f: 3,
        t: 4,
        msg: "AUTH sector 1 · READ 4 5 6",
        ms: 12,
        net: true,
        code: "AUTH A 4 (FF FF FF FF FF FF) ✓  READ 4 → “White card”  READ 5 → “R7 resident”  READ 6 → zeros\nAUTH A 8 ✓  READ 8 → value 10  READ 9 → value 10  READ 10 → zeros",
      },
      {
        f: 3,
        t: 3,
        ms: 2000,
        live: true,
        code: "",
      },
      {
        f: 4,
        t: 3,
        msg: `UID ${tagUid}`,
        ms: 3,
        net: true,
        code: "",
      },
      {
        f: 3,
        t: 4,
        ms: 40,
        net: true,
        code: "WRITE 4 ✓ ✓  READ 4 = ✓   …   WRITE 10 ✓ ✓  READ 10 = ✓\nblock 0 (UID 9C 4F 6A 0D): not touched",
      },
      {
        f: 3,
        t: 0,
        ms: 30,
        net: true,
        code: '{"type":"job","data":{"id":9,"ok":true,"message":"6 of 6 blocks copied from White card onto 9C4F6A0D"}}',
      },
    ],
  },
  enroll: {
    wait: [2, 4],
    steps: [
      {
        f: 0,
        t: 2,
        msg: "POST /api/enroll",
        ms: 25,
        net: true,
        code: '{"name":"Key tag","role":"guest"}  →  202 {"job":7}',
      },
      {
        f: 2,
        t: 3,
        ms: 1,
        code: "",
      },
      {
        f: 3,
        t: 3,
        ms: 2000,
        live: true,
        code: "",
      },
      {
        f: 4,
        t: 3,
        msg: `UID ${tagUid}`,
        ms: 3,
        net: true,
        code: "",
      },
      {
        f: 3,
        t: 0,
        ms: 30,
        net: true,
        code: '{"type":"job","data":{"id":7,"ok":true,"message":"card added"}}',
      },
    ],
  },
};
