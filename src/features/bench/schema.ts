import * as z from "zod/mini";

// The bench data files in public/data/. Claude appends a log entry after every command that
// installs software, talks to the board or flashes it; the guide picks it up without a rebuild.

export const LOG_TYPES = [
  "install",
  "build",
  "read",
  "reset",
  "flash",
  "failed",
  "observe",
] as const;

export const LogEntrySchema = z.object({
  n: z.int().check(z.positive()),
  types: z.array(z.enum(LOG_TYPES)).check(z.minLength(1)),
  title: z.string(),
  where: z.string(),
  cmd: z.optional(z.string()),
  why: z.string(),
  out: z.optional(z.string()),
  result: z.string(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type LogType = (typeof LOG_TYPES)[number];

export const BenchLogSchema = z.object({ entries: z.array(LogEntrySchema) });

const FactTableSchema = z.object({
  title: z.string(),
  head: z.array(z.string()),
  /** Columns rendered in the mono face (numbers, paths). */
  mono: z._default(z.array(z.int().check(z.nonnegative())), []),
  rows: z.array(z.array(z.string())),
  note: z.optional(z.string()),
});
export type FactTable = z.infer<typeof FactTableSchema>;

export const BenchStatusSchema = z.object({
  /** "On the bench now": label, value, detail. `highlight` marks the current firmware. */
  overview: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      detail: z.optional(z.string()),
      highlight: z.optional(z.boolean()),
      verified: z.optional(z.boolean()),
    }),
  ),
  facts: z.array(FactTableSchema),
});
export type BenchStatus = z.infer<typeof BenchStatusSchema>;
