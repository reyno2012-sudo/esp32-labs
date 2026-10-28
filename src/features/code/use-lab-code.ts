import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/use-locale";
import { createLogger } from "@/lib/logger";
import { codeContentQuery } from "./content-query";
import { buildLabCode, type LabCode } from "./lab-code";
import { firmwareEnvQuery } from "./queries";
import type { FirmwareEnvDoc } from "./schema";

const log = createLogger("code");
// Analysing a lab takes a few milliseconds; do it once per fetched document and language
// (the phrasebook, the tours and the generated sentences are part of the analysis). Keyed on the
// translate function too: it changes with the language, so no other language's words are served.
const cache = new WeakMap<FirmwareEnvDoc, WeakMap<object, WeakMap<object, LabCode>>>();

/** The lab's code, analysed and toured. Suspends while the code or the phrasebook loads. */
export function useLabCode(envName: string): LabCode {
  const { data: doc } = useSuspenseQuery(firmwareEnvQuery(envName));
  const { data: content } = useSuspenseQuery(codeContentQuery(useLocale()));
  const { t } = useTranslation("code");
  const perDoc = cache.get(doc) ?? new WeakMap<object, WeakMap<object, LabCode>>();
  cache.set(doc, perDoc);
  const perContent = perDoc.get(content) ?? new WeakMap<object, LabCode>();
  perDoc.set(content, perContent);
  let lab = perContent.get(t);
  if (!lab) {
    lab = buildLabCode(
      doc,
      content.glossary,
      content.tours.find((tour) => tour.env === envName),
      t,
    );
    perContent.set(t, lab);
    log.debug("lab analysed", { env: envName, files: lab.files.length });
    for (const p of lab.problems) log.warn("tour anchor problem", { env: envName, ...p });
  }
  return lab;
}
