import { useSyncExternalStore } from "react";
import { motionStore, useMotionChoice } from "./motion";

// One subscribe function per query, so useSyncExternalStore never resubscribes on re-render.
const subscribers = new Map<string, (listener: () => void) => () => void>();

function subscribeTo(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = (listener) => {
      const mql = matchMedia(query);
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
}

/** Live result of a CSS media query. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeTo(query),
    () => matchMedia(query).matches,
    () => false,
  );
}

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** For code outside render (animation loops, event handlers). Honours the "Calm" setting too. */
export const prefersReducedMotion = () =>
  motionStore.get() === "calm" || matchMedia(REDUCED_MOTION).matches;

/** True when the device asks for less motion or the reader chose "Calm" in Settings. */
export function useReducedMotion(): boolean {
  const device = useMediaQuery(REDUCED_MOTION);
  return useMotionChoice() === "calm" || device;
}
