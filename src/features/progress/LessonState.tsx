import { useTranslation } from "react-i18next";
import type { LessonState } from "@/domain/progress";
import { STATE_ORDER } from "./state-info";
import styles from "./LessonState.module.css";

/** The state as a shape: a tick (done), a solid pad (works), a ring (built), a dashed ring (planned). */
export function StateGlyph({ state }: { state: LessonState }) {
  return (
    <span className={styles.glyph} data-state={state} aria-hidden="true">
      {state === "done" ? (
        <svg viewBox="0 0 12 12" width="100%" height="100%">
          <path d="M3 6.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : null}
    </span>
  );
}

/** Glyph plus words, for headers and cards. */
export function StateBadge({ state }: { state: LessonState }) {
  const { t } = useTranslation();
  return (
    <span className={styles.badge} data-state={state} title={t(`states.${state}.hint`)}>
      <StateGlyph state={state} />
      {t(`states.${state}.label`)}
    </span>
  );
}

/** The key to the glyphs, shown once where many of them appear together. */
export function StateLegend({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <ul className={`${styles.legend} ${className ?? ""}`} aria-label={t("states.legend")}>
      {STATE_ORDER.map((s) => (
        <li key={s}>
          <StateGlyph state={s} />
          {t(`states.${s}.label`)}
        </li>
      ))}
    </ul>
  );
}
