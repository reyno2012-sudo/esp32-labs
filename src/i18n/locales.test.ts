import { describe, expect, it } from "vitest";
import {
  isLocale,
  LOCALE_INFO,
  LOCALES,
  matchLocale,
  SOURCE_LOCALE,
} from "./locales";

describe("single-language Chinese interface", () => {
  it("always resolves to Simplified Chinese regardless of browser preferences", () => {
    expect(LOCALES).toEqual(["zh"]);
    expect(SOURCE_LOCALE).toBe("en");
    expect(matchLocale(["fr-CA", "zh-TW"])).toBe("zh");
    expect(matchLocale([])).toBe("zh");
  });

  it("supports no locale except Simplified Chinese", () => {
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("en")).toBe(false);
    expect(isLocale("zh-TW")).toBe(false);
  });
});

describe("LOCALE_INFO", () => {
  it("describes the Chinese locale as left to right", () => {
    expect(Object.keys(LOCALE_INFO).sort()).toEqual([...LOCALES].sort());
    expect(LOCALE_INFO.zh).toMatchObject({ nativeName: "简体中文", tag: "zh-Hans", dir: "ltr" });
  });
});
