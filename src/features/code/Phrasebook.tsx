import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { GlossaryEntry, GlossaryTopic } from "@/domain/code/glossary";
import type { Level } from "@/features/settings/settings";
import styles from "./panels.module.css";
import { TermCard } from "./TermCard";

interface PhrasebookProps {
  entries: readonly GlossaryEntry[];
  topics: Readonly<Record<GlossaryTopic, { title: string; blurb: string }>>;
  met: Readonly<Record<string, number>>;
  /** Words in the open file: offered first. */
  here: ReadonlySet<string>;
  level: Level;
  picked: string | null;
  onPick: (id: string | null) => void;
}

/** Every C++ word and library call explained, grouped by topic, with the ones you met lit up. */
export function Phrasebook({ entries, topics, met, here, level, picked, onPick }: PhrasebookProps) {
  const { t } = useTranslation("code");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"here" | "all">("here");
  const q = query.trim().toLowerCase();
  const visible = entries.filter(
    (e) =>
      (scope === "all" || here.has(e.id) || q) &&
      (!q || e.term.toLowerCase().includes(q) || e.short.toLowerCase().includes(q)),
  );
  const metCount = entries.filter((e) => met[e.id]).length;
  const pickedEntry = picked ? entries.find((e) => e.id === picked) : undefined;
  const byTopic = new Map<GlossaryTopic, GlossaryEntry[]>();
  for (const e of visible) byTopic.set(e.topic, [...(byTopic.get(e.topic) ?? []), e]);

  return (
    <div className={styles.book}>
      <p className={styles.bookHead}>
        <Trans
          t={t}
          i18nKey="book.met"
          values={{ met: metCount }}
          count={entries.length}
          components={{ b: <b /> }}
        />
        <span className={styles.meter} aria-hidden="true">
          <span style={{ width: `${(metCount / Math.max(1, entries.length)) * 100}%` }} />
        </span>
      </p>
      {pickedEntry ? (
        <TermCard entry={pickedEntry} level={level} onClose={() => onPick(null)} />
      ) : null}
      <div className={styles.bookTools}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("book.find")}
          aria-label={t("book.find")}
          className={styles.search}
        />
        <div className={styles.scope} role="group" aria-label={t("book.scope")}>
          <button type="button" aria-pressed={scope === "here"} onClick={() => setScope("here")}>
            {t("book.here")}
          </button>
          <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
            {t("book.all")}
          </button>
        </div>
      </div>
      {visible.length === 0 ? <p className={styles.hint}>{t("book.none")}</p> : null}
      {[...byTopic].map(([topic, list]) => (
        <section key={topic} className={styles.topic} aria-label={topics[topic].title}>
          <h4>{topics[topic].title}</h4>
          <p className={styles.topicBlurb}>{topics[topic].blurb}</p>
          <ul className={styles.words}>
            {list.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={styles.word}
                  data-met={met[e.id] ? true : undefined}
                  aria-pressed={picked === e.id}
                  onClick={() => onPick(e.id)}
                >
                  <code>{e.term}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
