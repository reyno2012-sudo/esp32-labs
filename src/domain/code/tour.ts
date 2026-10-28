import type { Rich } from "@/domain/lesson";
import { type Block, type FileAnalysis, blockOpenedOn } from "./analyze";
import { code, type ExplainContext, type ExplainT, explainLine } from "./explain";
import { lineText } from "./tokenize";
import type { FileTourSpec, QuizSpec } from "./tour-spec";

// A tour is the code read in small stops: a few lines at a time, each with what it does. Labs with
// a hand-written tour (src/content/code/tours.ts) use it; every other file gets one built from the
// code's own structure and comments, so all thirty labs can be read the same way.

export interface TourStop {
  /** Stable across small edits: the file plus the text of the stop's first code line. */
  readonly id: string;
  readonly path: string;
  /** First and last line, 0-based, inclusive. */
  readonly start: number;
  readonly end: number;
  readonly title: string;
  /** What these lines do, in plain words. */
  readonly say: Rich;
  /** The programmer's own comment above the code, as plain text (automatic tours). */
  readonly note?: string;
  readonly deep?: Rich;
  readonly quiz?: QuizSpec;
  /** In the short Beginner tour. */
  readonly essential: boolean;
  /** The section heading ("// ---- Output ----") the stop sits under. */
  readonly chapter?: string;
  readonly source: "written" | "auto";
}

export interface TourProblem {
  readonly path: string;
  readonly message: string;
}

const CLOSER = /^\s*(?:\}\s*;?|\}\s*\/\/.*|\};|#\s*endif\b.*)\s*$/;
/** Functions longer than this are split at the comments inside them. */
const SPLIT_FUNCTION_LINES = 40;
/** Namespaces, classes and structs longer than this get one stop per member instead of one. */
const OPEN_CONTAINER_LINES = 24;

const slug = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 60);

/** Comment lines without their "//", "/*" and "*" markers, keeping line breaks (ASCII drawings). */
export function commentText(file: FileAnalysis, start: number, end: number): string {
  const out: string[] = [];
  for (let i = start; i <= end; i++) {
    const text = lineText(file.lines[i] ?? []).trim();
    out.push(text.replace(/^\/\/\s?|^\/\*+\s?|\*\/$|^\*\s?/g, "").replace(/\s*\*\/$/, ""));
  }
  while (out.length && !out[0]?.trim()) out.shift();
  while (out.length && !out.at(-1)?.trim()) out.pop();
  return out.join("\n");
}

/** Pulls closing-brace-only lines that follow a stop into it, so no lone "}" is left behind. */
function absorbClosers(file: FileAnalysis, end: number): number {
  let e = end;
  for (let i = end + 1; i < file.lines.length; i++) {
    if (file.kinds[i] === "blank") continue;
    if (!CLOSER.test(lineText(file.lines[i] ?? []))) break;
    e = i;
  }
  return e;
}

/** Resolves a hand-written file tour against the current code. Missing anchors become problems. */
export function writtenStops(
  spec: FileTourSpec,
  file: FileAnalysis,
): { stops: TourStop[]; problems: TourProblem[] } {
  const stops: TourStop[] = [];
  const problems: TourProblem[] = [];
  const texts = file.lines.map(lineText);
  const find = (needle: string, from: number) => {
    for (let i = from; i < texts.length; i++) if (texts[i]?.includes(needle)) return i;
    return -1;
  };
  let from = 0;
  for (const spec_ of spec.stops) {
    const start = find(spec_.at, from);
    if (start < 0) {
      problems.push({
        path: spec.path,
        message: `anchor not found after line ${from + 1}: “${spec_.at}”`,
      });
      continue;
    }
    let end: number;
    if (spec_.to !== undefined) {
      const found = find(spec_.to, start);
      if (found < 0)
        problems.push({
          path: spec.path,
          message: `end anchor not found after line ${start + 1}: “${spec_.to}”`,
        });
      end = found < 0 ? start : found;
    } else {
      // A comment directly above a block covers the block too.
      let first = start;
      while (file.kinds[first] === "comment" && first + 1 < texts.length) first++;
      const block =
        blockOpenedOn(file, first) ??
        file.blocks.find((b) => b.start === first && b.kind !== "data");
      end = block ? block.end : first;
    }
    end = absorbClosers(file, end);
    stops.push({
      id: `${spec.path}#${slug(texts[start] ?? "")}`,
      path: spec.path,
      start,
      end,
      title: spec_.title,
      say: spec_.say,
      ...(spec_.deep ? { deep: spec_.deep } : {}),
      ...(spec_.quiz ? { quiz: spec_.quiz } : {}),
      essential: spec_.essential ?? true,
      ...chapterAt(file, start),
      source: "written",
    });
    from = start + 1;
  }
  return { stops, problems };
}

function chapterAt(file: FileAnalysis, line: number): { chapter?: string } {
  let chapter: string | undefined;
  for (const [at, title] of file.chapters) if (at <= line) chapter = title;
  return chapter ? { chapter } : {};
}

// ---- Automatic tours ---------------------------------------------------------------------------

interface Item {
  readonly start: number;
  readonly end: number;
  readonly kind: "blank" | "comment" | "chapter" | "code";
  readonly block?: Block;
}

/** The direct children of a range: comment runs, blank lines, and whole statements or blocks. */
function itemsIn(file: FileAnalysis, from: number, to: number): Item[] {
  const items: Item[] = [];
  let i = from;
  while (i <= to) {
    const kind = file.kinds[i];
    if (kind === "blank") {
      items.push({ start: i, end: i, kind: "blank" });
      i++;
    } else if (kind === "comment") {
      if (file.chapters.has(i)) {
        items.push({ start: i, end: i, kind: "chapter" });
        i++;
        continue;
      }
      let j = i;
      while (j + 1 <= to && file.kinds[j + 1] === "comment" && !file.chapters.has(j + 1)) j++;
      items.push({ start: i, end: j, kind: "comment" });
      i = j + 1;
    } else {
      const stmt = file.statements[file.statementOf[i] ?? -1];
      const block = stmt?.opens ?? blockOpenedOn(file, i);
      let end = Math.max(i, stmt?.end ?? i);
      if (block && block.kind !== "data") end = Math.max(end, block.end);
      // A line can hold the start of the next statement after a "}"; take its block too.
      end = Math.min(to, end);
      items.push({
        start: i,
        end,
        kind: "code",
        ...(block && block.kind !== "data" ? { block } : {}),
      });
      i = end + 1;
    }
  }
  return items;
}

const isContainer = (b: Block | undefined) =>
  !!b &&
  (b.kind === "namespace" ||
    ((b.kind === "class" || b.kind === "struct") && b.end - b.open > OPEN_CONTAINER_LINES));

function titleFor(
  t: ExplainT,
  file: FileAnalysis,
  codeItems: readonly Item[],
  note: string | undefined,
): string {
  const first = codeItems[0];
  const b = first?.block;
  if (codeItems.length === 1 && b) {
    if (b.kind === "function") {
      if (b.name === "setup" && b.depth === 0) return t("autoTour.setup");
      if (b.name === "loop" && b.depth === 0) return t("autoTour.loop");
      if (/~/.test(b.header))
        return t("autoTour.destructor", { name: b.name.split("::").at(-1) ?? "" });
      return `${b.name.split("::").at(-1)}()`;
    }
    if (b.kind === "struct" || b.kind === "class" || b.kind === "enum")
      return `${b.kind === "enum" ? "enum" : b.kind} ${b.name}`;
    if (b.kind === "namespace")
      return b.name ? `namespace ${b.name}` : t("autoTour.privatePart");
  }
  if (note) {
    const sentence = note.split(/[.:\n]/)[0]?.trim() ?? "";
    if (sentence && sentence.split(/\s+/).length <= 7) return sentence;
  }
  const texts = codeItems.map(
    (it) => file.statements[file.statementOf[it.start] ?? -1]?.text ?? "",
  );
  if (texts.every((t) => /^#\s*include/.test(t))) return t("autoTour.libraries");
  if (texts.every((t) => /^#\s*(?:pragma|include)/.test(t))) return t("autoTour.setupLines");
  if (texts.every((t) => /^(?:static\s+)?(?:constexpr|const)\b/.test(t) || /^#\s*define/.test(t)))
    return t("autoTour.fixedSettings");
  if (note) {
    const sentence = note.split(/[.:\n]/)[0]?.trim() ?? "";
    const words = sentence.split(/\s+/);
    if (sentence && words.length <= 7) return sentence;
    if (sentence) return `${words.slice(0, 6).join(" ")}…`;
  }
  return (
    lineText(file.lines[first?.start ?? 0] ?? [])
      .trim()
      .replace(/\s*[{;]\s*$/, "")
      .slice(0, 40) || t("autoTour.moreCode")
  );
}

function sayFor(ctx: ExplainContext, codeItems: readonly Item[]): Rich {
  const { file, t } = ctx;
  const texts = codeItems.map(
    (it) => file.statements[file.statementOf[it.start] ?? -1]?.text ?? "",
  );
  if (codeItems.length > 1 && texts.every((t) => /^#\s*include/.test(t))) {
    const names = texts.map((t) => /[<"]([^>"]+)[>"]/.exec(t)?.[1] ?? t);
    return t("autoTour.includes", { count: names.length, names: names.map(code).join(", ") });
  }
  if (codeItems.length > 2 && texts.every((t) => /^(?:static\s+)?(?:constexpr|const)\b/.test(t))) {
    const names = texts
      .map((t) => /(\w+)\s*(?:\[[^\]]*\])?\s*=/.exec(t)?.[1] ?? "")
      .filter(Boolean);
    return t("autoTour.constants", { count: names.length, names: names.map(code).join(", ") });
  }
  const first = codeItems[0];
  if (!first) return "";
  const said = explainLine(ctx, first.start).text;
  const b = first.block;
  if (b?.kind === "function" && b.calls.length) {
    const ours = b.calls.filter((c) => ctx.defined.get(c)?.kind === "function").slice(0, 4);
    if (ours.length)
      return t("autoTour.alongTheWay", {
        said,
        names: ours.map((c) => code(`${c}()`)).join(", "),
      });
  }
  return said;
}

/** Builds the tour of one file from its comments and structure. */
export function autoStops(
  path: string,
  ctx: ExplainContext,
  options: { lab: boolean },
): TourStop[] {
  const { file, t } = ctx;
  const stops: TourStop[] = [];
  const ids = new Set<string>();
  let chapter: string | undefined;

  const emit = (
    from: number,
    end: number,
    codeItems: Item[],
    note: string | undefined,
    header = false,
  ) => {
    if (codeItems.length === 0 && !note) return;
    const start = leadIn !== null ? Math.min(leadIn, from) : from;
    leadIn = null;
    const firstCode = codeItems[0]?.start ?? start;
    let id = `${path}#${slug(lineText(file.lines[firstCode] ?? []))}`;
    for (let n = 2; ids.has(id); n++)
      id = `${path}#${slug(lineText(file.lines[firstCode] ?? []))}~${n}`;
    ids.add(id);
    const b = codeItems.length === 1 ? codeItems[0]?.block : undefined;
    const keyFunction =
      b?.kind === "function" && b.depth === 0 && (b.name === "setup" || b.name === "loop");
    const shape = !!b && b.kind !== "namespace";
    const essential = header || keyFunction || (options.lab && shape && !!note);
    stops.push({
      id,
      path,
      start,
      end: absorbClosers(file, end),
      title: header ? t("autoTour.aboutFile") : titleFor(t, file, codeItems, note),
      say: codeItems.length ? sayFor(ctx, codeItems) : t("autoTour.aboutSay"),
      ...(note ? { note } : {}),
      essential,
      ...(chapter ? { chapter } : {}),
      source: "auto",
    });
  };

  const walk = (from: number, to: number, depth: number) => {
    let note: { start: number; end: number } | null = null;
    let group: Item[] = [];
    const flush = () => {
      if (group.length) {
        const start = note ? note.start : (group[0]?.start ?? 0);
        emit(
          start,
          group.at(-1)?.end ?? start,
          group,
          note ? commentText(file, note.start, note.end) : undefined,
        );
      }
      group = [];
      note = null;
    };
    const items = itemsIn(file, from, to);
    items.forEach((item, k) => {
      if (item.kind === "chapter") {
        flush();
        chapter = file.chapters.get(item.start);
        return;
      }
      if (item.kind === "blank") {
        if (group.length) flush();
        return;
      }
      if (item.kind === "comment") {
        if (group.length) flush();
        // The first comment of a file, standing alone, is the file's own introduction.
        const isHeader =
          depth === 0 && stops.length === 0 && items.slice(0, k).every((x) => x.kind === "blank");
        const nextIsCode = items[k + 1]?.kind === "code";
        if (isHeader && !nextIsCode) {
          emit(item.start, item.end, [], commentText(file, item.start, item.end), true);
          return;
        }
        if (isHeader) {
          // Header straight above the includes: one stop, introduced by the header.
          note = { start: item.start, end: item.end };
          const run: Item[] = [];
          for (
            let j = k + 1;
            j < items.length && items[j]?.kind === "code" && !items[j]?.block;
            j++
          )
            run.push(items[j] as Item);
          if (run.length) {
            emit(
              item.start,
              run.at(-1)?.end ?? item.end,
              run,
              commentText(file, item.start, item.end),
              true,
            );
            note = null;
            skipUntil = run.at(-1)?.end ?? -1;
          }
          return;
        }
        note = { start: item.start, end: item.end };
        return;
      }
      if (item.start <= skipUntil) return;
      const b = item.block;
      if (isContainer(b) && b && depth < 2) {
        const pending = note;
        flush();
        if (b.kind === "namespace" && !pending) {
          // "namespace {" alone says little: it joins the first stop inside.
          leadIn = item.start;
        } else {
          // A class or struct (or a commented namespace): a stop for its first line, then its members.
          emit(
            pending ? pending.start : item.start,
            b.open,
            [{ ...item, end: b.open }],
            pending ? commentText(file, pending.start, pending.end) : undefined,
          );
        }
        walk(b.open + 1, b.end - 1, depth + 1);
        return;
      }
      if (b?.kind === "function" && b.end - b.open > SPLIT_FUNCTION_LINES && depth < 3) {
        const pending = note;
        flush();
        splitFunction(b, pending);
        return;
      }
      group.push(item);
    });
    flush();
  };

  let skipUntil = -1;
  let leadIn: number | null = null;

  /** A long function: the header with its comment, then one stop per commented step inside. */
  const splitFunction = (b: Block, pending: { start: number; end: number } | null) => {
    const inner = itemsIn(file, b.open + 1, b.end - 1);
    const firstComment = inner.find((x) => x.kind === "comment" && x.start > b.open + 1);
    const headEnd = firstComment ? firstComment.start - 1 : b.end;
    const headItem: Item = { start: b.start, end: headEnd, kind: "code", block: b };
    emit(
      pending ? pending.start : b.start,
      headEnd,
      [headItem],
      pending ? commentText(file, pending.start, pending.end) : undefined,
    );
    const stopIndex = stops.length - 1;
    let note: { start: number; end: number } | null = null;
    let group: Item[] = [];
    const flush = () => {
      if (group.length)
        emit(
          note ? note.start : (group[0]?.start ?? 0),
          group.at(-1)?.end ?? 0,
          group,
          note ? commentText(file, note.start, note.end) : undefined,
        );
      group = [];
      note = null;
    };
    for (const item of inner) {
      if (item.end <= headEnd) continue;
      if (item.kind === "comment") {
        flush();
        note = { start: item.start, end: item.end };
      } else if (item.kind === "code") group.push(item);
    }
    flush();
    // The header stop is a title page for the steps that follow: name it after the function.
    const head = stops[stopIndex];
    if (head)
      stops[stopIndex] = {
        ...head,
        title: titleFor(t, file, [{ ...headItem, end: b.end }], head.note),
      };
  };

  walk(0, file.lines.length - 1, 0);
  if (!options.lab) return stops;
  // The main story: what setup() and loop() call directly is worth the short tour too.
  const story = new Set(
    file.blocks
      .filter(
        (b) => b.kind === "function" && b.depth === 0 && (b.name === "setup" || b.name === "loop"),
      )
      .flatMap((b) => b.calls),
  );
  return stops.map((s) => {
    const b = file.blocks.find(
      (x) => x.kind === "function" && x.start >= s.start && x.start <= s.end,
    );
    return !s.essential && b && story.has(b.name.split("::").at(-1) ?? "")
      ? { ...s, essential: true }
      : s;
  });
}

/** Lines that hold code (not blank, not only a comment). */
export const codeLines = (file: FileAnalysis) =>
  file.kinds.flatMap((k, i) => (k === "code" || k === "preproc" ? [i] : []));

/** Lines no stop covers, ignoring blank lines and section headings. */
export function uncovered(file: FileAnalysis, stops: readonly TourStop[]): number[] {
  const covered = new Uint8Array(file.lines.length);
  for (const s of stops) covered.fill(1, s.start, s.end + 1);
  return file.kinds.flatMap((k, i) =>
    k !== "blank" && !file.chapters.has(i) && !covered[i] ? [i] : [],
  );
}
