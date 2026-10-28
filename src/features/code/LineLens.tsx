import { Trans, useTranslation } from "react-i18next";
import type { LineExplanation } from "@/domain/code/explain";
import type { GlossaryEntry } from "@/domain/code/glossary";
import { RichText } from "@/ui/RichText";
import styles from "./panels.module.css";
import { TermChips } from "./TermCard";

interface LineLensProps {
  line: number;
  text: string;
  explanation: LineExplanation;
  wordIds: readonly string[];
  entries: ReadonlyMap<string, GlossaryEntry>;
  onTerm: (id: string) => void;
  onLine: (line: number) => void;
  onJump: (path: string, line: number) => void;
  /** Shown in a tour: go back to the stop's explanation. */
  onBack?: () => void;
}

/** "What does this line do?": the plain sentence, the words on it, and where its names come from. */
export function LineLens({
  line,
  text,
  explanation,
  wordIds,
  entries,
  onTerm,
  onLine,
  onJump,
  onBack,
}: LineLensProps) {
  const { t } = useTranslation("code");
  const { jump, continues } = explanation;
  return (
    <article className={styles.card} aria-label={t("lens.label", { line: line + 1 })}>
      <p className={styles.eyebrow}>
        {t("lens.eyebrow", { line: line + 1 })}
        {onBack ? (
          <button type="button" className={styles.back} onClick={onBack}>
            {t("lens.back")}
          </button>
        ) : null}
      </p>
      <pre className={styles.lensCode} dir="ltr">{text.trim() || " "}</pre>
      <p className={styles.say}>
        {explanation.text ? (
          <RichText text={explanation.text} />
        ) : (
          t("lens.empty")
        )}
      </p>
      {continues !== undefined ? (
        <button type="button" className={styles.link} onClick={() => onLine(continues)}>
          {t("lens.readFrom", { line: continues + 1 })}
        </button>
      ) : null}
      {jump ? (
        <button type="button" className={styles.link} onClick={() => onJump(jump.path, jump.line)}>
          <Trans
            t={t}
            i18nKey="lens.definedAt"
            values={{
              name: jump.name,
              file: jump.path.split("/").at(-1) ?? jump.path,
              line: jump.line + 1,
            }}
            components={{ code: <code /> }}
          />
        </button>
      ) : null}
      {wordIds.length ? (
        <div className={styles.fresh}>
          <p className={styles.freshLabel}>{t("lens.words")}</p>
          <TermChips ids={wordIds} entries={entries} onPick={onTerm} label={t("lens.words")} />
        </div>
      ) : null}
    </article>
  );
}
