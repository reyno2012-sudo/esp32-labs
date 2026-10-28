import { Trans, useTranslation } from "react-i18next";
import type { ResolvedLesson } from "@/domain/lesson";
import { BoardPinout } from "./BoardPinout";
import styles from "./BoardCard.module.css";

const LEGEND = [
  ["--copper", "used"],
  ["--pad", "safe"],
  ["--danger", "avoid"],
  ["--power", "power"],
  ["--gnd", "ground"],
  ["--w-btn", "button"],
  ["--rfid", "rfid"],
] as const;

const BETWEEN = ["unplug", "rewire", "check", "flash"] as const;

/** The left column: live pinout, legend and the between-lessons routine. */
export function BoardCard({ lesson }: { lesson: ResolvedLesson | null }) {
  const { t } = useTranslation();
  return (
    <section id="sec-board" tabIndex={-1} className={styles.card} aria-label={t("board.label")}>
      <BoardPinout
        pins={lesson?.pins ?? []}
        usb={Boolean(lesson?.usb || lesson?.preview)}
        boot={Boolean(lesson?.boot)}
      />
      <ul className={styles.legend} aria-label={t("board.legend.label")}>
        {LEGEND.map(([color, key]) => (
          <li key={key}>
            <i style={{ background: `var(${color})` }} aria-hidden="true" />
            {t(`board.legend.${key}`)}
          </li>
        ))}
      </ul>
      <details className={styles.between} open>
        <summary>{t("board.between.title")}</summary>
        <ol>
          <li>
            <Trans t={t} i18nKey="board.between.close" components={{ code: <code /> }} />
          </li>
          {BETWEEN.map((step) => (
            <li key={step}>{t(`board.between.${step}`)}</li>
          ))}
        </ol>
        <p>
          <Trans t={t} i18nKey="board.between.warning" components={{ code: <code /> }} />
        </p>
      </details>
    </section>
  );
}
