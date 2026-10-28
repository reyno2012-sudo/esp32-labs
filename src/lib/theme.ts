import { createPersistentStore, useStore } from "./storage";

// Themes are CSS token sets (src/styles/tokens.css) switched by data-theme on <html>.
// "system" follows the OS. Adding a theme = a token block in tokens.css + an entry here.
export const THEMES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEMES)[number];

const store = createPersistentStore<ThemeChoice>("esp-theme", "system");

let epoch = 0;
const epochListeners = new Set<() => void>();
const bumpEpoch = () => {
  epoch++;
  epochListeners.forEach((l) => l());
};

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/** Applies the saved theme before React renders, so the first paint has the right colours. */
export function initTheme(): void {
  apply(store.get());
  store.subscribe(() => {
    apply(store.get());
    bumpEpoch();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", bumpEpoch);
}

export const themeStore = store;
export const useTheme = () => useStore(store);

/**
 * Changes whenever the resolved colours may have changed (theme switch or OS dark mode).
 * Canvas code keys its palette cache on it instead of re-reading CSS every frame.
 */
export const themeEpoch = () => epoch;
export const onThemeChange = (listener: () => void) => {
  epochListeners.add(listener);
  return () => epochListeners.delete(listener);
};
