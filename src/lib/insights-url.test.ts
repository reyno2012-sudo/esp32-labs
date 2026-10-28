import { describe, expect, it } from "vitest";
import { hashRouteUrl } from "./insights-url";

describe("hashRouteUrl", () => {
  it("promotes the hash route to the path", () => {
    expect(hashRouteUrl("https://esp-labs-web.vercel.app/#/lessons/R3")).toBe(
      "https://esp-labs-web.vercel.app/lessons/R3",
    );
  });

  it("keeps the route's query string", () => {
    expect(hashRouteUrl("https://esp-labs-web.vercel.app/#/lessons/R3?variant=v2")).toBe(
      "https://esp-labs-web.vercel.app/lessons/R3?variant=v2",
    );
  });

  it("maps the home route to the root", () => {
    expect(hashRouteUrl("https://esp-labs-web.vercel.app/#/")).toBe("https://esp-labs-web.vercel.app/");
  });

  it("leaves URLs without a hash route alone", () => {
    expect(hashRouteUrl("https://esp-labs-web.vercel.app/")).toBe("https://esp-labs-web.vercel.app/");
    expect(hashRouteUrl("https://esp-labs-web.vercel.app/#main")).toBe(
      "https://esp-labs-web.vercel.app/#main",
    );
  });

  it("returns something that is not a URL unchanged", () => {
    expect(hashRouteUrl("not a url")).toBe("not a url");
  });
});
