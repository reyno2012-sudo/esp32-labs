import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useTrackText } from "@/features/navigation/use-track-text";
import { findTrack } from "@/content/tracks";
import type { LessonEntry, ResolvedLesson } from "@/domain/lesson";
import type { LessonSection as Section } from "@/domain/lesson-sections";
import { lessonState, stepsTicked } from "@/domain/progress";
import { BoardCard } from "@/features/board/BoardCard";
import { useTicks } from "@/features/progress/progress-store";
import { CommandsPanel } from "./CommandsPanel";
import { LessonHeader } from "./LessonHeader";
import styles from "./LessonPage.module.css";
import { LessonSection } from "./LessonSection";
import { NextUp } from "./NextUp";
import { sectionTitle } from "./section-labels";
import { StepsChecklist } from "./StepsChecklist";
import { WidgetSlot } from "./WidgetSlot";
import { WiringTable } from "./WiringTable";

/**
 * One lesson as one sheet, top to bottom: what and why, the explainers, the wiring, the
 * commands, the steps, and a preview of what the board should do, strung on a trace that lights
 * the part you are reading. The pinout sits beside it.
 */
export function LessonPage({
  lesson,
  lessons,
  sections,
  active,
  onVariant,
}: {
  lesson: ResolvedLesson;
  /** Every lesson of the track, for the header's position and the next-lesson link. */
  lessons: readonly LessonEntry[];
  sections: readonly Section[];
  active?: string;
  onVariant: (key: string) => void;
}) {
  const { t } = useTranslation("lesson");
  const ticks = useTicks();
  const trackText = useTrackText();
  const track = findTrack(lesson.track);
  const base = lessons.find((l) => l.id === lesson.id);
  const open = lessons.filter((l) => l.kind === "lesson");
  const style = { "--track": `var(${track?.color ?? "--copper"})` } as CSSProperties;
  const steps = { ticked: stepsTicked(lesson, ticks), total: lesson.steps.length };

  function body(section: Section) {
    switch (section.kind) {
      case "goal":
        return null;
      case "explain": {
        const panel = lesson.panels[section.panel ?? 0];
        return panel ? (
          <div className={styles.stage}>
            <WidgetSlot
              widget={panel.widget}
              lesson={lesson}
              panel={panel}
              name={`${lesson.id} · ${panel.title}`}
            />
          </div>
        ) : null;
      }
      case "wiring":
        return lesson.wiring ? <WiringTable wiring={lesson.wiring} /> : null;
      case "commands":
        return lesson.commands ? <CommandsPanel commands={lesson.commands} /> : null;
      case "steps":
        return <StepsChecklist lesson={lesson} />;
      case "preview":
        return lesson.preview ? (
          <div className={styles.stage}>
            <WidgetSlot
              widget={lesson.preview.widget}
              lesson={lesson}
              name={`${lesson.id} preview`}
            />
          </div>
        ) : null;
    }
  }

  return (
    <div className={styles.grid} style={style}>
      <BoardCard lesson={lesson} />
      <div className={styles.column}>
        <article className={styles.sheet} aria-labelledby={`lesson-${lesson.id}-title`}>
          <LessonHeader
            lesson={lesson}
            onVariant={onVariant}
            state={base ? lessonState(base, ticks) : "built"}
            trackTitle={track ? trackText(track).title : ""}
            position={{ index: open.findIndex((l) => l.id === lesson.id) + 1, total: open.length }}
            steps={steps}
            active={active === "sec-goal"}
          />
          {sections
            .filter((s) => s.kind !== "goal")
            .map((s, i) => (
              <LessonSection
                key={s.id}
                id={s.id}
                kind={s.kind}
                number={i + 1}
                title={sectionTitle(t, s)}
                intro={
                  s.kind === "explain"
                    ? lesson.panels[s.panel ?? 0]?.intro
                    : s.kind === "commands"
                      ? t("commands.intro")
                      : undefined
                }
                active={active === s.id}
              >
                {body(s)}
              </LessonSection>
            ))}
        </article>
        <NextUp lessons={lessons} currentId={lesson.id} trackId={lesson.track} />
      </div>
    </div>
  );
}
