import { useTranslation } from "react-i18next";
import styles from "./reader.module.css";

export interface StepMark {
  readonly id: string;
  readonly label: string;
  readonly seen: boolean;
  /** Marks where a new act or chapter starts (a small gap before it). */
  readonly opens?: boolean;
}

interface StepBarProps {
  index: number;
  marks: readonly StepMark[];
  /** "stop" or "scene", for the Simple view's "Stop 3 of 9". */
  noun: "stop" | "scene";
  simple: boolean;
  done?: boolean;
  onGo: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Back, where you are, Next. Full view: one mark per step (tap to jump). Simple view: just
 * "Stop 3 of 9" between two big buttons.
 */
export function StepBar({
  index,
  marks,
  noun,
  simple,
  done = false,
  onGo,
  onPrev,
  onNext,
}: StepBarProps) {
  const { t } = useTranslation("code");
  const last = index >= marks.length - 1;
  return (
    <nav className={styles.stepBar} aria-label={t(`steps.${noun}.nav`)}>
      <button
        type="button"
        className={styles.secondary}
        onClick={onPrev}
        disabled={index === 0 && !done}
      >
        {t("steps.back")}
      </button>
      {simple ? (
        <p className={styles.count} aria-live="polite">
          {done
            ? t("steps.allDone")
            : t(`steps.${noun}.count`, { index: index + 1, count: marks.length })}
        </p>
      ) : (
        <ol className={styles.dots}>
          {marks.map((m, i) => (
            <li key={m.id} data-opens={m.opens || undefined}>
              <button
                type="button"
                aria-label={t(`steps.${noun}.mark`, { index: i + 1, label: m.label })}
                aria-current={i === index && !done ? "step" : undefined}
                data-seen={m.seen || undefined}
                onClick={() => onGo(i)}
              />
            </li>
          ))}
        </ol>
      )}
      <button type="button" className={styles.primary} onClick={onNext} disabled={done}>
        {last ? t("steps.finish") : t("steps.next")}
      </button>
    </nav>
  );
}
