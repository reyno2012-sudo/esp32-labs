import type { Rich } from "@/domain/lesson";
import { type Line, meaningful } from "./tokenize";

// The phrasebook: C++ words and the Arduino / ESP-IDF calls the labs use, each explained at
// three depths. Entries are data (src/content/code/glossary.ts); this module only knows how to
// spot them in a line of code.

export type GlossaryTopic =
  | "basics" // statements, comments, variables, operators
  | "types" // int, uint8_t, bool, float, String, auto...
  | "flow" // if, for, while, switch, return...
  | "functions" // functions, parameters, lambdas
  | "memory" // pointers, references, arrays, const, static
  | "classes" // struct, class, enum, members, constructors, namespaces
  | "modern" // constexpr, templates, std::, atomics, casts
  | "preprocessor" // #include, #define, #pragma, macros
  | "arduino" // Serial, pins, timing, PWM, String methods
  | "esp" // ESP-IDF and chip features: logging, NVS, timers, interrupts
  | "rtos" // FreeRTOS tasks, queues, mutexes
  | "libraries"; // display, Wi-Fi, web server, JSON, BLE, RFID helpers

export interface GlossaryEntry {
  /** Stable id, used for "words you've met" progress. */
  readonly id: string;
  /** How the word is shown, e.g. "constexpr" or "Serial.printf()". */
  readonly term: string;
  readonly topic: GlossaryTopic;
  /** Language feature or library call. */
  readonly kind: "language" | "api";
  /** What in the code this entry explains (any one match is enough). */
  readonly match: {
    /** Exact identifiers, keywords or type names, e.g. ["constexpr"]. */
    readonly words?: readonly string[];
    /** Function calls: "millis" matches millis(...); "Serial.printf" matches Serial.printf(...). */
    readonly calls?: readonly string[];
    /** Operators or punctuation, e.g. ["->"], ["::"]. */
    readonly ops?: readonly string[];
    /** Preprocessor directives, e.g. ["#include"]. */
    readonly directives?: readonly string[];
  };
  /** One plain sentence: what it is or does. Always shown. */
  readonly short: Rich;
  /** An everyday picture for beginners ("like a labelled box"). */
  readonly simple?: Rich;
  /** The precise story for the Deep dive level. */
  readonly deep?: Rich;
  /** A tiny code example, one or two lines. */
  readonly example?: string;
}

export interface Glossary {
  readonly entries: readonly GlossaryEntry[];
  readonly byId: ReadonlyMap<string, GlossaryEntry>;
  /** Glossary ids found in a line, in the order they appear, without repeats. */
  find(line: Line): string[];
  /** The entry for one token of a line (by index into the line's tokens), for tap-to-explain. */
  entryAt(line: Line, tokenIndex: number): GlossaryEntry | undefined;
  /** For every token of a line, the id of the entry it stands for (aligned with the line). */
  annotate(line: Line): (string | undefined)[];
}

export function createGlossary(entries: readonly GlossaryEntry[]): Glossary {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const words = new Map<string, GlossaryEntry>();
  const calls = new Map<string, GlossaryEntry>();
  const ops = new Map<string, GlossaryEntry>();
  const directives = new Map<string, GlossaryEntry>();
  // First entry wins, so a specific entry listed earlier beats a general one.
  const add = (
    map: Map<string, GlossaryEntry>,
    keys: readonly string[] | undefined,
    e: GlossaryEntry,
  ) =>
    keys?.forEach((k) => {
      if (!map.has(k)) map.set(k, e);
    });
  for (const e of entries) {
    add(words, e.match.words, e);
    add(calls, e.match.calls, e);
    add(ops, e.match.ops, e);
    add(directives, e.match.directives, e);
  }

  /** The entry a token stands for, given the tokens before it (for "Serial" "." "printf"). */
  const lookup = (tokens: Line, k: number): GlossaryEntry | undefined => {
    const t = tokens[k];
    if (!t) return undefined;
    switch (t.kind) {
      case "preproc":
        return directives.get(t.text.replace(/\s+/g, ""));
      case "op":
        return ops.get(t.text);
      case "function": {
        const dot = tokens[k - 1]?.text;
        const owner = tokens[k - 2]?.text;
        if ((dot === "." || dot === "->" || dot === "::") && owner) {
          const qualified = calls.get(`${owner}${dot === "::" ? "::" : "."}${t.text}`);
          if (qualified) return qualified;
        }
        return calls.get(t.text) ?? words.get(t.text);
      }
      case "keyword":
      case "type":
      case "constant":
      case "ident":
        return words.get(t.text);
      default:
        return undefined;
    }
  };

  return {
    entries,
    byId,
    find(line) {
      const tokens = meaningful(line);
      const found: string[] = [];
      tokens.forEach((_, k) => {
        const e = lookup(tokens, k);
        if (e && !found.includes(e.id)) found.push(e.id);
      });
      return found;
    },
    annotate(line) {
      const tokens = meaningful(line);
      const ids = new Map(tokens.map((t, k) => [t, lookup(tokens, k)?.id]));
      return line.map((t) => ids.get(t));
    },
    entryAt(line, tokenIndex) {
      const target = line[tokenIndex];
      if (!target) return undefined;
      const tokens = meaningful(line);
      const k = tokens.indexOf(target);
      return k < 0 ? undefined : lookup(tokens, k);
    },
  };
}
