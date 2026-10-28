import { QueryClient } from "@tanstack/react-query";
import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { trackLoader } from "./lesson-route";

// A theme link opens its first lesson that isn't working yet, on the tab you were reading.
const open = async (url: string) => {
  const response = await trackLoader(new QueryClient())({
    params: { trackId: "rfid" },
    request: new Request(url),
    url: new URL(url),
    pattern: "/tracks/:trackId",
    context: new RouterContextProvider(),
  });
  return (response as Response).headers.get("Location");
};

describe("trackLoader", () => {
  it("opens the lab, or its code when you came from the code", async () => {
    expect(await open("http://x/tracks/rfid")).toMatch(/^\/lessons\/R\d$/);
    expect(await open("http://x/tracks/rfid?view=code")).toMatch(/^\/lessons\/R\d\/code$/);
  });
});
