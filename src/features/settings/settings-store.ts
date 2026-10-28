import { createLogger } from "@/lib/logger";
import { createPersistentStore, useStore } from "@/lib/storage";
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from "./settings";

const log = createLogger("settings");
const raw = createPersistentStore<unknown>("esp-code-settings", DEFAULT_SETTINGS);

// One normalized object per stored value, so useSyncExternalStore sees a stable snapshot.
let lastRaw: unknown;
let lastSettings: Settings = DEFAULT_SETTINGS;
const read = (): Settings => {
  const value = raw.get();
  if (value !== lastRaw) {
    lastRaw = value;
    lastSettings = normalizeSettings(value);
  }
  return lastSettings;
};

export const settingsStore = {
  get: read,
  subscribe: raw.subscribe,
  set(next: Settings | ((prev: Settings) => Settings)) {
    raw.set(typeof next === "function" ? next(read()) : next);
  },
  change<K extends keyof Settings>(key: K, value: Settings[K]) {
    log.info("setting changed", { key, value });
    this.set((prev) => ({ ...prev, [key]: value }));
  },
  reset() {
    log.info("settings reset");
    raw.set(DEFAULT_SETTINGS);
  },
};

export const useSettings = (): Settings => useStore(settingsStore);
