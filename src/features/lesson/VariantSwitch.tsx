import { useTranslation } from "react-i18next";
import type { LessonVariant } from "@/domain/lesson";
import styles from "./VariantSwitch.module.css";

/** Picks one variation of a lesson (e.g. BOOT only vs push button). */
export function VariantSwitch({
  variants,
  current,
  onChange,
}: {
  variants: readonly LessonVariant[];
  current?: string;
  onChange: (key: string) => void;
}) {
  const { t } = useTranslation("lesson");
  return (
    <div className={styles.variants} role="group" aria-label={t("variants.label")}>
      {variants.map((v) => (
        <button
          key={v.key}
          type="button"
          aria-pressed={v.key === current}
          onClick={() => onChange(v.key)}
        >
          <b>{v.label}</b>
          <span>{v.short}</span>
        </button>
      ))}
    </div>
  );
}
