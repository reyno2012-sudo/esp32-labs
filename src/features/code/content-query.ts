import { queryOptions } from "@tanstack/react-query";
import { localize } from "@/content/localize";
import { GLOSSARY_TEXT, TOUR_TEXT } from "@/content/text-policies";
import { createGlossary } from "@/domain/code/glossary";
import type { Locale } from "@/i18n/locales";

// The phrasebook and the hand-written tours: one lazily loaded chunk, needed only to read code,
// with the language's translation laid over each (src/locales/<locale>/content/*.json).
export const codeContentQuery = (locale: Locale) =>
  queryOptions({
    queryKey: ["content", "code", locale] as const,
    queryFn: async () => {
      const [{ GLOSSARY, TOPIC_LABELS }, { TOURS }] = await Promise.all([
        import("@/content/code/glossary"),
        import("@/content/code/tours"),
      ]);
      const [glossary, tours] = await Promise.all([
        localize({ entries: GLOSSARY, topics: TOPIC_LABELS }, locale, "glossary", GLOSSARY_TEXT),
        localize(TOURS, locale, "tours", TOUR_TEXT),
      ]);
      return { glossary: createGlossary(glossary.entries), topics: glossary.topics, tours };
    },
    staleTime: "static",
    gcTime: Infinity,
  });
