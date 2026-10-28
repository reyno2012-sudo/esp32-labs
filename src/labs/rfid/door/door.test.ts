import { describe, expect, it } from "vitest";
import { EDGE, cleanMonitor } from "../edge/edge-data";
import { type DoorCard, doorDecide, ruleTrail } from "./door-rules";

const resident: DoorCard = {
  listed: true,
  role: "resident",
  blocked: false,
  until: "none",
  from: 0,
  to: 0,
  uses: -1,
};
const clock = { lockdown: false, synced: true, hour: 12 };

describe("R7 door rules", () => {
  it("lets the first rule that says no decide", () => {
    expect(doorDecide(resident, clock)).toBeNull();
    const blocked = { ...resident, blocked: true, uses: 0 };
    expect(doorDecide(blocked, clock)?.says).toBe("blocked");
    expect(ruleTrail(blocked, clock).map((s) => s.state)).toEqual([
      "pass",
      "stop",
      "skip",
      "skip",
      "skip",
      "skip",
      "skip",
      "skip",
    ]);
  });

  it("keeps lockdown for everyone but maintenance and admins, and handles overnight hours", () => {
    expect(doorDecide(resident, { ...clock, lockdown: true })?.says).toBe("lockdown");
    expect(
      doorDecide({ ...resident, role: "maintenance" }, { ...clock, lockdown: true }),
    ).toBeNull();
    const nights = { ...resident, from: 22, to: 6 };
    expect(doorDecide(nights, { ...clock, hour: 23 })).toBeNull();
    expect(doorDecide(nights, clock)?.says).toBe("outside hours");
    expect(doorDecide(nights, { ...clock, synced: false })?.says).toBe("no clock yet");
  });
});

describe("R6 edge tables", () => {
  it("reads a pasted SPI sweep, time stamps and all", () => {
    const spi = EDGE.find((e) => e.key === "spi");
    const pasted =
      "14:02:07.123 >   MHz   bytes wrong\n14:02:07.124 >     4     0.0 %        0 / 20\n14:02:07.125 >    26    22.0 %        4 / 20";
    expect(spi?.parse(cleanMonitor(pasted))).toEqual([
      ["4", 0],
      ["26", 22],
    ]);
  });
});
