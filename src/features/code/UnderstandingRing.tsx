import { useTranslation } from "react-i18next";
import styles from "./panels.module.css";

/** A ring that fills as you read: the share of this lab's own code lines you have walked through. */
export function UnderstandingRing({
  ratio,
  size = 44,
  label,
}: {
  ratio: number;
  size?: number;
  label: string;
}) {
  const { t } = useTranslation("code");
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.round(ratio * 100) / 100;
  return (
    <span
      className={styles.ring}
      role="img"
      aria-label={t("ring.label", { label, value })}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle className={styles.ringTrack} cx={size / 2} cy={size / 2} r={r} />
        <circle
          className={styles.ringFill}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={styles.ringText} aria-hidden="true">
        {t("ring.value", { value })}
      </span>
    </span>
  );
}
