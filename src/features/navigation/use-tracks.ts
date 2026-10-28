import { useQueries } from "@tanstack/react-query";
import { trackLessonsQuery } from "@/content/queries";
import { TRACKS } from "@/content/tracks";
import type { LessonEntry } from "@/domain/lesson";
import type { Track } from "@/domain/track";
import { useLocale } from "@/i18n/use-locale";

export interface TrackContent {
  readonly track: Track;
  /** Undefined while that track's chunk is still loading. */
  readonly lessons?: readonly LessonEntry[];
}

/**
 * Every track with its lessons. Each track's content is one small chunk; the ones not on screen
 * load in the background, so a row fills in a moment after the page appears.
 */
export function useTracks(): TrackContent[] {
  const locale = useLocale();
  const results = useQueries({ queries: TRACKS.map((t) => trackLessonsQuery(t.id, locale)) });
  return TRACKS.map((track, i) => ({ track, lessons: results[i]?.data }));
}
