import { useTranslation } from "react-i18next";
import { isLocale, LOCALE_INFO, type Locale, type LocaleInfo } from "./locales";

/** The language on screen; re-renders the caller when it changes. */
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  return isLocale(language) ? language : "zh";
}

export function useLocaleInfo(): LocaleInfo & { readonly locale: Locale } {
  const locale = useLocale();
  return { locale, ...LOCALE_INFO[locale] };
}
