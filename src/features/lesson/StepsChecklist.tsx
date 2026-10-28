import { useTranslation } from "react-i18next";
import { type ResolvedLesson, stepKey } from "@/domain/lesson";
import { stepsTicked } from "@/domain/progress";
import { progress, useTicks } from "@/features/progress/progress-store";
import { RichText } from "@/ui/RichText";
import styles from "./StepsChecklist.module.css";

/** The steps to do with your hands, ticked off as you go (saved in this browser). */
export function StepsChecklist({ lesson }: { lesson: ResolvedLesson }) {
  const { t } = useTranslation("lesson");
  const ticks = useTicks();
  const ticked = stepsTicked(lesson, ticks);
  const total = lesson.steps.length;
  const complete = total > 0 && ticked === total;
  return (
    <>
      <ol className={styles.check} data-complete={complete || undefined}>
        {lesson.steps.map((step, i) => {
          const key = stepKey(lesson, i);
          return (
            <li key={key}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(ticks[key])}
                  onChange={(e) => progress.setTick(key, e.target.checked)}
                />
                <span>
                  <RichText text={step} />
                </span>
              </label>
            </li>
          );
        })}
      </ol>
      <p className={styles.status} role="status" data-complete={complete || undefined}>
        {complete
          ? t("steps.complete")
          : t("steps.status", { ticked, count: total })}
      </p>
      {lesson.note ? (
        <p className={styles.note}>
          <RichText text={lesson.note} />
        </p>
      ) : null}
    </>
  );
}
