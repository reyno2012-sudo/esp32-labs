import { queryOptions } from "@tanstack/react-query";
import { env } from "@/config/env";
import { fetchJson } from "@/lib/http";
import { BenchLogSchema, BenchStatusSchema } from "./schema";

const url = (file: string) => new URL(`${env.benchDataUrl}${file}`, document.baseURI).href;

// Server state: changes when Claude records a new command, so it is refetched when you come
// back to the tab, and considered fresh for a minute in between.
const FRESH_MS = 60_000;

export const benchLogQuery = () =>
  queryOptions({
    queryKey: ["bench", "log"] as const,
    queryFn: ({ signal }) => fetchJson(url("bench-log.json"), BenchLogSchema, signal),
    staleTime: FRESH_MS,
    select: (data) => data.entries,
  });

export const benchStatusQuery = () =>
  queryOptions({
    queryKey: ["bench", "status"] as const,
    queryFn: ({ signal }) => fetchJson(url("bench-status.json"), BenchStatusSchema, signal),
    staleTime: FRESH_MS,
  });
