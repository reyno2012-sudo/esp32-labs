import { useSyncExternalStore } from "react";
import { createLogger } from "./logger";

const log = createLogger("storage");

// localStorage can be missing or throw (private windows, blocked site data, previews), so every
// access is guarded and the app still works, just without memory between visits.
export const safeStorage = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch (error) {
      log.debug("read failed", { key, error: String(error) });
      return fallback;
    }
  },
  write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      log.debug("write failed", { key, error: String(error) });
    }
  },
};

export interface PersistentStore<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

/**
 * A tiny external store backed by localStorage. Components read it with useStore(), so every
 * reader re-renders together, and other tabs stay in sync through the `storage` event.
 */
export function createPersistentStore<T>(key: string, fallback: T): PersistentStore<T> {
  let value = safeStorage.read(key, fallback);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const onStorage = (e: StorageEvent) => {
    if (e.key !== key) return;
    value = safeStorage.read(key, fallback);
    emit();
  };
  return {
    get: () => value,
    set(next) {
      value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      safeStorage.write(key, value);
      emit();
    },
    subscribe(listener) {
      if (listeners.size === 0) window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export function useStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
