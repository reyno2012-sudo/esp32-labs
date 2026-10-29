import { describe, expect, it } from "vitest";
import { hashRouteUrl } from "./insights-url";

describe("hashRouteUrl", () => {
  it("promotes the hash route to the path", () => {
    expect(hashRouteUrl("https://reyno-lab.test/#/lessons/R3")).toBe(
      "https://reyno-lab.test/lessons/R3",
    );
  });

  it("keeps the route's query string", () => {
    expect(hashRouteUrl("https://reyno-lab.test/#/lessons/R3?variant=v2")).toBe(
      "https://reyno-lab.test/lessons/R3?variant=v2",
    );
  });

  it("maps the home route to the root", () => {
    expect(hashRouteUrl("https://reyno-lab.test/#/")).toBe("https://reyno-lab.test/");
  });

  it("leaves URLs without a hash route alone", () => {
    expect(hashRouteUrl("https://reyno-lab.test/")).toBe("https://reyno-lab.test/");
    expect(hashRouteUrl("https://reyno-lab.test/#main")).toBe(
      "https://reyno-lab.test/#main",
    );
  });

  it("returns something that is not a URL unchanged", () => {
    expect(hashRouteUrl("not a url")).toBe("not a url");
  });
});
