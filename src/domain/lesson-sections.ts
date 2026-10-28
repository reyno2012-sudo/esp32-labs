import type { ResolvedLesson } from "./lesson";

/** The parts of a lesson page, in reading order. Each has its own icon and colour cue. */
export type SectionKind = "goal" | "explain" | "wiring" | "commands" | "steps" | "preview";

export interface LessonSection {
  /** DOM id of the section, also its key in the section nav. */
  readonly id: string;
  readonly kind: SectionKind;
  /**
   * The lesson's own heading for this part (an explainer's title, a custom wiring title). Without
   * one, the page shows the kind's standard heading; the nav always shows the kind's short label.
   */
  readonly title?: string;
  /** 1-based number of an explainer when the lesson has several ("How 2" in the nav). */
  readonly number?: number;
  /** Index into `lesson.panels` for explainer sections. */
  readonly panel?: number;
}

/**
 * The sections a lesson shows, built from what it actually has: a lesson without wiring has no
 * "Wire" step. The page and its section nav both read this list, so they never disagree.
 */
export function lessonSections(lesson: ResolvedLesson): LessonSection[] {
  const sections: LessonSection[] = [{ id: "sec-goal", kind: "goal" }];
  lesson.panels.forEach((panel, i) =>
    sections.push({
      id: `sec-explain-${i}`,
      kind: "explain",
      title: panel.title,
      ...(lesson.panels.length > 1 ? { number: i + 1 } : {}),
      panel: i,
    }),
  );
  if (lesson.wiring)
    sections.push({
      id: "sec-wiring",
      kind: "wiring",
      ...(lesson.wiring.title ? { title: lesson.wiring.title } : {}),
    });
  if (lesson.commands?.length)
    sections.push({ id: "sec-commands", kind: "commands" });
  sections.push({ id: "sec-steps", kind: "steps" });
  if (lesson.preview) sections.push({ id: "sec-preview", kind: "preview" });
  return sections;
}
