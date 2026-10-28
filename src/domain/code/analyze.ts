import { type Line, lineText, meaningful, type Token, tokenize } from "./tokenize";

// The shape of a source file, computed once per file: what every line is, its statements, which
// brace closes which, and the named blocks (functions, structs, namespaces...). Everything the
// reader explains is derived from this, so it is pure and unit-tested.

export type LineKind = "blank" | "comment" | "preproc" | "code";

export type BlockKind =
  | "function"
  | "lambda"
  | "class"
  | "struct"
  | "enum"
  | "union"
  | "namespace"
  | "if"
  | "else"
  | "for"
  | "while"
  | "do"
  | "switch"
  | "case"
  | "try"
  | "data"
  | "block";

export interface Block {
  readonly kind: BlockKind;
  /** The function, type or namespace name ("" for anonymous ones). */
  readonly name: string;
  /** The statement that opens the block, on one line, without the "{". */
  readonly header: string;
  /** First line of the opening statement (0-based). */
  readonly start: number;
  /** Line of the "{". */
  readonly open: number;
  /** Line of the matching "}". */
  readonly end: number;
  /** How many blocks enclose this one. */
  readonly depth: number;
  /** Functions called inside (function blocks only), in order of first use. */
  readonly calls: readonly string[];
  /** Every call inside (function blocks only), with what it is called on, in order. */
  readonly sites: readonly CallSite[];
}

/** One call in a function body: "lab.begin()" is { name: "begin", receiver: "lab", via: "." }. */
export interface CallSite {
  readonly name: string;
  /** The object, pointer or type before ".", "->" or "::"; "" for a plain call; "?" when it is an expression. */
  readonly receiver: string;
  readonly via: "" | "." | "->" | "::";
  readonly line: number;
}

/** One statement: a declaration, an expression ending in ";", a block header ending in "{", a "}". */
export interface Statement {
  readonly start: number;
  readonly end: number;
  /** Its text on one line, comments dropped, whitespace squeezed. */
  readonly text: string;
  readonly opens?: Block;
  readonly closes?: Block;
}

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface Fold extends Span {
  /** "text": a long multi-line string (an HTML page); "data": a long table of values. */
  readonly what: "text" | "data";
}

export interface FileAnalysis {
  readonly lines: readonly Line[];
  readonly kinds: readonly LineKind[];
  readonly statements: readonly Statement[];
  /** For every line, the statement its first token belongs to (-1 for blank/comment lines). */
  readonly statementOf: readonly number[];
  /** Blocks in order of their opening line. */
  readonly blocks: readonly Block[];
  /** Section headings drawn as comment rules ("// ---- Output ----"), by line. */
  readonly chapters: ReadonlyMap<number, string>;
  readonly folds: readonly Fold[];
}

const CONTROL = new Set(["if", "for", "while", "do", "switch", "try"]);
const TYPE_BLOCKS = new Set(["class", "struct", "enum", "union", "namespace"]);
/** Shorter runs stay unfolded: folding a few lines hides more than it helps. */
export const FOLD_MIN_LINES = 10;
const CHAPTER = /^\/\/\s*[-=─━]{3,}\s*(.+?)\s*[-=─━]*\s*$/;
const squeeze = (tokens: readonly Token[]) =>
  tokens
    .filter((t) => t.kind !== "comment")
    .map((t) => t.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();

function kindOf(line: Line): LineKind {
  const real = line.filter((t) => t.kind !== "space");
  if (real.length === 0) return "blank";
  if (real.every((t) => t.kind === "comment")) return "comment";
  if (real[0]?.kind === "preproc") return "preproc";
  return "code";
}

/** A lambda's "[captures](params) specifiers" at the end of a statement. */
function endsWithLambda(texts: readonly string[]): boolean {
  const close = texts.lastIndexOf("]");
  if (close < 0) return false;
  const after = texts.slice(close + 1);
  if (after.length === 0) return true;
  if (after[0] !== "(") return false;
  const rest = after.slice(after.lastIndexOf(")") + 1);
  return rest.every(
    (t) =>
      t === "mutable" ||
      t === "->" ||
      t === "noexcept" ||
      /^\w+$/.test(t) ||
      t === "::" ||
      t === "*" ||
      t === "&",
  );
}

/** The words not inside (...) or [...]: "f(int x = 2)" has no top-level "=". */
function outsideBrackets(texts: readonly string[]): string[] {
  let depth = 0;
  const out: string[] = [];
  for (const t of texts) {
    if (t === ")" || t === "]") depth = Math.max(0, depth - 1);
    if (depth === 0) out.push(t);
    if (t === "(" || t === "[") depth++;
  }
  return out;
}

/** What a "{" opens, judged from the statement before it. */
export function classifyBlock(header: readonly Token[]): { kind: BlockKind; name: string } {
  const words = header.filter((t) => t.kind !== "space" && t.kind !== "comment");
  const texts = words.map((t) => t.text);
  const first = texts[0] ?? "";
  if (first === "else") return { kind: texts[1] === "if" ? "if" : "else", name: "" };
  if (first === "case" || first === "default") return { kind: "case", name: "" };
  if (first === "catch") return { kind: "try", name: "" };
  if (CONTROL.has(first)) return { kind: first as BlockKind, name: "" };
  if (endsWithLambda(texts)) return { kind: "lambda", name: "" };
  const typeAt = texts.findIndex((t) => TYPE_BLOCKS.has(t));
  if (typeAt >= 0 && !texts.includes("(") && !texts.includes("=")) {
    const kw = texts[typeAt] as "class" | "struct" | "enum" | "union" | "namespace";
    const name =
      texts
        .slice(typeAt + 1)
        .find(
          (t) => /^[A-Za-z_]\w*$/.test(t) && t !== "class" && t !== "struct" && t !== "final",
        ) ?? "";
    return { kind: kw, name };
  }
  // A bare "{" opens a scope (a case body); "= {", "return {" and "Type name{" hold values.
  if (texts.length === 0) return { kind: "block", name: "" };
  if (
    outsideBrackets(texts).includes("=") ||
    first === "return" ||
    [",", "{", "(", "<<"].includes(texts.at(-1) ?? "")
  ) {
    return { kind: "data", name: "" };
  }
  if (!texts.includes("(") && /^[A-Za-z_]\w*$/.test(texts.at(-1) ?? "") && texts.length >= 2) {
    return { kind: "data", name: "" };
  }
  // name(...) [const|override|noexcept|-> T] { — or a constructor's ": member(x)" list.
  const paren = texts.indexOf("(");
  if (paren > 0) {
    const before = words[paren - 1];
    if (
      before &&
      (before.kind === "function" ||
        before.kind === "ident" ||
        before.kind === "type" ||
        before.kind === "constant")
    ) {
      const scope = texts[paren - 2] === "::" ? `${texts[paren - 3] ?? ""}::` : "";
      return { kind: "function", name: `${scope}${before.text}` };
    }
  }
  return { kind: "block", name: "" };
}

type MutableBlock = { -readonly [K in keyof Block]: Block[K] } & {
  calls: string[];
  sites: CallSite[];
};

export function analyze(source: string): FileAnalysis {
  const lines = tokenize(source);
  const kinds = lines.map(kindOf);
  const statements: Statement[] = [];
  const statementOf = lines.map(() => -1);
  const blocks: MutableBlock[] = [];
  const chapters = new Map<number, string>();

  const stack: MutableBlock[] = [];
  // A lambda body is a scope inside an unfinished statement: park the outer statement in a frame,
  // read the body's own statements, then resume the outer one at the lambda's "}".
  const frames: { tokens: Token[]; start: number; parens: number }[] = [];
  let tokens: Token[] = [];
  let start = -1;
  let parens = 0;

  const finish = (end: number, extra: Partial<Pick<Statement, "opens" | "closes">> = {}) => {
    if (start < 0) return;
    statements.push({ start, end, text: squeeze(tokens), ...extra });
    tokens = [];
    start = -1;
    parens = 0;
  };
  const begin = (i: number) => {
    if (start < 0) start = i;
    if (statementOf[i] === -1) statementOf[i] = statements.length;
  };

  lines.forEach((line, i) => {
    const kind = kinds[i];
    if (kind === "comment") {
      const chapter = CHAPTER.exec(lineText(line).trim());
      if (chapter?.[1]) chapters.set(i, chapter[1]);
      return;
    }
    if (kind === "blank") return;
    if (kind === "preproc") {
      finish(i - 1);
      statementOf[i] = statements.length;
      statements.push({ start: i, end: i, text: squeeze(line) });
      return;
    }
    for (const token of line) {
      if (token.kind === "space" || token.kind === "comment") {
        if (start >= 0) tokens.push(token);
        continue;
      }
      if (token.text !== "}") begin(i);
      if (token.kind !== "op") {
        tokens.push(token);
        continue;
      }
      const t = token.text;
      if (t === "(" || t === "[") parens++;
      if (t === ")" || t === "]") parens = Math.max(0, parens - 1);
      if (t === "{") {
        const { kind: bk, name } = classifyBlock(tokens);
        // Inside parentheses a "{" is a braced value, unless it opens a lambda's body.
        const here: BlockKind = parens > 0 && bk !== "lambda" ? "data" : bk;
        const inData = stack.at(-1)?.kind === "data";
        const block: MutableBlock = {
          kind: inData && here !== "lambda" ? "data" : here,
          name,
          header: squeeze(tokens),
          start,
          open: i,
          end: i,
          depth: stack.length,
          calls: [],
          sites: [],
        };
        blocks.push(block);
        stack.push(block);
        tokens.push(token);
        if (block.kind === "lambda") {
          frames.push({ tokens, start, parens });
          tokens = [];
          start = -1;
          parens = 0;
        } else if (block.kind !== "data") {
          // A scope's header is a statement of its own.
          finish(i, { opens: block });
        }
        continue;
      }
      if (t === "}") {
        const open = stack.pop();
        if (open) open.end = i;
        if (open?.kind === "data") {
          begin(i);
          tokens.push(token);
          continue;
        }
        finish(i);
        if (open?.kind === "lambda") {
          const outer = frames.pop();
          if (outer) ({ tokens, start, parens } = outer);
          begin(i);
          tokens.push(token);
          continue;
        }
        begin(i);
        tokens = [token];
        finish(i, open ? { closes: open } : {});
        continue;
      }
      tokens.push(token);
      if (
        (t === ";" && parens === 0) ||
        (t === ":" &&
          parens === 0 &&
          /^(?:case\b|default\b|public|private|protected)/.test(squeeze(tokens)))
      ) {
        finish(i);
      }
    }
  });
  finish(lines.length - 1);

  // Calls made inside each function, attributed to the innermost function around them.
  const functions = blocks.filter((b) => b.kind === "function");
  lines.forEach((line, i) => {
    const owner = functions.filter((f) => i >= f.open && i <= f.end).at(-1);
    if (!owner) return;
    const words = meaningful(line);
    words.forEach((t, k) => {
      if (t.kind !== "function") return;
      const op = words[k - 1]?.text;
      const via = op === "." || op === "->" || op === "::" ? op : "";
      const before = words[k - 2];
      const receiver = !via ? "" : before && /^[A-Za-z_]\w*$/.test(before.text) ? before.text : "?";
      // The function's own name in its header ("void loop()", "void Lab::loop()") or a plain
      // recursion is not a call out; "lab.loop()" inside loop() is.
      const own = t.text === owner.name.split("::").at(-1);
      if (own && (!via || (via === "::" && i <= owner.open))) return;
      owner.sites.push({ name: t.text, receiver, via, line: i });
      if (!owner.calls.includes(t.text)) owner.calls.push(t.text);
    });
  });

  return {
    lines,
    kinds,
    statements,
    statementOf,
    blocks,
    chapters,
    folds: findFolds(lines, blocks),
  };
}

/** Long data tables and runs of multi-line string text (a web page kept in a C string). */
function findFolds(lines: readonly Line[], blocks: readonly Block[]): Fold[] {
  const folds: Fold[] = [];
  for (const b of blocks) {
    const outer = blocks.some(
      (o) =>
        o !== b && o.kind === "data" && o.open <= b.open && o.end >= b.end && o.depth < b.depth,
    );
    if (b.kind === "data" && !outer && b.end - b.open - 1 >= FOLD_MIN_LINES) {
      folds.push({ start: b.open + 1, end: b.end - 1, what: "data" });
    }
  }
  let run = -1;
  const flush = (end: number) => {
    if (run >= 0 && end - run + 1 >= FOLD_MIN_LINES) folds.push({ start: run, end, what: "text" });
    run = -1;
  };
  lines.forEach((line, i) => {
    const real = line.filter((t) => t.kind !== "space");
    const inside =
      real.length > 0 &&
      real.every((t) => t.kind === "string") &&
      !/^(?:u8|[LuU])?R?"/.test(real[0]?.text ?? "");
    if (inside && run < 0) run = i;
    if (!inside) flush(i - 1);
  });
  flush(lines.length - 1);
  return folds.sort((a, b) => a.start - b.start);
}

/** The innermost named function or type whose body holds a line. */
export function ownerOf(file: FileAnalysis, line: number): Block | undefined {
  let best: Block | undefined;
  for (const b of file.blocks) {
    const named =
      b.kind === "function" || b.kind === "struct" || b.kind === "class" || b.kind === "enum";
    if (named && b.open < line && line <= b.end && (!best || b.depth > best.depth)) best = b;
  }
  return best;
}

/** The block a line's "{" opens, if any. */
export const blockOpenedOn = (file: FileAnalysis, line: number) =>
  file.blocks.find((b) => b.open === line && b.kind !== "data");
