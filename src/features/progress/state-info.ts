import type { LessonState } from "@/domain/progress";

// What each lesson state is called on screen lives in the "common" catalogue
// (states.<state>.label / .hint). The glyph shape carries it too, not only colour.

export const STATE_ORDER: readonly LessonState[] = ["done", "works", "built", "planned"];
