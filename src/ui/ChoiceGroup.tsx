import type { ReactNode } from "react";
import styles from "./ChoiceGroup.module.css";

export interface Choice<K extends string | number> {
  readonly key: K;
  readonly label: ReactNode;
}

interface ChoiceGroupProps<K extends string | number> {
  /** Accessible name of the group, e.g. "Screen view". */
  label: string;
  choices: readonly Choice<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}

/** A row of mutually exclusive toggle buttons (scene picker, view picker, flow picker). */
export function ChoiceGroup<K extends string | number>({
  label,
  choices,
  value,
  onChange,
  className,
}: ChoiceGroupProps<K>) {
  return (
    <div className={`${styles.group} ${className ?? ""}`} role="group" aria-label={label}>
      {choices.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={c.key === value}
          onClick={() => onChange(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
