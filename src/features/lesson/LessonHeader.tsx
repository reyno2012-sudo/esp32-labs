import { useTranslation } from "react-i18next";
import { lessonPart } from "@/content/icons";
import type { ResolvedLesson } from "@/domain/lesson";
import type { LessonState } from "@/domain/progress";
import { StateBadge } from "@/features/progress/LessonState";
import { goToSection } from "@/lib/active-section";
import { CopyCommand } from "@/ui/CopyCommand";
import { Icon } from "@/ui/Icon";
import { PartIcon } from "@/ui/parts/PartIcon";
import { RichText } from "@/ui/RichText";
import { LabSourceLink } from "./LabSourceLink";
import styles from "./LessonHeader.module.css";
import { PinsUsed } from "./PinsUsed";
import { VariantSwitch } from "./VariantSwitch";

/**
 * The top of the sheet: which lesson this is and where it stands, what it is for, what "done"
 * means, what it uses on the board, and the one command to run.
 */
export function LessonHeader({
  lesson,
  onVariant,
  state,
  trackTitle,
  position,
  steps,
  active,
}: {
  lesson: ResolvedLesson;
  onVariant: (key: string) => void;
  state: LessonState;
  trackTitle: string;
  /** 1-based place of the lesson in its track. */
  position: { index: number; total: number };
  steps: { ticked: number; total: number };
  active: boolean;
}) {
  const { t } = useTranslation("lesson");
  const share = steps.total ? steps.ticked / steps.total : 0;
  return (
    <section
      id="sec-goal"
      tabIndex={-1}
      className={styles.hero}
      data-active={active || undefined}
      aria-labelledby={`lesson-${lesson.id}-title`}
    >
      <span className={styles.via} aria-hidden="true">
        <Icon name="flag" size={16} />
      </span>
      <div className={styles.top}>
        <span className={styles.idPad}>
          <PartIcon name={lessonPart(lesson.id, lesson.track)} size={58} />
          <span className={styles.id}>
            <span className="visually-hidden">{t("header.lessonId", { id: lesson.id })}</span>
            <span aria-hidden="true">{lesson.id}</span>
          </span>
        </span>
        <div className={styles.titles}>
          <p className={styles.eyebrow}>
            {t("header.eyebrow", {
              track: trackTitle,
              index: position.index,
              total: position.total,
            })}
          </p>
          <h2 id={`lesson-${lesson.id}-title`} className={styles.heading}>
            {lesson.heading}
          </h2>
        </div>
        <StateBadge state={state} />
      </div>

      {lesson.variants ? (
        <VariantSwitch
          variants={lesson.variants}
          current={lesson.variantKey}
          onChange={onVariant}
        />
      ) : null}

      <p className={styles.goal}>
        <RichText text={lesson.goal} />
      </p>

      <div className={styles.facts}>
        {lesson.goalCheck ? (
          <div className={styles.goalbox}>
            <b>{t("header.goal")}</b>
            {lesson.goalLine ? (
              <p>
                <RichText text={lesson.goalLine} />
              </p>
            ) : null}
            <p className={styles.doneWhen}>{t("header.doneWhen")}</p>
            <ul>
              {lesson.goalCheck.map((c) => (
                <li key={c}>
                  <span>
                    <RichText text={c} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={styles.side}>
          {lesson.pins.length || lesson.usb ? (
            <div>
              <p className={styles.label}>{t("header.onBoard")}</p>
              <PinsUsed pins={lesson.pins} usb={Boolean(lesson.usb)} />
            </div>
          ) : null}
          {lesson.learn.length ? (
            <div>
              <p className={styles.label}>{t("header.learn")}</p>
              <ul className={styles.learn} aria-label={t("header.learn")}>
                {lesson.learn.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {lesson.cmd ? <CopyCommand command={lesson.cmd} /> : null}
      <LabSourceLink cmd={lesson.cmd} className={styles.source} />

      {steps.total ? (
        <button type="button" className={styles.meter} onClick={() => goToSection("sec-steps")}>
          <span className={styles.bar} aria-hidden="true">
            <span style={{ inlineSize: `${share * 100}%` }} />
          </span>
          <span>
            {steps.ticked === steps.total
              ? t("header.allTicked")
              : t("header.ticked", { ticked: steps.ticked, count: steps.total })}
          </span>
          <Icon name="arrow" size={14} />
        </button>
      ) : null}
    </section>
  );
}
