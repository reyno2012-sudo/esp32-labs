// A small C++ tokenizer for reading lab code: enough to colour it, find the words worth
// explaining, and see the shape of each line. Not a compiler: it never fails, it just guesses.
// Multi-line tokens (block comments, raw strings) are split so every line holds its own tokens.

export type TokenKind =
  | "comment"
  | "string"
  | "char"
  | "number"
  | "keyword"
  | "type"
  | "preproc"
  | "constant"
  | "function"
  | "ident"
  | "op"
  | "space";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

export type Line = readonly Token[];

export const KEYWORDS = new Set([
  "alignas",
  "alignof",
  "auto",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "consteval",
  "constexpr",
  "constinit",
  "continue",
  "decltype",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "explicit",
  "extern",
  "false",
  "final",
  "for",
  "friend",
  "goto",
  "if",
  "inline",
  "mutable",
  "namespace",
  "new",
  "noexcept",
  "nullptr",
  "operator",
  "override",
  "private",
  "protected",
  "public",
  "return",
  "sizeof",
  "static",
  "static_assert",
  "static_cast",
  "reinterpret_cast",
  "const_cast",
  "dynamic_cast",
  "struct",
  "switch",
  "template",
  "this",
  "throw",
  "true",
  "try",
  "typedef",
  "typename",
  "union",
  "using",
  "virtual",
  "volatile",
  "while",
  "IRAM_ATTR",
  "PROGMEM",
]);

export const BUILTIN_TYPES = new Set([
  "void",
  "bool",
  "char",
  "short",
  "int",
  "long",
  "float",
  "double",
  "signed",
  "unsigned",
  "size_t",
  "int8_t",
  "int16_t",
  "int32_t",
  "int64_t",
  "uint8_t",
  "uint16_t",
  "uint32_t",
  "uint64_t",
  "uintptr_t",
  "intptr_t",
  "ptrdiff_t",
  "String",
  "byte",
  "word",
  "boolean",
]);

const IDENT_START = /[A-Za-z_]/;
const IDENT = /[A-Za-z0-9_]/;
const NUMBER =
  /^(?:0[xX][0-9a-fA-F']+|0[bB][01']+|(?:\d[\d']*\.?[\d']*|\.\d[\d']*)(?:[eE][+-]?\d+)?)[uUlLfF]*/;
const OPERATORS = [
  "<<=",
  ">>=",
  "->*",
  "...",
  "::",
  "->",
  "++",
  "--",
  "<<",
  ">>",
  "<=",
  ">=",
  "==",
  "!=",
  "&&",
  "||",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
];

/** ALL_CAPS macros and kConstants read as constants; Capitalised words as type names. */
function classifyIdent(word: string, next: string): TokenKind {
  if (KEYWORDS.has(word)) return "keyword";
  if (BUILTIN_TYPES.has(word)) return "type";
  if (next === "(") return "function";
  if (/^[A-Z][A-Z0-9_]+$/.test(word) || /^k[A-Z]/.test(word)) return "constant";
  if (/^[A-Z][a-z0-9]/.test(word) && !/_$/.test(word)) return "type";
  return "ident";
}

/** Splits source text into lines of tokens. Joining every token's text gives the line back. */
export function tokenize(source: string): Line[] {
  const text = source.replace(/\r\n?/g, "\n");
  const lines: Token[][] = [[]];
  const push = (kind: TokenKind, value: string) => {
    const parts = value.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines.at(-1)?.push({ kind, text: part });
    });
  };

  let i = 0;
  let lineStart = true; // only whitespace so far on this line (for "#" directives)
  while (i < text.length) {
    const c = text[i] ?? "";
    const rest = () => text.slice(i);

    if (c === "\n") {
      lines.push([]);
      i++;
      lineStart = true;
      continue;
    }
    if (c === " " || c === "\t") {
      let j = i;
      while (text[j] === " " || text[j] === "\t") j++;
      push("space", text.slice(i, j));
      i = j;
      continue;
    }
    if (text.startsWith("//", i)) {
      const end = text.indexOf("\n", i);
      const j = end < 0 ? text.length : end;
      push("comment", text.slice(i, j));
      i = j;
      lineStart = false;
      continue;
    }
    if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      const j = end < 0 ? text.length : end + 2;
      push("comment", text.slice(i, j));
      i = j;
      lineStart = false;
      continue;
    }
    if (c === "#" && lineStart) {
      const directive = /^#\s*[a-z]+/.exec(rest())?.[0] ?? "#";
      push("preproc", directive);
      i += directive.length;
      lineStart = false;
      // #include <path>: the path is one string-like token.
      if (/include$/.test(directive)) {
        const header = /^(\s*)(<[^>\n]*>)/.exec(text.slice(i));
        if (header?.[2]) {
          if (header[1]) push("space", header[1]);
          push("string", header[2]);
          i += header[0].length;
        }
      }
      continue;
    }
    lineStart = false;

    // Raw string literal: R"delim( ... )delim", possibly with a u8/L/u/U prefix.
    const raw = /^(?:u8|[LuU])?R"([^()\\\s]{0,16})\(/.exec(rest());
    if (raw) {
      const close = `)${raw[1] ?? ""}"`;
      const end = text.indexOf(close, i + raw[0].length);
      const j = end < 0 ? text.length : end + close.length;
      push("string", text.slice(i, j));
      i = j;
      continue;
    }
    const prefixed = /^(?:u8|[LuU])?(["'])/.exec(rest());
    if (prefixed) {
      const quote = prefixed[1];
      let j = i + prefixed[0].length;
      while (j < text.length && text[j] !== quote && text[j] !== "\n")
        j += text[j] === "\\" ? 2 : 1;
      j = Math.min(j + 1, text.length);
      push(quote === '"' ? "string" : "char", text.slice(i, j));
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(text[i + 1] ?? ""))) {
      const m = NUMBER.exec(rest())?.[0] ?? c;
      push("number", m);
      i += m.length;
      continue;
    }
    if (IDENT_START.test(c)) {
      let j = i + 1;
      while (j < text.length && IDENT.test(text[j] ?? "")) j++;
      const word = text.slice(i, j);
      let k = j;
      while (text[k] === " ") k++;
      // "std::min<uint32_t>(a, b)": a call with template arguments.
      const templated = text[k] === "<" && /^<[\w\s:,*&]*>\s*\(/.test(text.slice(k, k + 64));
      push(classifyIdent(word, templated ? "(" : (text[k] ?? "")), word);
      i = j;
      continue;
    }
    const op = OPERATORS.find((o) => text.startsWith(o, i)) ?? c;
    push("op", op);
    i += op.length;
  }
  // A trailing newline makes an empty last line that the file does not really have.
  if (lines.length > 1 && lines.at(-1)?.length === 0 && text.endsWith("\n")) lines.pop();
  return lines;
}

/** The visible text of a line. */
export const lineText = (line: Line) => line.map((t) => t.text).join("");

/** The tokens that carry meaning (no spaces, no comments). */
export const meaningful = (line: Line) =>
  line.filter((t) => t.kind !== "space" && t.kind !== "comment");
