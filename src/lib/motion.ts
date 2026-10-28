import { createPersistentStore, useStore } from "./storage";

// "Follow my device" uses prefers-reduced-motion; "Calm" turns animations down on any device.
// The choice lands on <html data-motion>, which base.css and the animation hooks read.
export const MOTION_CHOICES = ["system", "calm"] as const;
export type MotionChoice = (typeof MOTION_CHOICES)[number];

const store = createPersistentStore<MotionChoice>("esp-motion", "system");

function apply(choice: MotionChoice) {
  const root = document.documentElement;
  if (choice === "calm") root.setAttribute("data-motion", "reduced");
  else root.removeAttribute("data-motion");
}

/** Applies the saved choice before React renders. */
export function initMotion(): void {
  apply(store.get() === "calm" ? "calm" : "system");
  store.subscribe(() => apply(store.get()));
}

export const motionStore = store;
export const useMotionChoice = () => useStore(store);
