import type { ReactNode } from "react";
import type { SectionKind } from "@/domain/lesson-sections";
import { Icon } from "@/ui/Icon";
import { RichText } from "@/ui/RichText";
import { SECTION_ICON } from "./section-icons";
import styles from "./LessonSection.module.css";

/**
 * One part of the lesson sheet: a via on the trace that runs down the page (lit while you read
 * this part), its number and icon, the heading, then the content.
 */
export function LessonSection({
  id,
  kind,
  number,
  title,
  intro,
  active,
  children,
}: {
  id: string;
  kind: SectionKind;
  number: number;
  title: string;
  intro?: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.section}
      data-kind={kind}
      data-active={active || undefined}
      aria-labelledby={`${id}-h`}
    >
      <header className={styles.head}>
        <span className={styles.via} aria-hidden="true">
          <Icon name={SECTION_ICON[kind]} size={16} />
        </span>
        <span className={styles.num} aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
        <h3 id={`${id}-h`} className={styles.title}>
          {title}
        </h3>
      </header>
      {intro ? (
        <p className={styles.intro}>
          <RichText text={intro} />
        </p>
      ) : null}
      {children}
    </section>
  );
}
