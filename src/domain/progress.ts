import { type LessonEntry, type ResolvedLesson, resolveLesson, stepKey } from "./lesson";

/** Ticked steps, keyed by stepKey(). */
export type Ticks = Readonly<Record<string, boolean>>;

/** Done = every step ticked (in at least one variant, for lessons that have several). */
export function isLessonDone(lesson: LessonEntry, ticks: Ticks): boolean {
  if (lesson.kind !== "lesson") return false;
  const keys = lesson.variants?.map((v) => v.key) ?? [undefined];
  return keys.some((key) => {
    const resolved = resolveLesson(lesson, key);
    return resolved.steps.length > 0 && resolved.steps.every((_, i) => ticks[stepKey(resolved, i)]);
  });
}

const WORKING_STATUS = /works|runs|on board/;

/** Working = done by you, or already confirmed on the real board. */
export function isLessonWorking(lesson: LessonEntry, ticks: Ticks): boolean {
  return (
    lesson.kind === "lesson" && (isLessonDone(lesson, ticks) || WORKING_STATUS.test(lesson.status))
  );
}

/** Where a track button takes you: the first lesson that isn't working yet, else the first. */
export function entryLesson(
  lessons: readonly LessonEntry[],
  ticks: Ticks,
): LessonEntry | undefined {
  const open = lessons.filter((l) => l.kind === "lesson");
  return open.find((l) => !isLessonWorking(l, ticks)) ?? open[0];
}

/**
 * One word for where a lesson stands, most finished first: you ticked every step, the real board
 * runs it, the firmware is built but not flashed yet, or it is only on the roadmap.
 */
export type LessonState = "done" | "works" | "built" | "planned";

export function lessonState(lesson: LessonEntry, ticks: Ticks): LessonState {
  if (lesson.kind === "planned") return "planned";
  if (isLessonDone(lesson, ticks)) return "done";
  if (WORKING_STATUS.test(lesson.status)) return "works";
  return "built";
}

/** How many of a track's lessons sit in each state. */
export function tallyStates(
  lessons: readonly LessonEntry[],
  ticks: Ticks,
): Record<LessonState, number> {
  const tally: Record<LessonState, number> = { done: 0, works: 0, built: 0, planned: 0 };
  for (const l of lessons) tally[lessonState(l, ticks)] += 1;
  return tally;
}

/** Ticked steps of one resolved lesson (its variant only). */
export function stepsTicked(lesson: ResolvedLesson, ticks: Ticks): number {
  return lesson.steps.filter((_, i) => ticks[stepKey(lesson, i)]).length;
}

/** The lessons you can open just before and just after `id`, within its track. */
export function neighbours(
  lessons: readonly LessonEntry[],
  id: string,
): { prev?: LessonEntry; next?: LessonEntry } {
  const open = lessons.filter((l) => l.kind === "lesson");
  const i = open.findIndex((l) => l.id === id);
  if (i < 0) return {};
  return { prev: open[i - 1], next: open[i + 1] };
}

/** Where "Continue" takes you: the lesson you last opened, else the first one not working yet. */
export function continueLesson(
  lessons: readonly LessonEntry[],
  lastId: string | null,
  ticks: Ticks,
): LessonEntry | undefined {
  const last = lessons.find((l) => l.id === lastId && l.kind === "lesson");
  return last ?? entryLesson(lessons, ticks);
}
