// R8: one tap, and a new card getting a friend.
import type { FlowShapes } from "../seq/flow-text";
import { hxs, RF } from "../protocol/bytes";

const white = hxs(RF.card.uid).replace(/ /g, "");
const tag = hxs(RF.tag.uid).replace(/ /g, "");

export const friendsLive = (_frame: number, secs: string) =>
  `screen   Foxy bouncing on card 1 … ${secs} s of 6\nweb      status to every app once a second`;

export const FRIENDS_FLOWS: FlowShapes = {
  tap: {
    wait: [-1, -1],
    steps: [
      {
        f: 4,
        t: 3,
        msg: `UID ${white}`,
        ms: 3,
        net: true,
        code: `WUPA → ATQA 04 00 → ANTICOLL → ${hxs(RF.card.uid)} → SELECT → SAK 08`,
      },
      {
        f: 3,
        t: 3,
        ms: 1,
        code: 'card 1 · character "fox" · name "" (so: Foxy) · taps 4 → 5',
      },
      {
        f: 3,
        t: 3,
        ms: 6000,
        live: true,
        code: "",
      },
      {
        f: 3,
        t: 2,
        ms: 1,
        code: `{"type":"tap","data":{"seq":12,"uid":"${white}","character":"fox","number":1,"taps":5,"isNew":false}}`,
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
  newcard: {
    wait: [0, 4],
    steps: [
      {
        f: 4,
        t: 3,
        msg: `UID ${tag}`,
        ms: 3,
        net: true,
        code: "",
      },
      {
        f: 3,
        t: 3,
        ms: 2,
        code: `card 2 · ${tag} · character "" · taps 1 · saved`,
      },
      {
        f: 2,
        t: 0,
        msg: 'tap {isNew, character: ""}',
        ms: 30,
        net: true,
        code: "",
      },
      {
        f: 0,
        t: 1,
        msg: "PUT /api/card?uid=… {robot}",
        ms: 2,
        net: true,
        code: `PUT /api/card?uid=${tag}\n{"character":"robot"}`,
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
        ms: 10,
        code: '"robot" ✓ → card 2 · character "robot" · saved',
      },
      {
        f: 0,
        t: 2,
        msg: "POST /api/show",
        ms: 25,
        net: true,
        code: "",
      },
    ],
  },
};
