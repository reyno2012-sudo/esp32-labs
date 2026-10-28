import { describe, expect, it } from "vitest";
import { finishScan, initScanner, joinFirst, setView, stepScanner } from "./scanner-model";

const half = () => 0.5;

describe("wifi-lab-w1 scanner", () => {
  it("prints the scan table strongest first once the start-up scan ends", () => {
    const st = initScanner(0);
    expect(stepScanner(st, 1000, half)).toEqual([]);
    const lines = stepScanner(st, 2400, half);
    expect(st.scanning).toBe(false);
    expect(lines[0]?.[0]).toContain("scan 1 done: 9 networks");
    expect(st.nets.map((n) => n.rssi)).toEqual(
      [...st.nets.map((n) => n.rssi)].sort((a, b) => b - a),
    );
  });

  it("auto-scans 10 s after the last scan, unless switched off", () => {
    const st = initScanner(0);
    finishScan(st, 3000, half);
    expect(stepScanner(st, 12_999, half)).toEqual([]);
    expect(stepScanner(st, 13_000, half)[0]?.[0]).toContain("scan started (auto)");
    const off = initScanner(0);
    finishScan(off, 3000, half);
    off.auto = false;
    expect(stepScanner(off, 20_000, half)).toEqual([]);
  });

  it("needs a scan before joining, then joins and goes up after 2.5 s", () => {
    const st = initScanner(0);
    expect(joinFirst(st, 0)[0]?.[1]).toBe("warn");
    finishScan(st, 2400, half);
    joinFirst(st, 3000);
    expect(st.link).toBe("joining");
    expect(st.view).toBe(3);
    stepScanner(st, 5501, half);
    expect(st.link).toBe("up");
    stepScanner(st, 7000, half);
    expect(st.rssiHist).toHaveLength(2);
  });

  it("wraps views both ways", () => {
    const st = initScanner(0);
    setView(st, 4, 0);
    expect(st.view).toBe(0);
    setView(st, -1, 0);
    expect(st.view).toBe(3);
  });
});
