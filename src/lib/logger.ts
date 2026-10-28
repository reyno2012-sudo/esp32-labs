import { env, type LogLevel } from "@/config/env";

// Structured logs as an event stream (twelve-factor): one object per event on the console,
// filtered by VITE_LOG_LEVEL. Sinks are pluggable, so a remote collector can be attached later
// without touching any caller.
type Level = Exclude<LogLevel, "silent">;
export interface LogEvent {
  readonly level: Level;
  readonly scope: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
  readonly at: string;
}
export type LogSink = (event: LogEvent) => void;

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

const consoleSink: LogSink = (e) => {
  const line = `[${e.at}] ${e.level.toUpperCase()} ${e.scope}: ${e.message}`;
  const method =
    e.level === "debug"
      ? console.debug
      : e.level === "info"
        ? console.info
        : e.level === "warn"
          ? console.warn
          : console.error;
  if (e.data) method(line, e.data);
  else method(line);
};

const sinks = new Set<LogSink>([consoleSink]);

/** Attach another destination for log events. Returns a detach function. */
export function addLogSink(sink: LogSink): () => void {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(scope: string, minLevel: LogLevel = env.logLevel): Logger {
  const emit = (level: Level, message: string, data?: Record<string, unknown>) => {
    if (RANK[level] < RANK[minLevel]) return;
    const event: LogEvent = {
      level,
      scope,
      message,
      at: new Date().toISOString(),
      ...(data ? { data } : {}),
    };
    sinks.forEach((sink) => sink(event));
  };
  return {
    debug: (m, d) => emit("debug", m, d),
    info: (m, d) => emit("info", m, d),
    warn: (m, d) => emit("warn", m, d),
    error: (m, d) => emit("error", m, d),
  };
}

/** Normalises anything thrown into loggable fields. */
export const errorData = (error: unknown): Record<string, unknown> =>
  error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { value: String(error) };
