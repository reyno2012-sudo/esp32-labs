import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { TRACK_PART } from "@/content/icons";
import type { TrackId } from "@/domain/lesson";
import { lessonState, tallyStates } from "@/domain/progress";
import { useTicks } from "@/features/progress/progress-store";
import { PartIcon } from "@/ui/parts/PartIcon";
import styles from "./TrackNav.module.css";
import { useTrackText } from "./use-track-text";
import { useTracks } from "./use-tracks";

/**
 * The themes as one slim strip of pills. Each pill's meter has one segment per lesson, filled
 * when it works, so you can compare tracks at a glance without a wall of cards.
 */
export function TrackNav({
  activeTrack,
  view = "lab",
}: {
  activeTrack: TrackId;
  /** Which tab a theme opens on: reading the code stays reading the code. */
  view?: "lab" | "code";
}) {
  const ticks = useTicks();
  const tracks = useTracks();
  const { t } = useTranslation();
  const trackText = useTrackText();

  return (
    <nav className={styles.tracks} aria-label={t("trackNav.label")}>
      <ul>
        {tracks.map(({ track, lessons }) => {
          const style = { "--track": `var(${track.color})` } as CSSProperties;
          const open = lessons?.filter((l) => l.kind === "lesson") ?? [];
          const tally = tallyStates(open, ticks);
          const working = tally.done + tally.works;
          const { title, blurb } = trackText(track);
          const body = (
            <>
              <span className={styles.icon}>
                <PartIcon name={TRACK_PART[track.id]} size={28} />
              </span>
              <span className={styles.title}>{title}</span>
              <span className={styles.meter} aria-hidden="true">
                {open.map((l) => (
                  <i key={l.id} data-state={lessonState(l, ticks)} />
                ))}
              </span>
              <span className={styles.count}>
                {track.planned
                  ? t("trackNav.soon")
                  : lessons
                    ? t("trackNav.count", { working, total: open.length })
                    : "…"}
              </span>
            </>
          );
          return (
            <li key={track.id}>
              {track.planned ? (
                <span
                  className={styles.track}
                  style={style}
                  aria-disabled="true"
                  title={t("trackNav.plannedTitle", { title, blurb })}
                >
                  {body}
                </span>
              ) : (
                <Link
                  to={`/tracks/${track.id}${view === "code" ? "?view=code" : ""}`}
                  preventScrollReset
                  className={styles.track}
                  style={style}
                  title={blurb}
                  aria-label={
                    lessons
                      ? t("trackNav.working", { title, working, total: open.length })
                      : t("trackNav.loading", { title })
                  }
                  aria-current={track.id === activeTrack ? "true" : undefined}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
