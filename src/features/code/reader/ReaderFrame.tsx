import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Span } from "@/domain/code/analyze";
import { codeProgress } from "../code-progress";
import { CodeView } from "../CodeView";
import type { CodeFile } from "../lab-code";
import { useReader } from "./reader-context";
import styles from "./reader.module.css";
import { type MapSlot, SidePanel } from "./SidePanel";
import { Toolbar } from "./Toolbar";

interface ReaderFrameProps {
  file: CodeFile;
  /** The lines the mode is talking about: lit, the rest dimmed. */
  spotlight?: Span | null;
  /** The line-by-line player's line. */
  cursor?: number | null;
  /** Words the current stop introduces (marked in the code). */
  fresh?: readonly string[];
  /** The mode's explanation card. */
  guide: ReactNode;
  /** The mode's bottom row (navigation). */
  bar: ReactNode;
  /** Something floating over the code (a new-word card). */
  pop?: ReactNode;
  /** Replaces the Map tab (the story shows its storyline there). */
  map?: MapSlot;
  /** What picking another file does; defaults to opening it here. */
  onPickFile?: (path: string) => void;
}

/** The layout every mode shares: toolbar, code, explanation panel and bottom bar. */
export function ReaderFrame({
  file,
  spotlight,
  cursor,
  fresh,
  guide,
  bar,
  pop,
  map,
  onPickFile,
}: ReaderFrameProps) {
  const { t } = useTranslation("code");
  const reader = useReader();
  const { lab, settings, simple } = reader;
  const selected = reader.selected?.path === file.path ? reader.selected.line : null;
  return (
    <>
      <Toolbar file={file} onPickFile={onPickFile ?? ((path) => reader.openFile(path))} />
      <div className={styles.body} data-sheet={reader.sheetOpen ? "open" : "closed"}>
        <div className={styles.codePane}>
          <CodeView
            file={file}
            glossary={lab.glossary}
            settings={settings}
            spotlight={spotlight ?? null}
            cursor={cursor ?? null}
            selected={selected}
            fresh={new Set(fresh)}
            termsIn={simple ? (spotlight ?? null) : null}
            onLine={(line) => reader.selectLine(file.path, line)}
            onTerm={(id, line) => {
              reader.pickWord(id);
              codeProgress.readLines(lab.env, file.path, [line]);
            }}
            label={t("reader.codeLabel", { name: file.name, count: file.analysis.lines.length })}
          />
          {pop}
        </div>
        <SidePanel file={file} guide={guide} map={map} />
      </div>
      <div className={styles.bar}>{bar}</div>
    </>
  );
}
