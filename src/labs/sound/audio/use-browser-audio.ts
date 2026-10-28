import { useEffect, useSyncExternalStore } from "react";
import { browserAudio } from "./browser-audio";

/**
 * Keeps the browser audio output alive while the calling widget is mounted (it closes when the
 * last sound widget goes) and returns whether browser sound is on.
 */
export function useBrowserAudio(): boolean {
  useEffect(() => browserAudio.retain(), []);
  return useSyncExternalStore(browserAudio.subscribe, browserAudio.isOn, () => false);
}
