import { describe, expect, it } from "vitest";
import { checkCatalogue } from "./catalogue-check";
import { LOCALES, SOURCE_LOCALE } from "./locales";
import { NAMESPACES } from "./namespaces";

const catalogues = import.meta.glob<unknown>("../locales/{en,zh}/*.json", {
  import: "default",
  eager: true,
});
const catalogue = (locale: string, ns: string) => catalogues[`../locales/${locale}/${ns}.json`];

describe("interface catalogues", () => {
  it("every namespace has a Simplified Chinese interface catalogue", () => {
    expect(NAMESPACES.filter((ns) => catalogue("zh", ns) === undefined)).toEqual([]);
  });

  it("no catalogue sits outside the known namespaces and languages", () => {
    const known = new Set([
      ...NAMESPACES.map((ns) => `../locales/${SOURCE_LOCALE}/${ns}.json`),
      ...LOCALES.flatMap((l) => NAMESPACES.map((ns) => `../locales/${l}/${ns}.json`)),
    ]);
    expect(Object.keys(catalogues).filter((path) => !known.has(path))).toEqual([]);
  });

  const pairs = LOCALES.flatMap((locale) =>
    NAMESPACES.map((ns) => ({ locale, ns })),
  );
  it.each(pairs)("$locale/$ns fits the canonical source", ({ locale, ns }) => {
    const translated = catalogue(locale, ns);
    if (translated === undefined) return;
    expect(checkCatalogue(catalogue(SOURCE_LOCALE, ns), translated, locale)).toEqual([]);
  });
});
