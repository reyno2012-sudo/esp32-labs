import type { FileAnalysis } from "@/domain/code/analyze";
import { analyze } from "@/domain/code/analyze";
import {
  type Definition,
  definitionsOf,
  type ExplainContext,
  type ExplainT,
} from "@/domain/code/explain";
import type { Glossary } from "@/domain/code/glossary";
import { buildSymbolIndex, type SymbolIndex } from "@/domain/code/symbols";
import {
  autoStops,
  codeLines,
  type TourProblem,
  type TourStop,
  writtenStops,
} from "@/domain/code/tour";
import type { LabTourSpec } from "@/domain/code/tour-spec";
import type { Rich } from "@/domain/lesson";
import type { EnvProgress } from "./code-progress";
import type { FirmwareEnvDoc } from "./schema";

// One lab's code, ready to read: every file analysed, its tour built (hand-written or automatic),
// and the names defined across the lab so a call can jump to its definition in another file.

export interface CodeFile {
  readonly path: string;
  /** "main.cpp", or "controls/boot_only.cpp" inside the lab folder. */
  readonly name: string;
  readonly role: "lab" | "shared";
  readonly group: string;
  readonly analysis: FileAnalysis;
  readonly stops: readonly TourStop[];
  readonly codeLineCount: number;
}

export interface LabCode {
  readonly env: string;
  readonly bigPicture: Rich;
  readonly files: readonly CodeFile[];
  readonly defined: ReadonlyMap<string, Definition>;
  /** Who calls whom across the lab's files (for the story). */
  readonly symbols: SymbolIndex;
  readonly glossary: Glossary;
  readonly problems: readonly TourProblem[];
  /** The language the automatic tours were written in; line explanations use it too. */
  readonly t: ExplainT;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** A library call's or header's one-line meaning, from the phrasebook. */
const knownFrom = (glossary: Glossary) => (name: string) =>
  glossary.entries.find(
    (e) => e.match.calls?.includes(name) || (e.kind === "api" && e.match.words?.includes(name)),
  )?.short;

function nameOf(path: string, role: "lab" | "shared"): string {
  const parts = path.split("/");
  return role === "lab" ? parts.slice(2).join("/") : (parts.at(-1) ?? path);
}

/** The first paragraph of main.cpp's header comment, in prose. */
function headerSummary(file: CodeFile | undefined): string {
  const header = file?.stops[0]?.note;
  if (!header) return "";
  const paragraph = header.split(/\n\s*\n/)[0] ?? "";
  // Indented lines are commands and drawings ("  uv run pio run ...", "GPIO 4 ──►|──"): skip them.
  return paragraph
    .split("\n")
    .filter((line) => !/^\s{2,}/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildLabCode(
  doc: FirmwareEnvDoc,
  glossary: Glossary,
  tour: LabTourSpec | undefined,
  t: ExplainT,
): LabCode {
  const analysed = doc.files.map((f) => ({ ...f, analysis: analyze(f.text) }));
  const defined = definitionsOf(analysed);
  const known = knownFrom(glossary);
  const problems: TourProblem[] = [];
  const files = analysed.map((f): CodeFile => {
    const ctx: ExplainContext = { file: f.analysis, defined, known, t };
    const spec = tour?.files.find((t) => t.path === f.path);
    let stops: readonly TourStop[];
    if (spec) {
      const written = writtenStops(spec, f.analysis);
      problems.push(...written.problems);
      stops = written.stops;
    } else {
      stops = autoStops(f.path, ctx, { lab: f.role === "lab" });
    }
    return {
      path: f.path,
      name: nameOf(f.path, f.role),
      role: f.role,
      group: f.group,
      analysis: f.analysis,
      stops,
      codeLineCount: codeLines(f.analysis).length,
    };
  });
  const summary = headerSummary(files[0]);
  const bigPicture = tour?.bigPicture ?? esc(summary || doc.about);
  const symbols = buildSymbolIndex(files);
  return { env: doc.env, bigPicture, files, defined, symbols, glossary, problems, t };
}

/** Context for explaining lines of one file of a lab. */
export const explainContext = (lab: LabCode, file: CodeFile): ExplainContext => ({
  file: file.analysis,
  defined: lab.defined,
  known: knownFrom(lab.glossary),
  t: lab.t,
});

/** Stops a level shows: Beginner keeps the essential ones. */
export const stopsFor = (file: CodeFile, level: "beginner" | "explorer" | "deep") =>
  level === "beginner" ? file.stops.filter((s) => s.essential) : file.stops;

/** Share (0..1) of the lab's own code lines you have read through stops or the line lens. */
export function understood(
  lab: LabCode,
  progress: EnvProgress,
): { read: number; total: number; ratio: number } {
  let read = 0;
  let total = 0;
  const visited = new Set(progress.stops);
  for (const f of lab.files) {
    if (f.role !== "lab") continue;
    const covered = new Uint8Array(f.analysis.lines.length);
    for (const s of f.stops) if (visited.has(s.id)) covered.fill(1, s.start, s.end + 1);
    for (const l of progress.lines[f.path] ?? []) covered[l] = 1;
    for (const l of codeLines(f.analysis)) {
      total++;
      if (covered[l]) read++;
    }
  }
  return { read, total, ratio: total ? read / total : 0 };
}
