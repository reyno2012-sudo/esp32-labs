import { useTranslation } from "react-i18next";
import type { GlossaryEntry } from "@/domain/code/glossary";
import type { Level } from "@/features/settings/settings";
import { RichText } from "@/ui/RichText";
import styles from "./panels.module.css";

/** One phrasebook word: what it is, an everyday picture, the precise story, an example. */
export function TermCard({
  entry,
  level,
  onClose,
}: {
  entry: GlossaryEntry;
  level: Level;
  onClose?: () => void;
}) {
  const { t } = useTranslation("code");
  return (
    <article className={styles.term} aria-label={t("term.label", { term: entry.term })}>
      <header className={styles.termHead}>
        <code className={styles.termWord}>{entry.term}</code>
        <span className={styles.termKind}>{entry.kind === "language" ? "C++" : t("term.library")}</span>
        {onClose ? (
          <button type="button" className={styles.close} onClick={onClose} aria-label={t("term.close")}>
            ×
          </button>
        ) : null}
      </header>
      <p className={styles.termShort}>
        <RichText text={entry.short} />
      </p>
      {entry.simple && level !== "deep" ? (
        <p className={styles.termSimple}>
          <RichText text={entry.simple} />
        </p>
      ) : null}
      {entry.deep && level === "deep" ? (
        <p className={styles.termDeep}>
          <RichText text={entry.deep} />
        </p>
      ) : entry.deep ? (
        <details className={styles.more}>
          <summary>{t("term.precise")}</summary>
          <p>
            <RichText text={entry.deep} />
          </p>
        </details>
      ) : null}
      {entry.example ? <pre className={styles.example} dir="ltr">{entry.example}</pre> : null}
    </article>
  );
}

/** Small tappable chips for words. */
export function TermChips({
  ids,
  entries,
  onPick,
  label,
}: {
  ids: readonly string[];
  entries: ReadonlyMap<string, GlossaryEntry>;
  onPick: (id: string) => void;
  label: string;
}) {
  const known = ids.flatMap((id) => {
    const e = entries.get(id);
    return e ? [e] : [];
  });
  if (!known.length) return null;
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {known.map((e) => (
        <button key={e.id} type="button" className={styles.chip} onClick={() => onPick(e.id)}>
          <code>{e.term}</code>
        </button>
      ))}
    </div>
  );
}
