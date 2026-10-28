import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./media";

/**
 * Which of the given sections you are reading: the first one crossing a band a little below the
 * top of the viewport (under the sticky dock). Ids are DOM ids, in page order.
 */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join(" ");

  useEffect(() => {
    const order = key.split(" ");
    const crossing = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        const first = order.find((id) => crossing.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-22% 0px -68% 0px" },
    );
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key]);

  return active && ids.includes(active) ? active : ids[0];
}

/** Brings a section to the top (smoothly unless motion is turned down) and moves focus to it. */
export function goToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}
