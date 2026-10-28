import { describe, expect, it } from "vitest";
import type { Tone } from "@/ui/terminal/terminal-log";
import { initialLabState, RfidLab } from "./rfid-lab";

/** A lab on a fake clock that jumps ahead with every timer, and a monitor that is an array. */
function lab(id: "R1" | "R5" | "R6" = "R5") {
  const lines: [string, Tone][] = [];
  let clock = 0;
  const l = new RfidLab(id, initialLabState(1), {
    print: (text, tone = "plain") => lines.push([text, tone]),
    now: () => clock,
    after: (ms, fn) => {
      clock += ms;
      fn();
    },
    changed: () => {},
  });
  return { l, lines, last: () => lines.at(-1)?.[0] ?? "" };
}

describe("rfid-lab firmware", () => {
  it("counts credits on the card, with a backup of the previous value", () => {
    const { l, last } = lab();
    l.run("credits init 50");
    expect(last()).toContain("no card");
    l.setField("card");
    l.run("credits init 50");
    l.run("credits use 3");
    expect(l.state.credits).toEqual({ v: 47, b: 50 });
    l.run("credits use 100");
    expect(last()).toContain("only 47 credits");
    expect(l.state.view).toBe(4);
  });

  it("never writes a trailer, and only knows its own lab's commands", () => {
    const { l, last } = lab();
    l.setField("card");
    l.run("write 7 oops");
    expect(last()).toContain("not writable");
    l.run("write 4 hello bench");
    expect(l.state.note).toBe('block 4: "hello bench"');
    l.run("edge spi");
    expect(last()).toContain("unknown command 'edge spi' in rfid-lab-r5");
  });

  it("picks the tag when both lie on the reader, and the push button walks this lab's views", () => {
    const { l } = lab("R1");
    l.setField("both");
    expect(l.selected()).toBe("tag");
    expect(l.state.coll).toBe(23);
    l.nextView();
    expect(l.state.view).toBe(0);
    expect(l.screen().hint).toBe("double-click: selftest");
  });

  it("runs the next edge experiment on a double-click", () => {
    const { l } = lab("R6");
    l.setView(5);
    l.doubleClick();
    expect(l.state.edge?.key).toBe("spi");
    expect(l.state.nextEdge).toBe(1);
    expect(l.state.busy).toBeNull();
  });
});
