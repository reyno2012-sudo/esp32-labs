import { describe, expect, it } from "vitest";
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { b2Screen } from "./b2";
import { b4Screen } from "./b4";

const terminal = () => {
  const lines: string[] = [];
  const term: TerminalPrinter = {
    line: (t) => void lines.push(t),
    clear: () => void (lines.length = 0),
  };
  return { lines, term };
};

describe("B4 pairing ceremony", () => {
  it("shows a passkey, then secures and bonds", () => {
    const { lines, term } = terminal();
    const st = b4Screen.init();
    const [connect, readVault, typePasskey] = b4Screen.actions ?? [];
    connect?.run(st, term);
    readVault?.run(st, term);
    expect(st.passkey).toBe(482915);
    typePasskey?.run(st, term);
    expect(st).toMatchObject({
      passkey: 0,
      encrypted: true,
      bonded: true,
      bonds: ["C7:3B:51:9E:2A:4C"],
    });
    expect(lines).toContain("  < read Vault");
  });

  it("encrypts with Just Works but still refuses the Vault", () => {
    const { lines, term } = terminal();
    const st = b4Screen.init();
    b4Screen.onCommand?.("pair justworks", st, term);
    b4Screen.actions?.[0]?.run(st, term);
    b4Screen.actions?.[1]?.run(st, term);
    expect(st.encrypted).toBe(true);
    expect(lines.at(-1)).toBe("  x Vault refused: pair first");
  });
});

describe("B2 beacon shell", () => {
  it("refuses a fast interval when not connectable", () => {
    const { lines, term } = terminal();
    const st = b2Screen.init();
    b2Screen.onCommand?.("connectable off", st, term);
    expect(st.interval).toBe(100);
    b2Screen.onCommand?.("interval 20", st, term);
    expect(st.interval).toBe(100);
    expect(lines.at(-1)).toContain("100 ms is the floor");
    expect(b2Screen.onCommand?.("dance", st, term)).toBe(false);
  });
});
