import { createPersistentStore, useStore } from "@/lib/storage";

// What you have read, per firmware environment: tour stops you visited and lines you opened.
// "Understood" is the share of the lab's code lines covered by those. Plus the C++ words you met.
export interface EnvProgress {
  readonly stops: readonly string[];
  /** Story scenes you have visited. */
  readonly scenes?: readonly string[];
  /** path → 0-based lines you opened with the line lens or the line-by-line player. */
  readonly lines: Readonly<Record<string, readonly number[]>>;
}

type ProgressMap = Readonly<Record<string, EnvProgress>>;
const EMPTY: EnvProgress = { stops: [], lines: {} };

const progress = createPersistentStore<ProgressMap>("esp-code-progress", {});
const words = createPersistentStore<Readonly<Record<string, number>>>("esp-code-words", {});

const update = (env: string, change: (p: EnvProgress) => EnvProgress) =>
  progress.set((prev) => ({ ...prev, [env]: change(prev[env] ?? EMPTY) }));

export const codeProgress = {
  visitStop(env: string, stopId: string) {
    if ((progress.get()[env] ?? EMPTY).stops.includes(stopId)) return;
    update(env, (p) => ({ ...p, stops: [...p.stops, stopId] }));
  },
  visitScene(env: string, sceneId: string) {
    if ((progress.get()[env] ?? EMPTY).scenes?.includes(sceneId)) return;
    update(env, (p) => ({ ...p, scenes: [...(p.scenes ?? []), sceneId] }));
  },
  readLines(env: string, path: string, lines: readonly number[]) {
    const known = new Set((progress.get()[env] ?? EMPTY).lines[path] ?? []);
    const fresh = lines.filter((l) => !known.has(l));
    if (!fresh.length) return;
    update(env, (p) => ({
      ...p,
      lines: { ...p.lines, [path]: [...(p.lines[path] ?? []), ...fresh] },
    }));
  },
  meetWords(ids: readonly string[]) {
    const seen = words.get();
    if (ids.every((id) => seen[id])) return;
    words.set((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
  },
  resetReading() {
    progress.set({});
  },
  resetWords() {
    words.set({});
  },
};

export const useEnvProgress = (env: string): EnvProgress => useStore(progress)[env] ?? EMPTY;
export const useAllProgress = () => useStore(progress);
export const useMetWords = () => useStore(words);
