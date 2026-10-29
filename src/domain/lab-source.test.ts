import { describe, expect, it } from "vitest";
import { labDirOfCommand, labSourceUrl } from "./lab-source";

const BASE = "https://github.com/reyno2012-sudo/esp32-labs/tree/main/labs/";

describe("labSourceUrl", () => {
  it("points at the folder the command builds", () => {
    expect(labSourceUrl(BASE, "uv run pio run -d labs/02-led -e 02-led -t upload -t monitor")).toBe(
      `${BASE}02-led`,
    );
  });

  it("uses the folder, not the environment (a variant builds another env of the same lab)", () => {
    expect(
      labDirOfCommand("uv run pio run -d labs/03b-showcase -e 03b-showcase-button -t upload"),
    ).toBe("03b-showcase");
  });

  it("gives nothing for a lesson that sets up tools and builds no lab", () => {
    expect(labSourceUrl(BASE, "cd esp-labs && uv sync && uv run pio device list")).toBeUndefined();
    expect(labSourceUrl(BASE, "")).toBeUndefined();
  });
});
