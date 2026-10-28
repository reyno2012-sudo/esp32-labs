import { useTranslation } from "react-i18next";
import { SOURCE_LOCALE } from "@/i18n/locales";

/** Option for reading a whole catalogue subtree. */
export const TREE = { returnObjects: true } as const;

/**
 * The labs-rfid `t`, and `en`: the same lookup in English. Lists read whole with TREE (flow
 * steps, screen callouts) go through overEnglish(en(key, TREE), t(key, TREE)), so a partial
 * translation never leaves a hole.
 */
export function useRfidText() {
  const { t, i18n } = useTranslation("labs-rfid");
  return { t, en: i18n.getFixedT(SOURCE_LOCALE, "labs-rfid") };
}
