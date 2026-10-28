import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Glossary } from "@/domain/code/glossary";
import type { Settings } from "@/features/settings/settings";
import { useReducedMotion } from "@/lib/media";
import styles from "./CodeView.module.css";
import type { CodeFile } from "./lab-code";

export interface CodeViewProps {
  file: CodeFile;
  glossary: Glossary;
  settings: Settings;
  /** The tour stop's lines: lit, with everything else dimmed. */
  spotlight?: { readonly start: number; readonly end: number } | null;
  /** The line the line-by-line player is on. */
  cursor?: number | null;
  /** The line open in the line lens. */
  selected?: number | null;
  /** Glossary ids met for the first time in the spotlight: marked with a dot. */
  fresh?: ReadonlySet<string>;
  onLine: (line: number) => void;
  onTerm: (id: string, line: number) => void;
  /** Accessible name of the code region. */
  label: string;
  /** When set, only words on these lines are underlined (the Simple view keeps the rest calm). */
  termsIn?: { readonly start: number; readonly end: number } | null;
}


/**
 * The code itself: coloured, numbered, every line a button that opens the line lens, every known
 * word underlined. In a tour a lit band slides to the current stop and the rest of the file dims.
 */
export function CodeView({
  file,
  glossary,
  settings,
  spotlight,
  cursor,
  selected,
  fresh,
  onLine,
  onTerm,
  label,
  termsIn,
}: CodeViewProps) {
  const { t } = useTranslation("code");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<number, HTMLElement>());
  const reduced = useReducedMotion();
  const [openFolds, setOpenFolds] = useState<ReadonlySet<number>>(new Set());
  const { lines, kinds, folds, chapters } = file.analysis;
  const showTerms = settings.hints !== "off";

  // A fold opens by itself when the tour or the lens needs a line inside it.
  const focus = [spotlight?.start, spotlight?.end, cursor, selected].filter(
    (n): n is number => typeof n === "number",
  );
  const closedFolds = settings.fold
    ? folds.filter((f) => !openFolds.has(f.start) && !focus.some((l) => l >= f.start && l <= f.end))
    : [];
  const foldAt = new Map(closedFolds.map((f) => [f.start, f]));
  const hidden = (i: number) => closedFolds.some((f) => i > f.start && i <= f.end);

  // Slide the spotlight band to the stop and bring it into view (DOM measured after layout).
  const target = cursor ?? selected ?? null;
  useLayoutEffect(() => {
    const band = bandRef.current;
    const scroller = scrollRef.current;
    if (!band || !scroller) return;
    const first = spotlight ? lineRefs.current.get(spotlight.start) : undefined;
    const last = spotlight ? lineRefs.current.get(spotlight.end) : undefined;
    if (first && last) {
      const top = first.offsetTop;
      const height = last.offsetTop + last.offsetHeight - top;
      band.style.transform = `translateY(${top}px)`;
      band.style.height = `${height}px`;
      band.dataset.on = "true";
      const fits = height < scroller.clientHeight - 48;
      const goal = fits ? top - Math.max(16, (scroller.clientHeight - height) / 3) : top - 12;
      scroller.scrollTo({ top: Math.max(0, goal), behavior: reduced ? "auto" : "smooth" });
    } else {
      band.dataset.on = "false";
    }
  }, [spotlight, reduced, file.path, closedFolds.length]);

  // Keep the line-by-line cursor or the selected line visible.
  useLayoutEffect(() => {
    if (target === null) return;
    const el = lineRefs.current.get(target);
    const scroller = scrollRef.current;
    if (!el || !scroller) return;
    const top = el.offsetTop;
    if (top < scroller.scrollTop + 24 || top > scroller.scrollTop + scroller.clientHeight - 48) {
      scroller.scrollTo({
        top: Math.max(0, top - scroller.clientHeight / 3),
        behavior: reduced ? "auto" : "smooth",
      });
    }
  }, [target, reduced]);

  const dotted = new Set<string>();
  const style = { "--digits": String(String(lines.length).length) } as CSSProperties;

  return (
    <div
      ref={scrollRef}
      className={styles.scroll}
      data-size={settings.codeSize}
      data-wrap={settings.wrap}
      data-numbers={settings.lineNumbers}
      data-comments={settings.comments}
      data-touring={!!spotlight}
      style={style}
      role="region"
      aria-label={label}
      // Code reads left to right in every language.
      dir="ltr"
      // The scroller holds focusable lines; it is keyboard-scrollable through them.
    >
      <div className={styles.content}>
        <div ref={bandRef} className={styles.band} aria-hidden="true" data-on="false" />
        {lines.map((line, i) => {
          if (hidden(i)) return null;
          const lit = !spotlight || (i >= spotlight.start && i <= spotlight.end);
          const fold = foldAt.get(i);
          if (fold) {
            return (
              <button
                key={`fold-${i}`}
                type="button"
                className={styles.fold}
                onClick={() => setOpenFolds((prev) => new Set(prev).add(fold.start))}
              >
                <span className={styles.num} aria-hidden="true">
                  {i + 1}
                </span>
                {/* The note about the folded lines follows the reader's language. */}
                <span dir="auto">
                  {t(`fold.${fold.what}`, { count: fold.end - fold.start + 1 })}{" "}
                  <u>{t("fold.show")}</u>
                </span>
              </button>
            );
          }
          const termsHere = showTerms && (!termsIn || (i >= termsIn.start && i <= termsIn.end));
          const terms = termsHere ? glossary.annotate(line) : [];
          return (
            <button
              key={i}
              ref={(el) => {
                if (el) lineRefs.current.set(i, el);
                else lineRefs.current.delete(i);
              }}
              type="button"
              className={styles.line}
              data-kind={kinds[i]}
              data-chapter={chapters.has(i) || undefined}
              data-dim={!lit || undefined}
              data-cursor={cursor === i || undefined}
              aria-current={selected === i ? "true" : undefined}
              onClick={(e) => {
                const term = (e.target as HTMLElement).closest<HTMLElement>("[data-term]")?.dataset
                  .term;
                if (term) onTerm(term, i);
                else onLine(i);
              }}
            >
              <span className={styles.num} aria-hidden="true">
                {i + 1}
              </span>
              <code className={styles.code}>
                {line.length === 0 ? " " : null}
                {line.map((t, k) => {
                  const term = terms[k];
                  // A new word gets its dot once, where it first appears in the lit lines.
                  const dot = !!term && lit && !!fresh?.has(term) && !dotted.has(term);
                  if (dot) dotted.add(term);
                  return (
                    <span
                      key={k}
                      className={styles[t.kind]}
                      data-term={term}
                      data-fresh={dot || undefined}
                    >
                      {t.text}
                    </span>
                  );
                })}
              </code>
            </button>
          );
        })}
      </div>
    </div>
  );
}
