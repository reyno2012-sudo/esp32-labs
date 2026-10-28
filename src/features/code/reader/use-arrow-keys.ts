import { useEffect, useEffectEvent } from "react";

/** ← and → call prev and next, unless you are typing or holding a modifier. */
export function useArrowKeys(prev: () => void, next: () => void): void {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]"))
      return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
