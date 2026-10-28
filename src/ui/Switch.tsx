import { useId } from "react";
import styles from "./Switch.module.css";

/** An on/off setting: a labelled switch with an optional line of explanation. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <div className={styles.row}>
      <span className={styles.text}>
        <span id={`${id}-label`} className={styles.label}>
          {label}
        </span>
        {hint ? (
          <span id={`${id}-hint`} className={styles.hint}>
            {hint}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
}
