import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { lessonPart } from "@/content/icons";
import type { ActiveLesson } from "@/domain/lesson";
import type { LessonState } from "@/domain/progress";
import type { Track } from "@/domain/track";
import { envOfCommand } from "@/features/code/queries";
import { useTrackText } from "@/features/navigation/use-track-text";
import { StateBadge } from "@/features/progress/LessonState";
import { Icon } from "@/ui/Icon";
import { PartIcon } from "@/ui/parts/PartIcon";
import styles from "./ContinueCard.module.css";

/** The one big button on the home page: the lesson to open next, and its code. */
export function ContinueCard({
  lesson,
  track,
  state,
  resumed,
}: {
  lesson: ActiveLesson;
  track: Track;
  state: LessonState;
  /** True when this is the lesson you last opened, false when it is a suggestion. */
  resumed: boolean;
}) {
  const style = { "--track": `var(${track.color})` } as CSSProperties;
  const hasCode = Boolean(envOfCommand(lesson.cmd ?? ""));
  const { t } = useTranslation("home");
  const trackText = useTrackText();
  return (
    <article className={styles.card} style={style} aria-labelledby="continue-title">
      <p className={styles.kicker}>{resumed ? t("continue.resumed") : t("continue.start")}</p>
      <div className={styles.head}>
        <span className={styles.pad} aria-hidden="true">
          <PartIcon name={lessonPart(lesson.id, lesson.track)} size={64} />
          <span className={styles.id}>{lesson.id}</span>
        </span>
        <div>
          <p className={styles.track}>{trackText(track).title}</p>
          <h3 id="continue-title" className={styles.title}>
            {lesson.heading}
          </h3>
        </div>
      </div>
      <StateBadge state={state} />
      <div className={styles.actions}>
        <Link to={`/lessons/${lesson.id}`} className={styles.go}>
          <Icon name="wire" />
          {resumed ? t("continue.continue") : t("continue.open")}
          <Icon name="arrow" />
        </Link>
        {hasCode ? (
          <Link to={`/lessons/${lesson.id}/code`} className={styles.code}>
            <Icon name="code" />
            {t("continue.code")}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
