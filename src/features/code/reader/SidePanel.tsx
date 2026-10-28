import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/use-locale";
import { explainLine } from "@/domain/code/explain";
import { lineText } from "@/domain/code/tokenize";
import { useMetWords } from "../code-progress";
import { CodeMap } from "../CodeMap";
import { codeContentQuery } from "../content-query";
import { type CodeFile, explainContext } from "../lab-code";
import { LineLens } from "../LineLens";
import { Phrasebook } from "../Phrasebook";
import { wordsIn } from "../reader-logic";
import { TermCard } from "../TermCard";
import { type SideTab, useReader } from "./reader-context";
import styles from "./reader.module.css";

export interface MapSlot {
  readonly label: string;
  readonly content: ReactNode;
}

const TABS: readonly SideTab[] = ["guide", "map", "words"];

/**
 * The explanation panel. Full view: Guide (the mode's card, or the line lens), Map (or the mode's
 * own map, e.g. the storyline) and Words. Simple view: just the guide, with a word card on top.
 */
export function SidePanel({
  file,
  guide,
  map,
}: {
  file: CodeFile;
  guide: ReactNode;
  map?: MapSlot | undefined;
}) {
  const { t } = useTranslation("code");
  const reader = useReader();
  const { lab, settings, simple } = reader;
  const { data: content } = useSuspenseQuery(codeContentQuery(useLocale()));
  const met = useMetWords();
  const selected = reader.selected?.path === file.path ? reader.selected.line : null;
  const ctx = explainContext(lab, file);

  const lens =
    selected !== null ? (
      <LineLens
        key={selected}
        line={selected}
        text={lineText(file.analysis.lines[selected] ?? [])}
        explanation={explainLine(ctx, selected)}
        wordIds={wordsIn(file, lab.glossary, selected, selected)}
        entries={lab.glossary.byId}
        onTerm={reader.pickWord}
        onLine={(line) => reader.selectLine(file.path, line)}
        onJump={(path, line) =>
          path === file.path ? reader.selectLine(path, line) : reader.openFile(path, line)
        }
        onBack={reader.clearLine}
      />
    ) : null;
  const word = reader.word ? lab.glossary.byId.get(reader.word) : undefined;
  const tab = simple ? "guide" : reader.side;

  return (
    <aside className={styles.side} aria-label={t("side.label")}>
      <div className={styles.sideHead}>
        {simple ? (
          <p className={styles.sideTitle}>{t("side.title")}</p>
        ) : (
          <div className={styles.tabs} role="group" aria-label={t("side.tabs")}>
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => reader.setSide(id)}
              >
                {id === "map" && map ? map.label : t(`side.tab.${id}`)}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={styles.handle}
          aria-expanded={reader.sheetOpen}
          aria-label={reader.sheetOpen ? t("side.hide") : t("side.show")}
          onClick={reader.toggleSheet}
        >
          {reader.sheetOpen ? "▾" : "▴"}
        </button>
      </div>
      <div className={styles.sideBody}>
        {simple && word ? (
          <TermCard entry={word} level={settings.level} onClose={reader.closeWord} />
        ) : null}
        {tab === "guide" ? (lens ?? guide) : null}
        {tab === "map"
          ? (map?.content ?? (
              <CodeMap lab={lab} file={file} onGo={(path, line) => reader.openFile(path, line)} />
            ))
          : null}
        {tab === "words" ? (
          <Phrasebook
            entries={lab.glossary.entries}
            topics={content.topics}
            met={met}
            here={new Set(wordsIn(file, lab.glossary, 0, file.analysis.lines.length - 1))}
            level={settings.level}
            picked={reader.word}
            onPick={(id) => (id ? reader.pickWord(id) : reader.closeWord())}
          />
        ) : null}
      </div>
    </aside>
  );
}
