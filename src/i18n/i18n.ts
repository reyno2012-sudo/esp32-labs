import i18next, { type BackendModule, type ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";
import { createLogger } from "@/lib/logger";
import { isLocale, LOCALE_INFO, type Locale, LOCALES } from "./locales";
import { CORE_NAMESPACES, DEFAULT_NAMESPACE } from "./namespaces";

const log = createLogger("i18n");

// Every interface catalogue is its own chunk: a reader downloads only their language, and only
// the namespaces on screen. A namespace a language has not translated yet resolves to nothing,
// so its keys fall back to English one by one.
const CATALOGUES = import.meta.glob<ResourceKey>("../locales/zh/*.json", { import: "default" });

const lazyCatalogues: BackendModule = {
  type: "backend",
  init() {},
  read(language, namespace, callback) {
    const load = CATALOGUES[`../locales/${language}/${namespace}.json`];
    if (!load) return callback(null, {});
    load().then(
      (resources) => callback(null, resources),
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), null),
    );
  },
};

export const i18n = i18next.createInstance();

/** The language on screen now. */
export const currentLocale = (): Locale => {
  const language = i18n.resolvedLanguage ?? i18n.language;
  return isLocale(language) ? language : "zh";
};

/** <html lang dir>: screen readers, hyphenation, fonts (:lang) and the RTL layout follow it. */
function applyToDocument(locale: Locale): void {
  const root = document.documentElement;
  const info = LOCALE_INFO[locale];
  root.lang = info.tag;
  root.dir = info.dir;
  document.title = i18n.t("app.title", { ns: "common" });
}

/**
 * Load Simplified Chinese before the first paint.
 */
export async function initI18n(): Promise<void> {
  i18n.on("languageChanged", (language) => {
    if (isLocale(language)) applyToDocument(language);
  });
  i18n.on("failedLoading", (language, namespace, message) =>
    log.warn("catalogue failed to load", { language, namespace, message }),
  );
  await i18n
    .use(lazyCatalogues)
    .use(initReactI18next)
    .init({
      lng: "zh",
      fallbackLng: "zh",
      supportedLngs: LOCALES,
      load: "currentOnly",
      ns: CORE_NAMESPACES,
      defaultNS: DEFAULT_NAMESPACE,
      // React escapes what it renders; RichText parses the few tags lesson text may carry.
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: true },
    });
}
