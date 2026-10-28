import { queryOptions } from "@tanstack/react-query";
import { env } from "@/config/env";
import { fetchJson } from "@/lib/http";
import { FirmwareEnvSchema, FirmwareIndexSchema } from "./schema";

const url = (file: string) => new URL(`${env.firmwareUrl}${file}`, document.baseURI).href;

// The code is bundled with the guide at build time: it never changes while the page is open.
export const firmwareIndexQuery = () =>
  queryOptions({
    queryKey: ["firmware", "index"] as const,
    queryFn: ({ signal }) => fetchJson(url("index.json"), FirmwareIndexSchema, signal),
    staleTime: "static",
    gcTime: Infinity,
  });

export const firmwareEnvQuery = (envName: string) =>
  queryOptions({
    queryKey: ["firmware", "env", envName] as const,
    queryFn: ({ signal }) =>
      fetchJson(url(`${encodeURIComponent(envName)}.json`), FirmwareEnvSchema, signal),
    staleTime: "static",
    gcTime: 10 * 60_000,
  });

/** "uv run pio run -d labs/02-led -e 02-led -t upload" → "02-led": a lesson's command names its firmware. */
export const envOfCommand = (cmd: string): string | undefined =>
  /(?:^|\s)-e\s+([\w.-]+)/.exec(cmd)?.[1];
