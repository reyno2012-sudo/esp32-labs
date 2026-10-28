import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BenchLogSchema, BenchStatusSchema } from "./schema";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), "public/data", file), "utf8"));

// The data files are edited by hand after every bench command: keep them valid.
describe("bench data files", () => {
  it("bench-log.json matches the schema, numbered 1..n", () => {
    const { entries } = BenchLogSchema.parse(read("bench-log.json"));
    expect(entries.map((e) => e.n)).toEqual(entries.map((_, i) => i + 1));
  });

  it("bench-status.json matches the schema", () => {
    expect(() => BenchStatusSchema.parse(read("bench-status.json"))).not.toThrow();
  });
});
