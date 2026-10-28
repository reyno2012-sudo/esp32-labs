import { themeEpoch } from "./theme";

/** The resolved value of a CSS custom property on <html>, e.g. cssVar("--copper"). */
export const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * Canvas drawing needs concrete colours, while the design lives in CSS tokens. A palette maps
 * friendly names to tokens, e.g. { ink: "--scope-ink" }, and is re-read only after a theme change.
 * Call the returned getter outside render (in a frame loop or event handler).
 */
export function definePalette<const T extends Record<string, `--${string}`>>(
  spec: T,
): () => { readonly [K in keyof T]: string } {
  let cached: { [K in keyof T]: string } | undefined;
  let cachedEpoch = -1;
  return () => {
    if (!cached || cachedEpoch !== themeEpoch()) {
      cached = Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, cssVar(v)])) as {
        [K in keyof T]: string;
      };
      cachedEpoch = themeEpoch();
    }
    return cached;
  };
}
