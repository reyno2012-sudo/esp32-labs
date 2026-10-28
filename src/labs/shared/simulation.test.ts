import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";

describe("Simulation", () => {
  it("publishes a new state object on every notify, so memoized derivations recompute", () => {
    const sim = new Simulation({ view: 0, log: [] as string[] });
    const before = sim.getSnapshot();
    sim.update((st) => {
      st.view = 2;
    });
    const after = sim.getSnapshot();
    expect(after.state).not.toBe(before.state);
    expect(after.state.view).toBe(2);
    expect(before.state.view).toBe(0);
    expect(sim.state.view).toBe(2);
  });
});
