import type { FunctionSymbol, ResolvedCall, SymbolIndex } from "./symbols";

// The program as a story instead of a pile of files: it starts where the board starts (setup),
// follows each call into the function it runs (whatever file that lives in), then does the same
// for loop. What is left over (handlers, helpers nobody calls directly) closes the story.

export type ActId = "start" | "forever" | "more";

export interface Scene {
  readonly id: string;
  readonly act: ActId;
  readonly fn: FunctionSymbol;
  /** 0 for setup/loop, 1 for what they call, and so on. */
  readonly depth: number;
  /** The calls that led here, outermost first (empty for setup/loop). */
  readonly trail: readonly FunctionSymbol[];
  /** Where the caller calls this function. */
  readonly calledAt?: { readonly path: string; readonly line: number };
  /** Callees that are scenes of their own, in call order. */
  readonly next: readonly string[];
  /** Short helpers it calls that are not scenes (one or two lines). */
  readonly helpers: readonly FunctionSymbol[];
  /** Callees already met in an earlier scene. */
  readonly seen: readonly FunctionSymbol[];
}

export interface Act {
  readonly id: ActId;
  readonly scenes: readonly Scene[];
}

export interface Story {
  readonly acts: readonly Act[];
  /** Every scene in reading order. */
  readonly scenes: readonly Scene[];
  readonly byId: ReadonlyMap<string, Scene>;
}

export interface StoryOptions {
  /** How many calls deep the story follows (1 = only what setup and loop call). */
  readonly maxDepth: number;
  /** Upper bound on scenes, so a big lab stays a story and not an index. */
  readonly maxScenes: number;
  /** Add an act with the lab's own functions the story did not reach. */
  readonly leftovers: boolean;
}

/** Short functions that call nothing of ours are mentioned, not visited: they end a thread. */
const HELPER_LINES = 2;
const bodyLines = (fn: FunctionSymbol) => Math.max(0, fn.block.end - fn.block.open - 1);
export const isHelper = (fn: FunctionSymbol, index: SymbolIndex) =>
  bodyLines(fn) <= HELPER_LINES && index.callees(fn).length === 0;

export function buildStory(index: SymbolIndex, options: StoryOptions): Story {
  const visited = new Set<string>();
  const all: Scene[] = [];
  const full = () => all.length >= options.maxScenes;

  /** Depth-first, in call order: the order the board actually runs things. */
  const walk = (
    act: ActId,
    fn: FunctionSymbol,
    depth: number,
    trail: readonly FunctionSymbol[],
    calledAt?: ResolvedCall,
  ): Scene | null => {
    if (visited.has(fn.id) || full()) return null;
    visited.add(fn.id);
    const next: string[] = [];
    const helpers: FunctionSymbol[] = [];
    const seen: FunctionSymbol[] = [];
    const scene: Scene = {
      id: `${act}:${fn.id}`,
      act,
      fn,
      depth,
      trail,
      ...(calledAt
        ? { calledAt: { path: trail.at(-1)?.path ?? fn.path, line: calledAt.site.line } }
        : {}),
      next,
      helpers,
      seen,
    };
    all.push(scene);
    for (const call of index.callees(fn)) {
      const target = call.target;
      if (visited.has(target.id)) {
        seen.push(target);
      } else if (isHelper(target, index) || depth + 1 > options.maxDepth) {
        helpers.push(target);
      } else {
        const child = walk(act, target, depth + 1, [...trail, fn], call);
        if (child) next.push(child.id);
      }
    }
    return scene;
  };

  const acts: { id: ActId; scenes: Scene[] }[] = [];
  const play = (id: ActId, entry: FunctionSymbol | undefined) => {
    if (!entry) return;
    const start = all.length;
    walk(id, entry, 0, []);
    acts.push({ id, scenes: all.slice(start) });
  };
  play("start", index.entry("setup"));
  play("forever", index.entry("loop"));

  if (options.leftovers && !full()) {
    const start = all.length;
    const rest = index.functions.filter(
      (f) => f.role === "lab" && !visited.has(f.id) && !isHelper(f, index),
    );
    for (const fn of rest) walk("more", fn, 0, []);
    if (all.length > start) acts.push({ id: "more", scenes: all.slice(start) });
  }

  return { acts, scenes: all, byId: new Map(all.map((s) => [s.id, s])) };
}
