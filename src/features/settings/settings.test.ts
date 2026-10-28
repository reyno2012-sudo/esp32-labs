import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

describe("normalizeSettings", () => {
  it("keeps valid fields and replaces the rest with defaults", () => {
    expect(normalizeSettings({ level: "deep", codeSize: "huge", wrap: true })).toEqual({
      ...DEFAULT_SETTINGS,
      level: "deep",
      wrap: true,
    });
  });
  it("falls back to the defaults for anything that is not an object", () => {
    expect(normalizeSettings("nonsense")).toBe(DEFAULT_SETTINGS);
  });
});
