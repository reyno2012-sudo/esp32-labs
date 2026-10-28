import type { ReactNode } from "react";
import styles from "./Panel.module.css";
import { RichText } from "./RichText";

interface PanelProps {
  /** Small uppercase heading (h3), as in a datasheet section. */
  title?: string;
  /** Short explanation under the title; may carry inline markup. */
  intro?: string;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}

/** A card on the lesson page. */
export function Panel({ title, intro, children, className, labelledBy }: PanelProps) {
  return (
    <section className={`${styles.panel} ${className ?? ""}`} aria-labelledby={labelledBy}>
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      {intro ? (
        <p className={styles.intro}>
          <RichText text={intro} />
        </p>
      ) : null}
      {children}
    </section>
  );
}
