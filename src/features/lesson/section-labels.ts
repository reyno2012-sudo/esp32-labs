import type { TFunction } from "i18next";
import type { LessonSection } from "@/domain/lesson-sections";

/** The heading on the page: the lesson's own, else the kind's standard one. */
export function sectionTitle(t: TFunction<"lesson">, section: LessonSection): string {
  if (section.title) return section.title;
  switch (section.kind) {
    case "explain":
      return t("sections.explain.short");
    default:
      return t(`sections.${section.kind}.title`);
  }
}

/** One or two words for the section nav. */
export function sectionShort(t: TFunction<"lesson">, section: LessonSection): string {
  if (section.kind === "explain" && section.number)
    return t("sections.explain.shortNumbered", { number: section.number });
  return t(`sections.${section.kind}.short`);
}
