import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { detectLayout, type FileRole, groupOf } from "./layout.ts";
import { applySrcFilter, parsePlatformio } from "./platformio.ts";

// Turns a firmware checkout into what the guide's code reader needs: for every environment, the
// files it compiles (its src folder) plus every local header they pull in, transitively (the
// layout's include and library folders). Framework and registry libraries (<Arduino.h>, NimBLE...)
// are not ours to explain, so they stay out.

export type { FileRole };

export interface FirmwareFile {
  /** Path relative to the checkout, with "/" separators, e.g. "kit/lib/bench/src/button.h". */
  readonly path: string;
  readonly role: FileRole;
  /** The lab folder for a lab's files ("02-led"), "include", or the library name ("wifi-kit"). */
  readonly group: string;
  readonly lines: number;
  readonly text: string;
}

export interface FirmwareEnv {
  readonly env: string;
  readonly about: string;
  readonly files: readonly FirmwareFile[];
}

const SOURCE = /\.(c|cc|cpp|h|hpp)$/;
const INCLUDE = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;

const toPosix = (p: string) => p.split(sep).join(posix.sep);

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => SOURCE.test(f) && statSync(join(dir, f)).isFile())
    .map(toPosix)
    .sort();
}

const countLines = (text: string) => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

/** Every environment of the checkout at `root` with its files, lab files first, in reading order. */
export function collectFirmware(root: string): FirmwareEnv[] {
  const layout = detectLayout(root);
  if (!layout) return [];

  const textCache = new Map<string, string>();
  const read = (abs: string) => {
    let text = textCache.get(abs);
    if (text === undefined) {
      text = readFileSync(abs, "utf8");
      textCache.set(abs, text);
    }
    return text;
  };

  /** Where a local include lands: next to the including file, then the layout's search path. */
  const resolve = (from: string, name: string) => {
    const beside = join(dirname(from), name);
    if (existsSync(beside)) return beside;
    for (const dir of layout.searchPath) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    return null;
  };

  return layout.projects.flatMap(({ ini, srcDir }) => {
    const srcFiles = listFiles(srcDir);
    return parsePlatformio(read(ini)).map(({ name, srcFilter, about }) => {
      const own = applySrcFilter(srcFilter, srcFiles).map((f) => join(srcDir, f));
      // Reading order: main.cpp first, then files in the order the code includes them; files
      // nobody includes (other .cpp units) join the walk when it runs dry.
      const pending = [...own].sort(
        (a, b) => Number(!a.endsWith("main.cpp")) - Number(!b.endsWith("main.cpp")),
      );
      const seen = new Set<string>();
      const order: string[] = [];
      const visit = (file: string) => {
        if (seen.has(file)) return;
        seen.add(file);
        order.push(file);
      };
      for (const start of pending) {
        visit(start);
        for (let i = 0; i < order.length; i++) {
          const file = order[i];
          if (!file) continue;
          for (const [, included] of read(file).matchAll(INCLUDE)) {
            const hit = included ? resolve(file, included) : null;
            if (hit) visit(hit);
          }
        }
      }
      const files = order.map((abs) => {
        const text = read(abs);
        const path = toPosix(relative(root, abs));
        return { path, ...groupOf(path), lines: countLines(text), text };
      });
      // Stable: lab files keep their reading order, then the shared files keep theirs.
      files.sort((a, b) => Number(a.role === "shared") - Number(b.role === "shared"));
      return { env: name, about, files };
    });
  });
}
