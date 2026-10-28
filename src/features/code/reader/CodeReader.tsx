import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { analyze } from "@/domain/code/analyze";
import { useSettings } from "@/features/settings/settings-store";
import { createLogger } from "@/lib/logger";
import { prefersReducedMotion } from "@/lib/media";
import { codeProgress } from "../code-progress";
import type { CodeFile, LabCode } from "../lab-code";
import { modesFor } from "./modes";
import {
  type LineRef,
  type ModeId,
  type Reader,
  ReaderContext,
  type SideTab,
} from "./reader-context";
import styles from "./reader.module.css";

const log = createLogger("code");

/** Stands in for a lab without files, so the modes never deal with "no file". */
const NO_FILE: CodeFile = {
  path: "",
  name: "",
  role: "lab",
  group: "",
  analysis: analyze(""),
  stops: [],
  codeLineCount: 0,
};

/**
 * Reading a lab's code without being thrown in at the deep end. The shell owns what every way
 * of reading shares (URL state, line lens, word card, panel, focus) and hands it to the current
 * mode through ReaderContext; the modes (Tour, Story, Explore) own their own navigation.
 */
export function CodeReader({ lab, lessonHref }: { lab: LabCode; lessonHref: string }) {
  const { t } = useTranslation("code");
  const settings = useSettings();
  const simple = settings.view === "simple";
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<LineRef | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [side, setSide] = useState<SideTab>("guide");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [focus, setFocus] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // The reader is sized to the viewport: bring it fully into view once, so nothing else scrolls.
  useEffect(() => {
    ref.current?.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape" && focus) setFocus(false);
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onEscape(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Its name is the only text it carries (the React Compiler keeps this object per language).
  const noFile: CodeFile = { ...NO_FILE, name: t("reader.noFiles") };
  const modes = modesFor(simple);
  const current = modes.find((m) => m.id === params.get("mode")) ?? modes[0];
  const update = (change: (p: URLSearchParams) => void) =>
    setParams(
      (p) => {
        change(p);
        return p;
      },
      { replace: true, preventScrollReset: true },
    );

  const reader: Reader = {
    lab,
    settings,
    simple,
    params,
    update,
    mode: current?.id ?? "tour",
    switchMode(mode: ModeId, extra = {}) {
      setSelected(null);
      update((p) => {
        p.set("mode", mode);
        for (const [k, v] of Object.entries(extra)) p.set(k, v);
      });
      log.info("reader mode", { env: lab.env, mode });
    },
    file: (path) => lab.files.find((f) => f.path === path) ?? lab.files[0] ?? noFile,
    openFile(path, line) {
      update((p) => {
        p.set("file", path);
        p.delete("stop");
        // A line to show, or a file while the story leads, is a job for Explore (the story's
        // file follows its scene).
        if (line !== undefined || p.get("mode") === "story") p.set("mode", "explore");
      });
      setSelected(line !== undefined ? { path, line } : null);
      if (line !== undefined) codeProgress.readLines(lab.env, path, [line]);
    },
    selected,
    selectLine(path, line) {
      setSelected({ path, line });
      setSide("guide");
      setSheetOpen(true);
      codeProgress.readLines(lab.env, path, [line]);
    },
    clearLine: () => setSelected(null),
    word,
    pickWord(id) {
      setWord(id);
      if (!simple) setSide("words");
      setSheetOpen(true);
      codeProgress.meetWords([id]);
    },
    closeWord: () => setWord(null),
    side,
    setSide(tab) {
      setSide(tab);
      setSheetOpen(true);
    },
    sheetOpen,
    toggleSheet: () => setSheetOpen((o) => !o),
    focus,
    toggleFocus: () => setFocus((f) => !f),
    lessonHref,
  };

  const Mode = current?.Component;
  return (
    <ReaderContext value={reader}>
      <section
        ref={ref}
        className={styles.reader}
        data-focus={focus}
        data-view={settings.view}
        aria-label={t("reader.label", { env: lab.env })}
      >
        {Mode ? <Mode key={current.id} /> : null}
      </section>
    </ReaderContext>
  );
}

/** Holds the reader's place while the code and the phrasebook load. */
export function ReaderSkeleton() {
  const { t } = useTranslation("code");
  return <div className={styles.skeleton} role="status" aria-label={t("reader.loading")} />;
}
