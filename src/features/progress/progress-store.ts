import type { Ticks } from "@/domain/progress";
import { createPersistentStore, useStore } from "@/lib/storage";

// Your progress lives in this browser only (like the original guide): ticked steps, the lesson
// you were on, and the variant you picked per lesson. Keys match the single-file guide.
const ticks = createPersistentStore<Ticks>("esp-ticks", {});
const lastLesson = createPersistentStore<string | null>("esp-lesson", null);
const variants = createPersistentStore<Readonly<Record<string, string>>>("esp-variants", {});

export const progress = {
  ticks,
  lastLesson,
  variants,
  setTick(key: string, done: boolean) {
    ticks.set((prev) => ({ ...prev, [key]: done }));
  },
  setVariant(lessonId: string, key: string) {
    variants.set((prev) => ({ ...prev, [lessonId]: key }));
  },
};

export const useTicks = () => useStore(ticks);
export const useVariants = () => useStore(variants);
