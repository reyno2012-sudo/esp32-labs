import type { CSSProperties } from "react";
import styles from "./panels.module.css";

interface StepCaptionProps {
  title: string;
  text: string;
  /** Swatch colour token, e.g. "--copper". */
  token?: `--${string}`;
}

/** A step's title and explanation beside a colour swatch, announced when it changes. */
export function StepCaption({ title, text, token = "--copper" }: StepCaptionProps) {
  return (
    <div
      className={styles.cap}
      aria-live="polite"
      style={{ "--sw": `var(${token})` } as CSSProperties}
    >
      <span className={styles.sw} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
