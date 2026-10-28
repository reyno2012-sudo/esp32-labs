import { type CSSProperties, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { lessonPart } from "@/content/icons";
import type { LessonEntry } from "@/domain/lesson";
import { lessonState } from "@/domain/progress";
import { StateGlyph } from "@/features/progress/LessonState";
import { useTicks } from "@/features/progress/progress-store";
import { PartIcon } from "@/ui/parts/PartIcon";
import styles from "./LessonStepper.module.css";

/**
 * The lessons of one theme as stations on a copper trace: the trace is lit up to the open lesson,
 * each pad wears its state, so "where am I, what's left" reads in one glance.
 */
export function LessonStepper({
  lessons,
  currentId,
  color,
  view = "lab",
}: {
  lessons: readonly LessonEntry[];
  currentId: string;
  /** The track's colour token, e.g. "--rfid". */
  color: `--${string}`;
  /** Which tab the pads open: reading the code stays reading the code. */
  view?: "lab" | "code";
}) {
  const ticks = useTicks();
  const { t } = useTranslation();
  const currentRef = useRef<HTMLAnchorElement>(null);
  const at = lessons.findIndex((l) => l.id === currentId);
  const style = { "--track": `var(${color})` } as CSSProperties;

  // On a phone the trace scrolls sideways: keep the open lesson in view.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentId]);

  return (
    <nav className={styles.steps} aria-label={t("stepper.label")} style={style}>
      <ol>
        {lessons.map((l, i) => {
          const state = lessonState(l, ticks);
          const body = (
            <>
              <span className={styles.pad}>
                <PartIcon name={lessonPart(l.id, l.track)} size={38} />
                <span className={styles.mark}>
                  <StateGlyph state={state} />
                </span>
              </span>
              <span className={styles.n}>{l.id}</span>
              <span className={styles.t}>{l.title}</span>
              <span className="visually-hidden">
                {t("stepper.state", { state: t(`states.${state}.label`) })}
              </span>
            </>
          );
          return (
            <li key={l.id} data-before={i < at || undefined}>
              {l.kind === "planned" ? (
                <span className={styles.step} aria-disabled="true">
                  {body}
                </span>
              ) : (
                <Link
                  ref={l.id === currentId ? currentRef : undefined}
                  to={`/lessons/${l.id}${view === "code" ? "/code" : ""}`}
                  preventScrollReset
                  className={styles.step}
                  aria-current={l.id === currentId ? "page" : undefined}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
