import { describe, expect, it } from "vitest";
import { applySrcFilter, parsePlatformio } from "./platformio.ts";

describe("platformio.ini", () => {
  it("reads each env's filter and the comment under its header", () => {
    const envs = parsePlatformio(`[env]
build_flags = -Wall

[env:02-led]
; First circuit: an LED.
build_src_filter = +<02-led/>

[env:03b]
build_src_filter = +<03b/>
    -<03b/controls/with_button.cpp>
`);
    expect(envs).toEqual([
      { name: "02-led", srcFilter: "+<02-led/>", about: "First circuit: an LED." },
      { name: "03b", srcFilter: "+<03b/> -<03b/controls/with_button.cpp>", about: "" },
    ]);
  });

  it("applies + and - rules in order", () => {
    const files = [
      "03b/main.cpp",
      "03b/controls/boot_only.cpp",
      "03b/controls/with_button.cpp",
      "02-led/main.cpp",
    ];
    expect(applySrcFilter("+<03b/> -<03b/controls/with_button.cpp>", files)).toEqual([
      "03b/main.cpp",
      "03b/controls/boot_only.cpp",
    ]);
  });
});
