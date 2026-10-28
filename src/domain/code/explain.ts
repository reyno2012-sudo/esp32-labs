import type { TFunction } from "i18next";
import type { Rich } from "@/domain/lesson";
import { type Block, type FileAnalysis, ownerOf, type Statement } from "./analyze";
import { lineText } from "./tokenize";

// Tap a line, read what it does. Rules look at the statement a line belongs to and say it in
// plain words; the glossary then explains each C++ word or library call on the line. Rules are
// ordered from specific to general, and every line gets *something*, so nothing stays a mystery.
// The words come from the "code" catalogue through ctx.t, so this module stays free of i18n state.

export type ExplainT = TFunction<"code">;

/** Where a function or type is defined in the lab, so a call can point at it. */
export interface Definition {
  readonly path: string;
  readonly line: number;
  readonly kind: Block["kind"];
}

export interface ExplainContext {
  readonly file: FileAnalysis;
  /** Functions and types defined anywhere in the lab, by name. */
  readonly defined: ReadonlyMap<string, Definition>;
  /** Short known meanings for calls and headers (from the glossary), by call or header name. */
  readonly known?: (name: string) => Rich | undefined;
  /** Translates the explainer's sentences (the "code" namespace). */
  readonly t: ExplainT;
}

export interface LineExplanation {
  readonly text: Rich;
  /** Set for a line that continues a statement started earlier (0-based line). */
  readonly continues?: number;
  /** A function or type defined in the lab that this line uses (for "go to definition"). */
  readonly jump?: { readonly name: string } & Definition;
}

const MAX = 48;
/** Objects that come with the framework: a method call on them never means one of our functions. */
const FRAMEWORK_OBJECTS = new Set([
  "Serial",
  "WiFi",
  "SPI",
  "Wire",
  "ESP",
  "MDNS",
  "NimBLEDevice",
  "Update",
  "LittleFS",
  "std",
]);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** Inline code, shortened so a sentence stays readable. */
export const code = (s: string) => {
  const t = s.trim();
  return `<code>${esc(t.length > MAX ? `${t.slice(0, MAX - 1)}…` : t)}</code>`;
};

const SPECIAL_FUNCTIONS = new Set(["setup", "loop", "main"] as const);
const isSpecial = (name: string): name is "setup" | "loop" | "main" =>
  (SPECIAL_FUNCTIONS as ReadonlySet<string>).has(name);

const CLOSE: Partial<Record<Block["kind"], (b: Block, t: ExplainT) => Rich>> = {
  function: (b, t) =>
    b.name === "setup" && b.depth === 0
      ? t("explain.close.setup")
      : b.name === "loop" && b.depth === 0
        ? t("explain.close.loop")
        : t("explain.close.function", { name: code(`${b.name}()`) }),
  namespace: (b, t) =>
    b.name
      ? t("explain.close.namespace", { name: code(b.name) })
      : t("explain.close.privateNamespace"),
  class: (b, t) => t("explain.close.class", { name: code(b.name) }),
  struct: (b, t) => t("explain.close.struct", { name: code(b.name) }),
  enum: (b, t) => t("explain.close.enum", { name: code(b.name) }),
  if: (_, t) => t("explain.close.if"),
  else: (_, t) => t("explain.close.else"),
  for: (_, t) => t("explain.close.for"),
  while: (_, t) => t("explain.close.while"),
  do: (_, t) => t("explain.close.do"),
  switch: (_, t) => t("explain.close.switch"),
  case: (_, t) => t("explain.close.case"),
  lambda: (_, t) => t("explain.close.lambda"),
  try: (_, t) => t("explain.close.try"),
};

/** "a, b" → readable list of a function's parameters. */
function describeParams(params: string, t: ExplainT): string {
  const p = params.trim();
  if (!p || p === "void") return t("explain.params.none");
  const parts = splitTop(p);
  return parts.length === 1
    ? t("explain.params.one", { param: code(parts[0] ?? "") })
    : t("explain.params.many", { count: parts.length, list: parts.map(code).join(", ") });
}

/** Splits on commas that are not inside (), <>, [] or {}. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([<{".includes(ch)) depth++;
    if (")]>}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** The text between the first "(" and its matching ")". */
function insideParens(s: string, from = s.indexOf("(")): string {
  if (from < 0) return "";
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    if (s[i] === "(") depth++;
    if (s[i] === ")" && --depth === 0) return s.slice(from + 1, i);
  }
  return s.slice(from + 1);
}

type TypeWord = "nothing" | "text" | "bool" | "int" | "float" | "char" | "string" | "auto";

const strippedType = (t: string) =>
  t
    .replace(
      /\b(?:static|inline|constexpr|const|volatile|extern|IRAM_ATTR|virtual|explicit)\b/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

/** A plain word for a C++ type, or null when the type is best shown as code. */
function typeWordOf(t: string): TypeWord | null {
  const type = strippedType(t);
  if (/^void$/.test(type)) return "nothing";
  if (/^const char ?\*$|^char ?\*$/.test(type.replace(/\s/g, " ")) || /char\s*\*/.test(type))
    return "text";
  if (/^bool$/.test(type)) return "bool";
  if (/^u?int\d+_t$|^(?:unsigned |signed )?(?:int|long|short|long long)$|^size_t$/.test(type))
    return "int";
  if (/^(?:float|double)$/.test(type)) return "float";
  if (/^char$/.test(type)) return "char";
  if (/^String$/.test(type)) return "string";
  if (/^auto$/.test(type)) return "auto";
  return null;
}

/** "a whole number" (or "whole numbers" with plural), else the type as code. */
function describeType(type: string, t: ExplainT, plural = false): string {
  const word = typeWordOf(type);
  if (!word) return code(strippedType(type));
  return plural ? t(`explain.types.${word}`) : t(`explain.type.${word}`);
}

function functionHeader(stmt: Statement, b: Block, t: ExplainT): Rich {
  if (isSpecial(b.name) && b.depth === 0) return t(`explain.special.${b.name}`);
  const header = b.header;
  const nameAt = header.indexOf(`${b.name.split("::").at(-1) ?? b.name}(`);
  const before =
    nameAt > 0
      ? header
          .slice(0, nameAt)
          .replace(/\w+::$/, "")
          .trim()
      : "";
  const params = describeParams(
    insideParens(header, nameAt + (b.name.split("::").at(-1)?.length ?? 0)),
    t,
  );
  const after = header.slice(header.lastIndexOf(")") + 1);
  const notes: string[] = [];
  if (/\bconst\b/.test(after)) notes.push(t("explain.fn.note.const"));
  if (/\bstatic\b/.test(before)) notes.push(t("explain.fn.note.static"));
  if (/IRAM_ATTR/.test(before)) notes.push(t("explain.fn.note.iram"));
  if (/\boverride\b/.test(after)) notes.push(t("explain.fn.note.override"));
  const short = b.name.split("::").at(-1) ?? b.name;
  if (/~\s*$/.test(before)) return t("explain.fn.destructor", { name: code(short) });
  if (
    !before ||
    /^(?:explicit|constexpr|inline)?$/.test(before) ||
    before.split(" ").at(-1) === short
  ) {
    return /\)\s*:/.test(header)
      ? t("explain.fn.constructorInit", { name: code(short), params })
      : t("explain.fn.constructor", { name: code(short), params });
  }
  const returns = describeType(before, t);
  void stmt;
  const name = code(`${short}()`);
  return notes.length
    ? t("explain.fn.defineNotes", {
        name,
        params,
        returns,
        notes: notes.join(t("explain.fn.noteSeparator")),
      })
    : t("explain.fn.define", { name, params, returns });
}

function blockHeader(stmt: Statement, b: Block, file: FileAnalysis, t: ExplainT): Rich {
  const cond = insideParens(b.header);
  switch (b.kind) {
    case "function":
      return functionHeader(stmt, b, t);
    case "if":
      return b.header.startsWith("else")
        ? t("explain.block.elseIf", { cond: code(cond) })
        : t("explain.block.if", { cond: code(cond) });
    case "else":
      return t("explain.block.else");
    case "for": {
      if (/^\s*;\s*;\s*$/.test(cond)) return t("explain.block.forever");
      const range = /^(.*?)\s:\s(.+)$/.exec(cond);
      if (range && !cond.includes(";")) {
        const name =
          range[1]
            ?.trim()
            .split(/[\s*&]+/)
            .at(-1) ?? "item";
        return t("explain.block.forEach", { list: code(range[2] ?? ""), name: code(name) });
      }
      const [init, test, step] = cond.split(";").map((p) => p.trim());
      return t("explain.block.counting", {
        init: code(init ?? ""),
        test: code(test ?? ""),
        step: code(step ?? ""),
      });
    }
    case "while":
      return /^(?:true|1)$/.test(cond.trim())
        ? t("explain.block.forever")
        : t("explain.block.while", { cond: code(cond) });
    case "do":
      return t("explain.block.do");
    case "switch":
      return t("explain.block.switch", { cond: code(cond) });
    case "namespace":
      return b.name
        ? t("explain.block.namespace", { name: code(`${b.name}::`) })
        : t("explain.block.privateNamespace");
    case "struct": {
      const members = /\{(.*)\}/.exec(lineText(file.lines[b.open] ?? []))?.[1];
      return members
        ? t("explain.block.structMembers", { name: code(b.name), members: code(members) })
        : t("explain.block.struct", { name: code(b.name) });
    }
    case "class": {
      const base = /:\s*(?:public|private|protected)?\s*([\w:<>]+)/.exec(b.header)?.[1];
      return base
        ? t("explain.block.classBase", { name: code(b.name), base: code(base) })
        : t("explain.block.class", { name: code(b.name) });
    }
    case "enum": {
      const list = /\{([^}]*)\}/.exec(lineText(file.lines[b.open] ?? []))?.[1];
      return list
        ? t("explain.block.enumList", { name: code(b.name), list: code(list.trim()) })
        : t("explain.block.enum", { name: code(b.name) });
    }
    case "union":
      return t("explain.block.union", { name: code(b.name) });
    case "try":
      return t("explain.block.try");
    case "case":
      return describeCase(b.header, t);
    default:
      return t("explain.block.other");
  }
}

function describeCase(text: string, t: ExplainT): Rich {
  if (/^default\b/.test(text)) return t("explain.block.default");
  const value = /^case\s+(.+?)\s*:$/.exec(text.trim())?.[1] ?? text;
  return t("explain.block.case", { value: code(value) });
}

/** "a[i + 1] |= x" → target, compound operator ("|", "" for plain "="), value; null if no top-level "=". */
function splitAssignment(s: string): { target: string; op: string; value: string } | null {
  let depth = 0;
  let quote = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] ?? "";
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "?" && depth === 0) return null;
    else if (ch === "=" && depth === 0) {
      if (s[i + 1] === "=" || s[i - 1] === "=") return null;
      const op = /(<<|>>|[+\-*/%|&^])$/.exec(s.slice(0, i))?.[1] ?? "";
      if (!op && /[!<>]$/.test(s.slice(0, i))) return null;
      const target = s.slice(0, i - op.length).trim();
      // A declaration ("int x = 1") is handled elsewhere; a target is one expression.
      if (!target || /^[\w:<>]+\s+[*&]*\w+$/.test(target) || /\(\s*$/.test(target)) return null;
      return { target, op, value: s.slice(i + 1).trim() };
    }
  }
  return null;
}

/** Adds a call's arguments to a known meaning: "Pauses the program… Here: <code>1500</code>." */
const withArgs = (known: Rich, args: string, t: ExplainT) =>
  args.trim() ? t("explain.call.knownArgs", { known, args: code(args) }) : known;

/** "Stops here…" → "stops here…", to continue a sentence. */
const lowerFirst = (text: Rich) =>
  /^[A-Z][a-z]/.test(text) ? text[0]?.toLowerCase() + text.slice(1) : text;

/** The catalogue key for each compound assignment operator ("+=" → "plus"). */
const ASSIGN_KEY = {
  "+": "plus",
  "-": "minus",
  "*": "times",
  "/": "divide",
  "%": "mod",
  "|": "or",
  "&": "and",
  "^": "xor",
  "<<": "shiftLeft",
  ">>": "shiftRight",
} as const;
const isAssignOp = (op: string): op is keyof typeof ASSIGN_KEY => Object.hasOwn(ASSIGN_KEY, op);

/** Statements that are not block headers. */
function plainStatement(text: string, ctx: ExplainContext, within?: Block): LineExplanation {
  const { t } = ctx;
  const s = text.replace(/;$/, "").trim();
  if (within?.kind === "enum") {
    return {
      text: t("explain.decl.enumValues", {
        name: code(within.name),
        values: code(s.replace(/,$/, "")),
      }),
    };
  }
  const callOf = (name: string): LineExplanation | undefined => {
    const def = ctx.defined.get(name);
    if (def) return { text: "", jump: { name, ...def } };
    return undefined;
  };

  // Preprocessor
  let m = /^#\s*include\s*([<"])([^>"]+)[>"]/.exec(s);
  if (m) {
    const known = ctx.known?.(m[2] ?? "");
    const file = code(m[2] ?? "");
    if (m[1] === '"') {
      const base = m[2]?.split("/").at(-1) ?? "";
      const def = ctx.defined.get(`file:${base}`);
      return {
        text: known
          ? t("explain.pre.includeOwnKnown", { file, known })
          : t("explain.pre.includeOwn", { file }),
        ...(def ? { jump: { name: base, ...def } } : {}),
      };
    }
    return {
      text: known ? t("explain.pre.includeKnown", { file, known }) : t("explain.pre.include", { file }),
    };
  }
  if (/^#\s*pragma\s+once/.test(s)) return { text: t("explain.pre.pragmaOnce") };
  m = /^#\s*define\s+(\w+)(\([^)]*\))?\s*(.*)$/.exec(s);
  if (m) {
    return m[2]
      ? {
          text: t("explain.pre.macro", {
            name: code(`${m[1]}${m[2]}`),
            value: code(m[3] ?? ""),
          }),
        }
      : {
          text: t("explain.pre.define", {
            value: code(m[3] || "nothing"),
            name: code(m[1] ?? ""),
          }),
        };
  }
  m = /^#\s*(ifdef|ifndef|if|elif)\s+(.*)$/.exec(s);
  if (m) {
    const what = m[2] ?? "";
    if (m[1] === "ifdef") return { text: t("explain.pre.ifdef", { name: code(what) }) };
    if (m[1] === "ifndef") return { text: t("explain.pre.ifndef", { name: code(what) }) };
    return {
      text:
        m[1] === "elif"
          ? t("explain.pre.elif", { cond: code(what) })
          : t("explain.pre.if", { cond: code(what) }),
    };
  }
  if (/^#\s*else/.test(s)) return { text: t("explain.pre.else") };
  if (/^#\s*endif/.test(s)) return { text: t("explain.pre.endif") };
  if (/^#\s*(?:error|warning)/.test(s)) return { text: t("explain.pre.error") };
  if (/^#/.test(s)) return { text: t("explain.pre.other") };

  // One-line control statements without braces: "if (x) return;", "for (...) total += v;"
  m = /^(if|while|for)\s*\(/.exec(s);
  if (m) {
    const cond = insideParens(s);
    const body = s.slice(s.indexOf(cond) + cond.length + 1).trim();
    if (body) {
      const then = lowerFirst(plainStatement(body, ctx).text);
      if (m[1] === "if") return { text: t("explain.short.if", { cond: code(cond), then }) };
      if (m[1] === "while") return { text: t("explain.short.while", { cond: code(cond), then }) };
      return { text: t("explain.short.for", { cond: code(cond), then }) };
    }
  }
  m = /^else\s+(.+)$/.exec(s);
  if (m) {
    const then = lowerFirst(plainStatement(m[1] ?? "", ctx).text);
    return {
      text: m[1]?.startsWith("if")
        ? t("explain.short.elseIf", { then })
        : t("explain.short.else", { then }),
    };
  }

  // Simple jumps
  if (s === "break") return { text: t("explain.jump.break") };
  if (s === "continue") return { text: t("explain.jump.continue") };
  if (s === "return") return { text: t("explain.jump.return") };
  m = /^return\s+(.+)$/.exec(s);
  if (m) {
    const value = m[1] ?? "";
    const call = /^(\w+)\s*\(/.exec(value)?.[1];
    const jump = call ? callOf(call)?.jump : undefined;
    if (/\?/.test(value) && /:/.test(value))
      return {
        text: t("explain.jump.returnChoice", { value: code(value) }),
        ...(jump ? { jump } : {}),
      };
    return {
      text: t("explain.jump.returnValue", { value: code(value) }),
      ...(jump ? { jump } : {}),
    };
  }
  if (/^(?:public|private|protected)\s*:$/.test(s)) {
    return s.startsWith("public")
      ? { text: t("explain.misc.public") }
      : { text: t("explain.misc.private") };
  }
  if (/^(?:case\b|default\s*:)/.test(s)) return { text: describeCase(s, t) };
  m = /^using\s+namespace\s+([\w:]+)/.exec(s);
  if (m)
    return {
      text: t("explain.misc.usingNamespace", {
        name: code(m[1] ?? ""),
        prefix: code(`${m[1]}::`),
      }),
    };
  m = /^using\s+(\w+)\s*=\s*(.+)$/.exec(s);
  if (m)
    return { text: t("explain.misc.using", { type: code(m[2] ?? ""), name: code(m[1] ?? "") }) };
  if (/^typedef\b/.test(s)) return { text: t("explain.misc.typedef") };
  if (/^template\s*</.test(s)) return { text: t("explain.misc.template") };
  if (/^static_assert\b/.test(s)) return { text: t("explain.misc.staticAssert") };
  m = /^(?:enum\s+(?:class\s+)?|struct\s+|class\s+)(\w+)$/.exec(s);
  if (m) return { text: t("explain.misc.forward", { name: code(m[1] ?? "") }) };
  if (/^delete\b/.test(s)) return { text: t("explain.misc.delete") };

  // Several variables at once: "float x, y, z", "int16_t a[320], b[320]".
  m =
    /^((?:(?:static|const|volatile)\s+)*)([\w:]+(?:\s*[*&])?)\s+(\w+\s*(?:\[[^\]]*\])?\s*(?:,\s*\*?\w+\s*(?:\[[^\]]*\])?\s*)+)$/.exec(
      s,
    );
  if (m && !/^(?:return|else|delete)$/.test(m[2] ?? "")) {
    const names = (m[3] ?? "").split(",").map((n) => n.trim());
    const count = names.length;
    const list = names.map((n) => code(n)).join(", ");
    return {
      text: names.some((n) => n.includes("["))
        ? t("explain.decl.severalArrays", { count, names: list, type: code(m[2] ?? "") })
        : t("explain.decl.several", { count, names: list, what: describeType(m[2] ?? "", t) }),
    };
  }

  // Declarations: [qualifiers] Type name[...] [= value | {value} | (args)]
  const decl =
    /^((?:(?:static|const|constexpr|constinit|inline|volatile|extern|thread_local|mutable)\s+)*)((?:[\w:]+(?:\s*<[^;=]*?>)?)(?:\s+const)?(?:\s*[*&]+\s*|\s+))(\w+)\s*(\[[^\]]*\])?\s*(=\s*([\s\S]+)|\{([\s\S]*)\}|\(([\s\S]*)\))?$/.exec(
      s,
    );
  const startsLikeType =
    decl && !/^(?:return|delete|new|throw|else|case|goto)$/.test(decl[2]?.trim() ?? "");
  if (decl && startsLikeType && !/[+\-*/%|&^]=|==/.test(decl[2] ?? "")) {
    const quals = decl[1] ?? "";
    const type = (decl[2] ?? "").trim();
    const name = code(decl[3] ?? "");
    const array = decl[4];
    const value = decl[6] ?? decl[7] ?? decl[8];
    const what = array
      ? t("explain.decl.arrayOf", { items: describeType(type, t, true) })
      : describeType(type, t);
    const typeJump = ctx.defined.get(type.replace(/[*&\s]|const/g, ""));
    const jump = typeJump ? { jump: { name: type, ...typeJump } } : {};
    const member =
      within && (within.kind === "struct" || within.kind === "class") ? within : undefined;
    if (/constexpr/.test(quals)) {
      const fixed = { name, value: code(value ?? "") };
      return {
        text: member
          ? t("explain.decl.memberConstant", { owner: code(member.name), ...fixed })
          : t("explain.decl.constant", fixed),
        ...jump,
      };
    }
    // Because it is static, it keeps its value between calls (and lives as long as the program).
    const withStatic = (said: Rich): Rich =>
      /static/.test(quals) ? t("explain.decl.staticNote", { text: said }) : said;
    // "const char *p": the characters are read-only, the pointer itself can still change.
    const pointerToConst = /\*/.test(type) && !/\*\s*const/.test(type);
    if (member && value === undefined) {
      return {
        text: t("explain.decl.member", { owner: code(member.name), name, what }),
        ...jump,
      };
    }
    if (/const/.test(quals + type) && !(pointerToConst && !/const/.test(quals))) {
      return {
        text: withStatic(
          value
            ? t("explain.decl.constValue", { name, what, value: code(value) })
            : t("explain.decl.const", { name, what }),
        ),
        ...jump,
      };
    }
    if (value === undefined) return { text: withStatic(t("explain.decl.make", { name, what })), ...jump };
    if (decl[8] !== undefined || decl[7] !== undefined)
      return {
        text: withStatic(
          t("explain.decl.makeFrom", { name, what, value: code(value || "nothing") }),
        ),
        ...jump,
      };
    return {
      text: withStatic(t("explain.decl.makeSet", { name, what, value: code(value) })),
      ...jump,
    };
  }

  // Assignment and arithmetic shortcuts
  const assign = splitAssignment(s);
  if (assign) {
    const { op } = assign;
    const parts = { target: code(assign.target), value: code(assign.value) };
    const call = /^(\w+)\s*\(/.exec(assign.value)?.[1];
    const jump = call ? callOf(call)?.jump : undefined;
    return {
      text: !op
        ? t("explain.assign.store", parts)
        : isAssignOp(op)
          ? t(`explain.assign.${ASSIGN_KEY[op]}`, parts)
          : t("explain.assign.update", parts),
      ...(jump ? { jump } : {}),
    };
  }
  m = /^(?:\+\+|--)\s*([\w.\->[\]]+)$|^([\w.\->[\]]+)\s*(?:\+\+|--)$/.exec(s);
  if (m) {
    const target = code(m[1] ?? m[2] ?? "");
    return {
      text: s.includes("++")
        ? t("explain.assign.increment", { target })
        : t("explain.assign.decrement", { target }),
    };
  }

  // Calls: obj.method(...), ns::fn(...), fn(...)
  m =
    /^([\w]+)((?:\s*(?:\.|->|::)\s*\w+(?:\([^)]*\))?)*?)\s*(?:\.|->|::)?\s*(\w+)?\s*\(([\s\S]*)\)$/.exec(
      s,
    );
  if (m) {
    const qualified = /^([\w]+)\s*(\.|->|::)\s*(\w+)\s*\(/.exec(s);
    const plain = /^(\w+)\s*\(/.exec(s);
    const args = insideParens(s);
    const withArgsCode = args.trim() ? code(args) : null;
    if (qualified) {
      const [, obj, sep, method] = qualified;
      const known =
        ctx.known?.(`${obj}${sep === "::" ? "::" : "."}${method}`) ?? ctx.known?.(method ?? "");
      if (known) return { text: withArgs(known, args, t) };
      const def = FRAMEWORK_OBJECTS.has(obj ?? "") ? undefined : ctx.defined.get(method ?? "");
      const who = { object: code(obj ?? ""), method: code(`${method}()`) };
      return {
        text: withArgsCode
          ? t("explain.call.askWith", { ...who, args: withArgsCode })
          : t("explain.call.ask", who),
        ...(def ? { jump: { name: method ?? "", ...def } } : {}),
      };
    }
    if (plain) {
      const name = plain[1] ?? "";
      const fn = code(`${name}()`);
      const def = ctx.defined.get(name);
      if (def && def.kind === "function")
        return {
          text: withArgsCode
            ? t("explain.call.ownWith", { name: fn, args: withArgsCode })
            : t("explain.call.own", { name: fn }),
          jump: { name, ...def },
        };
      const known = ctx.known?.(name);
      if (known) return { text: withArgs(known, args, t) };
      return {
        text: withArgsCode
          ? t("explain.call.otherWith", { name: fn, args: withArgsCode })
          : t("explain.call.other", { name: fn }),
      };
    }
  }
  if (/^\}?\s*\w*\s*;?$/.test(s) && s.length < 3) return { text: "" };
  return { text: t("explain.fallback", { code: code(s) }) };
}

/** Explains one line (0-based). Blank lines get an empty text. */
export function explainLine(ctx: ExplainContext, line: number): LineExplanation {
  const first = explainFirst(ctx, line);
  if (first.continues !== undefined || !first.text) return first;
  // More statements starting on the same line ("case X: return 1;", "} else {" is one idea).
  const { file, t } = ctx;
  const index = file.statementOf[line] ?? -1;
  let text = first.text;
  let added = 0;
  for (let k = index + 1; k < file.statements.length && added < 2; k++) {
    const next = file.statements[k];
    if (!next || next.start !== line) break;
    const prev = file.statements[k - 1];
    if (prev?.closes && next.opens && prev.start === line && k - 1 === index) continue;
    if (next.closes || /^[}{;]?$/.test(next.text)) continue;
    if (prev?.closes && /^\w+(?:\[[^\]]*\])?;?$/.test(next.text)) continue;
    // "enum class Mode { Off, On };": the header already listed the values.
    if (ownerOf(file, line)?.kind === "enum" || prev?.opens?.kind === "enum") continue;
    const said = next.opens
      ? blockHeader(next, next.opens, file, t)
      : plainStatement(next.text, ctx).text;
    if (said) {
      text = t("explain.then", { first: text, next: lowerFirst(said) });
      added++;
    }
  }
  return added ? { ...first, text } : first;
}

function explainFirst(ctx: ExplainContext, line: number): LineExplanation {
  const { file, t } = ctx;
  const kind = file.kinds[line];
  if (kind === "blank" || kind === undefined) return { text: "" };
  if (kind === "comment") {
    const chapter = file.chapters.get(line);
    if (chapter) return { text: t("explain.chapter", { chapter: esc(chapter) }) };
    return { text: t("explain.comment") };
  }
  const index = file.statementOf[line] ?? -1;
  const stmt = file.statements[index];
  if (!stmt) return { text: "" };
  if (stmt.start < line && !stmt.closes) {
    return {
      text: t("explain.continues", { line: stmt.start + 1 }),
      continues: stmt.start,
    };
  }
  if (stmt.closes) {
    const b = stmt.closes;
    // "} else {" and "} while (x);" close one block and open the next.
    const next = file.statements[index + 1];
    if (next && next.start === line && next.opens)
      return { text: blockHeader(next, next.opens, file, t) };
    const closeText = CLOSE[b.kind]?.(b, t);
    const variable =
      next && next.start === line && /^\w+(?:\[[^\]]*\])?;?$/.test(next.text)
        ? next.text.replace(/;$/, "")
        : null;
    if (variable && (b.kind === "struct" || b.kind === "class" || b.kind === "enum")) {
      return {
        text: t("explain.close.andVariable", { close: closeText ?? "", name: code(variable) }),
      };
    }
    if (b.kind === "do" && next?.start === line)
      return { text: t("explain.close.doWhile", { cond: code(insideParens(next.text)) }) };
    return { text: closeText ?? t("explain.close.block") };
  }
  if (stmt.opens)
    return { text: blockHeader(stmt, stmt.opens, file, t), ...jumpFor(stmt.opens, ctx) };
  const explained = plainStatement(stmt.text, ctx, ownerOf(file, line));
  if (!explained.text && explained.jump)
    return { ...explained, text: t("explain.call.own", { name: code(`${explained.jump.name}()`) }) };
  return explained;
}

function jumpFor(b: Block, ctx: ExplainContext): Pick<LineExplanation, "jump"> {
  if (b.kind !== "function" || !b.name.includes("::")) return {};
  const type = b.name.split("::")[0] ?? "";
  const def = ctx.defined.get(type);
  return def ? { jump: { name: type, ...def } } : {};
}

/** Every function and type defined in a set of analysed files, by name (first one wins). */
export function definitionsOf(
  files: readonly { path: string; analysis: FileAnalysis }[],
): Map<string, Definition> {
  const defined = new Map<string, Definition>();
  for (const { path, analysis } of files) {
    defined.set(`file:${path.split("/").at(-1) ?? path}`, { path, line: 0, kind: "block" });
    for (const b of analysis.blocks) {
      const named =
        b.kind === "function" || b.kind === "struct" || b.kind === "class" || b.kind === "enum";
      const short = b.name.split("::").at(-1) ?? "";
      if (named && short && !defined.has(short))
        defined.set(short, { path, line: b.start, kind: b.kind });
    }
  }
  return defined;
}
