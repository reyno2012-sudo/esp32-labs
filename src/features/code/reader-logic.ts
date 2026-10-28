import type { Glossary } from "@/domain/code/glossary";
import type { TourStop } from "@/domain/code/tour";
import type { CodeFile } from "./lab-code";

// Pure helpers for the reader: which words a stop introduces, which lines the player visits.

/** Glossary ids on the lines of a span, in order of first appearance. */
export function wordsIn(file: CodeFile, glossary: Glossary, start: number, end: number): string[] {
  const out: string[] = [];
  for (let i = start; i <= end; i++) {
    for (const id of glossary.find(file.analysis.lines[i] ?? []))
      if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Words of a stop you have not met yet, at most `max`, so a stop never introduces too many. */
export function freshWords(
  file: CodeFile,
  glossary: Glossary,
  stop: TourStop,
  met: Readonly<Record<string, number>>,
  max = 3,
): string[] {
  return wordsIn(file, glossary, stop.start, stop.end)
    .filter((id) => !met[id])
    .slice(0, max);
}

/** Lines the line-by-line player stops on: code lines that start something (not blanks, not continuations). */
export function playableLines(file: CodeFile, start: number, end: number): number[] {
  const { kinds, statementOf, statements } = file.analysis;
  const out: number[] = [];
  for (let i = start; i <= end; i++) {
    const kind = kinds[i];
    if (kind === "blank" || kind === "comment") continue;
    const stmt = statements[statementOf[i] ?? -1];
    if (stmt && stmt.start < i && !stmt.closes) continue;
    // A lone "}" of an if or a loop says little; the end of a function is worth a word.
    const next = statements[(statementOf[i] ?? -1) + 1];
    const alone = stmt?.closes && !(next && next.start === i);
    if (alone && stmt.closes?.kind !== "function") continue;
    out.push(i);
  }
  return out;
}

/** The next playable line after `from` in a direction, or null at either end. */
export function stepLine(
  lines: readonly number[],
  from: number | null,
  direction: 1 | -1,
): number | null {
  if (lines.length === 0) return null;
  if (from === null) return direction === 1 ? (lines[0] ?? null) : (lines.at(-1) ?? null);
  const at = lines.indexOf(from);
  const next =
    at < 0 ? lines.find((l) => (direction === 1 ? l > from : l < from)) : lines[at + direction];
  return next ?? null;
}
