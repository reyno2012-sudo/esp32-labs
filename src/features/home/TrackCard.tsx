import type { CSSProperties } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { lessonPart, TRACK_PART } from "@/content/icons";
import type { LessonEntry } from "@/domain/lesson";
import { lessonState, tallyStates, type Ticks } from "@/domain/progress";
import type { Track } from "@/domain/track";
import { StateGlyph } from "@/features/progress/LessonState";
import { useTrackText } from "@/features/navigation/use-track-text";
import { PartIcon } from "@/ui/parts/PartIcon";
import styles from "./TrackCard.module.css";

/** One theme: its icon in a progress ring, and one tile per lesson (its part, its state). */
export function TrackCard({
  track,
  lessons,
  ticks,
}: {
  track: Track;
  lessons?: readonly LessonEntry[];
  ticks: Ticks;
}) {
  const style = { "--track": `var(${track.color})` } as CSSProperties;
  const open = lessons?.filter((l) => l.kind === "lesson") ?? [];
  const tally = tallyStates(open, ticks);
  const working = tally.done + tally.works;
  const share = open.length ? working / open.length : 0;
  const { t } = useTranslation("home");
  const { title, blurb } = useTrackText()(track);

  return (
    <section
      className={styles.card}
      style={style}
      data-planned={track.planned || undefined}
      aria-labelledby={`track-${track.id}`}
    >
      <header className={styles.head}>
        <span className={styles.badge} aria-hidden="true">
          <svg className={styles.ring} viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" pathLength="100" className={styles.ringBase} />
            <circle
              cx="18"
              cy="18"
              r="15"
              pathLength="100"
              className={styles.ringFill}
              strokeDasharray={`${share * 100} 100`}
            />
          </svg>
          <PartIcon name={TRACK_PART[track.id]} size={40} />
        </span>
        <div className={styles.titles}>
          <h3 id={`track-${track.id}`}>
            {track.planned ? title : <Link to={`/tracks/${track.id}`}>{title}</Link>}
          </h3>
          <p>{blurb}</p>
        </div>
        <p className={styles.count}>
          {track.planned ? (
            t("track.planned")
          ) : (
            <Trans
              t={t}
              i18nKey="track.working"
              values={{ working, total: open.length }}
              components={{ b: <b />, span: <span /> }}
            />
          )}
        </p>
      </header>
      {lessons?.length ? (
        <ol className={styles.pads}>
          {lessons.map((l) => {
            const state = lessonState(l, ticks);
            const body = (
              <>
                <span className={styles.pad} data-state={state}>
                  <PartIcon name={lessonPart(l.id, l.track)} size={60} />
                  <span className={styles.mark}>
                    <StateGlyph state={state} />
                  </span>
                </span>
                <span className={styles.id}>{l.id}</span>
                <span className={styles.name}>{l.title}</span>
                <span className="visually-hidden">
                  {t("track.state", { state: t(`states.${state}.label`, { ns: "common" }) })}
                </span>
              </>
            );
            return (
              <li key={l.id}>
                {l.kind === "planned" ? (
                  <span className={styles.lesson} aria-disabled="true">
                    {body}
                  </span>
                ) : (
                  <Link to={`/lessons/${l.id}`} className={styles.lesson}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      ) : !track.planned && !lessons ? (
        <p className={styles.loading}>{t("track.loading")}</p>
      ) : null}
    </section>
  );
}
