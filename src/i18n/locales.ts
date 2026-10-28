// The only language exposed by the app is Simplified Chinese. English remains the canonical
// authoring source for typed lesson data and translation checks; it is not an interface locale.
export const LOCALES = ["zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const SOURCE_LOCALE = "en" as const;

export type Direction = "ltr";

export interface LocaleInfo {
  readonly nativeName: string;
  readonly englishName: string;
  readonly short: string;
  readonly tag: string;
  readonly dir: Direction;
}

export const LOCALE_INFO: Readonly<Record<Locale, LocaleInfo>> = {
  zh: { nativeName: "简体中文", englishName: "Chinese (Simplified)", short: "中文", tag: "zh-Hans", dir: "ltr" },
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/** Browser settings and old shared links never change the app's interface language. */
export const matchLocale = (_preferred: readonly string[]): Locale => "zh";
