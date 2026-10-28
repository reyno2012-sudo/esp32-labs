import { useTranslation } from "react-i18next";
import type { CommandStep } from "@/domain/lesson";
import { RichText } from "@/ui/RichText";
import styles from "./CommandsPanel.module.css";

/** "Commands, in order": what to type, where, and what you should see. */
export function CommandsPanel({ commands }: { commands: readonly CommandStep[] }) {
  const { t } = useTranslation("lesson");
  return (
    <ol className={styles.cmds}>
      {commands.map((c, i) => (
        <li key={`${i}-${c.command}`}>
          <div className={styles.head}>
            <code className={styles.prompt} dir="ltr">{c.command}</code>
            <span className={styles.where}>{t(`commands.place.${c.where ?? "serial"}`)}</span>
            <span className={styles.state} data-state={c.card}>
              {/* What should be on, near or connected to the board while it runs. */}
              {t(`commands.state.${c.card}`)}
            </span>
          </div>
          <dl>
            <dt>{t("commands.does")}</dt>
            <dd>
              <RichText text={c.does} />
            </dd>
            <dt>{t("commands.see")}</dt>
            <dd>
              <RichText text={c.see} />
            </dd>
            {c.fix ? (
              <>
                <dt>{t("commands.fix")}</dt>
                <dd>
                  <RichText text={c.fix} />
                </dd>
              </>
            ) : null}
          </dl>
        </li>
      ))}
    </ol>
  );
}
