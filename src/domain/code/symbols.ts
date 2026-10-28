import type { Block, CallSite, FileAnalysis } from "./analyze";

// Who calls whom, across every file of a lab. Functions are indexed with the class they belong
// to, variables with their type, so "lab.begin()" in main.cpp resolves to Lab::begin() in lab.h
// and "reader_.poll()" to Reader::poll(). A best effort by name and declared type, never a
// compiler: a call it cannot place stays unresolved instead of pointing somewhere wrong.

export interface FunctionSymbol {
  /** Unique: path, qualified name and first line. */
  readonly id: string;
  /** "begin" */
  readonly name: string;
  /** The class or struct it belongs to ("" for a free function). */
  readonly owner: string;
  /** The innermost named namespace around it ("" outside any), e.g. "rv" for rv::card(). */
  readonly namespace: string;
  /** "Lab::begin" or "setup" */
  readonly qualified: string;
  readonly path: string;
  readonly role: "lab" | "shared";
  readonly block: Block;
}

export interface ResolvedCall {
  readonly site: CallSite;
  readonly target: FunctionSymbol;
}

export interface SymbolIndex {
  readonly functions: readonly FunctionSymbol[];
  readonly byId: ReadonlyMap<string, FunctionSymbol>;
  /** The free function `setup`, `loop`… of the program, if the lab has one. */
  entry(name: string): FunctionSymbol | undefined;
  /** What one call site runs, if it can be placed. */
  resolve(site: CallSite, from: FunctionSymbol): FunctionSymbol | undefined;
  /** The lab functions a function calls, each once, in the order it first calls them. */
  callees(fn: FunctionSymbol): readonly ResolvedCall[];
  /** The lab functions that call this one. */
  callers(fn: FunctionSymbol): readonly FunctionSymbol[];
}

export interface IndexedFile {
  readonly path: string;
  readonly role: "lab" | "shared";
  readonly analysis: FileAnalysis;
}

const TYPE_KINDS = new Set<Block["kind"]>(["class", "struct"]);
const QUALIFIERS =
  /^(?:(?:static|const|constexpr|inline|extern|mutable|volatile|thread_local)\s+)*/;
/** "Type name", "ns::Type<T> *name", "const Type &name" at the start of a declaration. */
const DECLARATION =
  /^([A-Za-z_][\w:]*)(?:\s*<[^;]*?>)?\s*(?:const\s*)?[*&]*\s*([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*(?:[({=;,]|$)/;

const shortName = (n: string) => n.split("::").at(-1) ?? n;

/** The type named by a declaration, if it is one of the lab's classes. */
function declaredType(
  text: string,
  classes: ReadonlySet<string>,
): { name: string; type: string } | null {
  const m = DECLARATION.exec(text.replace(QUALIFIERS, ""));
  if (!m?.[1] || !m[2]) return null;
  const type = shortName(m[1]);
  return classes.has(type) ? { name: m[2], type } : null;
}

export function buildSymbolIndex(files: readonly IndexedFile[]): SymbolIndex {
  const functions: FunctionSymbol[] = [];
  const classes = new Set<string>();
  for (const f of files)
    for (const b of f.analysis.blocks) if (TYPE_KINDS.has(b.kind) && b.name) classes.add(b.name);

  /** Variable name → type, by scope: function id, "class:Name", "file:path", or global "". */
  const scopes = new Map<string, Map<string, string>>();
  const declare = (scope: string, name: string, type: string) => {
    const map = scopes.get(scope) ?? new Map<string, string>();
    if (!map.has(name)) map.set(name, type);
    scopes.set(scope, map);
  };

  /** "namespace views = rv;" lets views::card() mean rv::card(). */
  const aliases = new Map<string, string>();
  for (const f of files) {
    for (const st of f.analysis.statements) {
      const alias = /^namespace\s+(\w+)\s*=\s*([\w:]+)\s*;?$/.exec(st.text);
      if (alias?.[1] && alias[2]) aliases.set(alias[1], shortName(alias[2]));
    }
  }

  for (const f of files) {
    const { blocks, statements } = f.analysis;
    const typeBlocks = blocks.filter((b) => TYPE_KINDS.has(b.kind));
    const namespaces = blocks.filter((b) => b.kind === "namespace" && b.name);
    const namespaceAt = (line: number) =>
      namespaces.filter((n) => n.open < line && line <= n.end).sort((a, b) => b.depth - a.depth)[0]
        ?.name ?? "";
    const fnBlocks = blocks.filter((b) => b.kind === "function");
    const ownerAt = (line: number) =>
      typeBlocks.filter((t) => t.open < line && line <= t.end).sort((a, b) => b.depth - a.depth)[0];

    for (const b of fnBlocks) {
      const qualifiedOwner = b.name.includes("::") ? (b.name.split("::").at(-2) ?? "") : "";
      const owner = qualifiedOwner || ownerAt(b.start)?.name || "";
      const name = shortName(b.name);
      const qualified = owner ? `${owner}::${name}` : name;
      const namespace = namespaceAt(b.start);
      const fn: FunctionSymbol = {
        id: `${f.path}#${qualified}@${b.start}`,
        name,
        owner,
        namespace,
        qualified: namespace && !owner ? `${namespace}::${qualified}` : qualified,
        path: f.path,
        role: f.role,
        block: b,
      };
      functions.push(fn);
      // Parameters are variables of the function: "void show(Lab &lab)".
      const params = /\(([^)]*)\)/.exec(b.header)?.[1] ?? "";
      for (const p of params.split(",")) {
        const d = declaredType(p.trim(), classes);
        if (d) declare(fn.id, d.name, d.type);
      }
    }

    for (const st of statements) {
      if (st.opens) continue;
      const d = declaredType(st.text, classes);
      if (!d) continue;
      const inFn = fnBlocks
        .filter((b) => b.open < st.start && st.start <= b.end)
        .sort((a, b) => b.depth - a.depth)[0];
      if (inFn) {
        const fn = functions.find((x) => x.block === inFn);
        if (fn) declare(fn.id, d.name, d.type);
        continue;
      }
      const cls = ownerAt(st.start);
      if (cls) declare(`class:${cls.name}`, d.name, d.type);
      else {
        declare(`file:${f.path}`, d.name, d.type);
        declare("", d.name, d.type);
      }
    }
  }

  const byId = new Map(functions.map((f) => [f.id, f]));
  const byName = new Map<string, FunctionSymbol[]>();
  for (const f of functions) byName.set(f.name, [...(byName.get(f.name) ?? []), f]);

  const typeOf = (variable: string, from: FunctionSymbol) =>
    scopes.get(from.id)?.get(variable) ??
    (from.owner ? scopes.get(`class:${from.owner}`)?.get(variable) : undefined) ??
    scopes.get(`file:${from.path}`)?.get(variable) ??
    scopes.get("")?.get(variable);

  const resolve = (site: CallSite, from: FunctionSymbol): FunctionSymbol | undefined => {
    const named = byName.get(site.name) ?? [];
    if (named.length === 0) return undefined;
    const method = (cls: string) => named.find((f) => f.owner === cls);
    const free = (ns: string) => named.filter((f) => !f.owner && f.namespace === ns);
    if (site.via === "") {
      // A sibling method, then a free function in the same namespace (this file first), then anywhere.
      return (
        (from.owner ? method(from.owner) : undefined) ??
        free(from.namespace).find((f) => f.path === from.path) ??
        free(from.namespace)[0] ??
        free("")[0] ??
        (named.length === 1 ? named[0] : undefined)
      );
    }
    if (site.via === "::") {
      const scope = aliases.get(site.receiver) ?? site.receiver;
      return method(scope) ?? free(scope)[0];
    }
    if (site.receiver === "this" || site.receiver === "self")
      return from.owner ? method(from.owner) : undefined;
    const type = site.receiver !== "?" ? typeOf(site.receiver, from) : undefined;
    if (type) return method(type);
    // An object we cannot type: only a name that exists once in the lab is safe to follow.
    return named.length === 1 && named[0]?.owner ? named[0] : undefined;
  };

  const calleeCache = new Map<string, readonly ResolvedCall[]>();
  const callees = (fn: FunctionSymbol) => {
    let out = calleeCache.get(fn.id);
    if (!out) {
      const seen = new Set<string>();
      const list: ResolvedCall[] = [];
      for (const site of fn.block.sites) {
        const target = resolve(site, fn);
        if (!target || target.id === fn.id || seen.has(target.id)) continue;
        seen.add(target.id);
        list.push({ site, target });
      }
      out = list;
      calleeCache.set(fn.id, out);
    }
    return out;
  };

  return {
    functions,
    byId,
    entry: (name) =>
      functions.find((f) => f.name === name && !f.owner && f.block.depth === 0 && f.role === "lab"),
    resolve,
    callees,
    callers: (fn) => functions.filter((f) => callees(f).some((c) => c.target.id === fn.id)),
  };
}
