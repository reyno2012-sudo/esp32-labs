// A translated catalogue subtree laid over the English one, item by item: whatever a translation
// lacks, or gives in another shape (a step added since it was translated), stays English. Used
// for the lists read with returnObjects (flow steps, screen callouts), where i18next itself would
// return a partial translation as is.

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function merge(english: unknown, local: unknown): unknown {
  if (typeof english === "string") return typeof local === "string" ? local : english;
  if (Array.isArray(english)) {
    const items: readonly unknown[] = Array.isArray(local) ? local : [];
    return english.map((e: unknown, i) => merge(e, items[i]));
  }
  if (isRecord(english)) {
    const from = isRecord(local) ? local : {};
    return Object.fromEntries(Object.entries(english).map(([k, e]) => [k, merge(e, from[k])]));
  }
  return english;
}

export function overEnglish<T>(english: T, local: unknown): T {
  return merge(english, local) as T;
}
