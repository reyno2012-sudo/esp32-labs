// Long-form content (lessons, the phrasebook, code tours) is authored once, in English, as typed
// TypeScript data. A translation is an *overlay*: a JSON tree holding only the text, shaped like
// the data it translates. Structure (pins, commands, widget ids, code anchors) never leaves the
// source, so a translation can never break a wire or a command.
//
// A policy names the fields that hold reader-facing text. Everything under such a field is text
// (a string, or arrays of strings); every other field is structure and is walked, not copied.
// Array items are keyed by their `id` / `key` / … field when they have one, else by index.

export interface TextPolicy {
  /** Fields whose whole value is text to translate. */
  readonly text: ReadonlySet<string>;
  /** Fields that name an array item, tried in order (else the item's index). */
  readonly itemKey: readonly string[];
}

/** A translation tree: nested objects whose leaves are strings or arrays of text. */
export type Overlay = { readonly [key: string]: OverlayValue };
type OverlayValue = string | readonly OverlayValue[] | Overlay;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function itemName(item: unknown, index: number, policy: TextPolicy): string {
  if (isRecord(item))
    for (const field of policy.itemKey) {
      const name = item[field];
      if (typeof name === "string") return name;
    }
  return String(index);
}

/** Only the text of a text field: strings, and arrays of them (any depth). */
function textOf(value: unknown): OverlayValue | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const items = value.map(textOf);
    return items.every((i) => i !== undefined) ? (items as OverlayValue[]) : undefined;
  }
  return undefined;
}

/** The source text of `value`, as the overlay a translator fills in. */
export function extractOverlay(value: unknown, policy: TextPolicy): Overlay | undefined {
  const out: Record<string, OverlayValue> = {};
  const visit = (key: string, child: unknown, isText: boolean) => {
    const found = isText ? textOf(child) : extractOverlay(child, policy);
    if (found !== undefined) out[key] = found;
  };
  if (Array.isArray(value)) value.forEach((item, i) => visit(itemName(item, i, policy), item, false));
  else if (isRecord(value))
    for (const [key, child] of Object.entries(value)) visit(key, child, policy.text.has(key));
  else return undefined;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Same shape (strings in the same places, arrays of the same length)? */
function sameShape(source: unknown, translated: unknown): boolean {
  if (typeof source === "string") return typeof translated === "string";
  return (
    Array.isArray(source) &&
    Array.isArray(translated) &&
    source.length === translated.length &&
    source.every((s, i) => sameShape(s, translated[i]))
  );
}

/**
 * The source with its text replaced from the overlay. Anything the overlay lacks, or gives in a
 * different shape (a step added since it was translated), keeps the source text.
 */
export function applyOverlay<T>(source: T, overlay: unknown, policy: TextPolicy): T {
  if (!isRecord(overlay)) return source;
  if (Array.isArray(source))
    return source.map((item: unknown, i) =>
      applyOverlay(item, overlay[itemName(item, i, policy)], policy),
    ) as T;
  if (!isRecord(source)) return source;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    const translated = overlay[key];
    out[key] = policy.text.has(key)
      ? sameShape(child, translated)
        ? translated
        : child
      : applyOverlay(child, translated, policy);
  }
  return out as T;
}

// ----------------------------------------------------------------------------- checking

export interface OverlayIssue {
  readonly path: string;
  readonly problem: "unknown" | "shape" | "markup" | "placeholder";
}

/**
 * Inline tags: RichText's (<b>, </code>, <span class="need">) and <Trans> components (<link>,
 * <kbd/>). A translation may move them, not add, drop or rename them.
 */
const markupOf = (s: string) => s.match(/<\/?[a-zA-Z][\w-]*(?:\s+class="[^"]*")?\s*\/?>/g) ?? [];
/** {{name}} interpolations, sorted: their order may change, their set may not. */
const placeholdersOf = (s: string) => (s.match(/\{\{[^}]+\}\}/g) ?? []).sort();
const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * What is wrong with a translation, against the source overlay. Missing text is not an issue
 * (it shows in English); text the source no longer has, broken shapes, and changed markup or
 * placeholders are.
 */
export function checkOverlay(source: unknown, translated: unknown, path = ""): OverlayIssue[] {
  if (typeof source === "string" && typeof translated === "string") {
    const issues: OverlayIssue[] = [];
    if (!sameList([...markupOf(source)].sort(), [...markupOf(translated)].sort()))
      issues.push({ path, problem: "markup" });
    if (!sameList(placeholdersOf(source), placeholdersOf(translated)))
      issues.push({ path, problem: "placeholder" });
    return issues;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(translated) || translated.length !== source.length)
      return [{ path, problem: "shape" }];
    return source.flatMap((s, i) => checkOverlay(s, translated[i], `${path}[${i}]`));
  }
  if (isRecord(source) && isRecord(translated))
    return Object.entries(translated).flatMap(([key, value]) =>
      key in source
        ? checkOverlay(source[key], value, path ? `${path}.${key}` : key)
        : [{ path: path ? `${path}.${key}` : key, problem: "unknown" as const }],
    );
  return [{ path, problem: "shape" }];
}
