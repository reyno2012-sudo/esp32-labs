import { buildStory, type Story, type StoryOptions } from "@/domain/code/story";
import type { Level } from "@/features/settings/settings";
import type { LabCode } from "../lab-code";

// How far the story follows calls at each level: a beginner meets the main characters, a deep
// diver follows every thread down into the drivers.
export const STORY_DEPTH: Readonly<Record<Level, StoryOptions>> = {
  beginner: { maxDepth: 2, maxScenes: 14, leftovers: true },
  explorer: { maxDepth: 3, maxScenes: 32, leftovers: true },
  deep: { maxDepth: 6, maxScenes: 90, leftovers: true },
};

const cache = new WeakMap<LabCode, Map<Level, Story>>();

/** The lab's story at a level; built once per lab and level. */
export function storyOf(lab: LabCode, level: Level): Story {
  let byLevel = cache.get(lab);
  if (!byLevel) {
    byLevel = new Map();
    cache.set(lab, byLevel);
  }
  let story = byLevel.get(level);
  if (!story) {
    story = buildStory(lab.symbols, STORY_DEPTH[level]);
    byLevel.set(level, story);
  }
  return story;
}
