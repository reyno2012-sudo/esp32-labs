import * as z from "zod/mini";

// What the reader can tune about reading code. Stored per browser; parsed on every read so an
// old or hand-edited value falls back to the defaults instead of breaking the page.

export const LEVELS = ["beginner", "explorer", "deep"] as const;
export type Level = (typeof LEVELS)[number];
// Labels and blurbs: settings.json, levels.<level> and views.<view>.

export const VIEWS = ["simple", "full"] as const;
export type ReaderView = (typeof VIEWS)[number];

export const SettingsSchema = z.object({
  level: z.enum(LEVELS),
  /** How much of the reader's toolbox is on screen. */
  view: z.enum(VIEWS),
  /** Ask "what do you think this does?" before showing the explanation. */
  guessFirst: z.boolean(),
  /** How language hints appear: a card for each new word, underlined words only, or none. */
  hints: z.enum(["pop", "underline", "off"]),
  codeSize: z.enum(["s", "m", "l"]),
  lineNumbers: z.boolean(),
  wrap: z.boolean(),
  /** "dim" fades the code's own comments so the code stands out. */
  comments: z.enum(["show", "dim"]),
  /** Fold long data tables and embedded web pages into one line. */
  fold: z.boolean(),
  /** Pace of "Play line by line", in milliseconds per line. */
  pace: z.enum(["slow", "normal", "fast"]),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  level: "beginner",
  view: "full",
  guessFirst: true,
  hints: "pop",
  codeSize: "m",
  lineNumbers: true,
  wrap: false,
  comments: "show",
  fold: true,
  pace: "normal",
};

export const PACE_MS: Readonly<Record<Settings["pace"], number>> = {
  slow: 4200,
  normal: 2600,
  fast: 1500,
};

/** Stored value → valid settings: each valid field is kept, anything else takes its default. */
export function normalizeSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_SETTINGS;
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [key, schema] of Object.entries(SettingsSchema.def.shape)) {
    const value = (raw as Record<string, unknown>)[key];
    if (schema.safeParse(value).success) out[key] = value;
  }
  return out as Settings;
}
