import { useTranslation } from "react-i18next";
import type { Track } from "@/domain/track";

/**
 * A theme's title and blurb in the reader's language. TRACKS keeps the English (tests, logs);
 * the screen reads the "common" catalogue (tracks.<id>.title / .blurb).
 */
export function useTrackText() {
  const { t } = useTranslation();
  return (track: Track) => ({
    title: t(`tracks.${track.id}.title`),
    blurb: t(`tracks.${track.id}.blurb`),
  });
}
