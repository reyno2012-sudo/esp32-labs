import type * as z from "zod/mini";
import { createLogger } from "./logger";

const log = createLogger("http");

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  constructor(status: number, url: string) {
    super(`GET ${url} failed with ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

/** GET a JSON document and validate it: the app never trusts the shape of what it fetched. */
export async function fetchJson<T extends z.ZodMiniType>(
  url: string,
  schema: T,
  signal?: AbortSignal,
): Promise<z.infer<T>> {
  const started = performance.now();
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    log.warn("request failed", { url, status: response.status });
    throw new HttpError(response.status, url);
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    log.error("unexpected response shape", { url, issues: parsed.error.issues.slice(0, 5) });
    throw new Error(
      `${url} has an unexpected shape: ${parsed.error.issues[0]?.message ?? "invalid"}`,
    );
  }
  log.debug("fetched", { url, ms: Math.round(performance.now() - started) });
  return parsed.data;
}
