import { useEffect, useEffectEvent, useState } from "react";
import { INITIAL_SCROLL, nextScrollChrome, type ScrollChrome, type ScrollMemory } from "./scroll-chrome";

const AT_TOP: ScrollChrome = { away: false, hidden: false };

/**
 * Follows the page scroll (one passive listener, at most once per frame) and re-renders only when
 * the chrome's form changes, not on every scroll event. See scroll-chrome.ts for the rules.
 *
 * @param isAway whether a scroll position is past the chrome's place at the top (it may measure
 *               the chrome itself, for something that sticks)
 * @param travel how far (px) to scroll one way before it hides or returns
 */
export function useScrollChrome(isAway: (scrollY: number) => boolean, travel = 12): ScrollChrome {
  const [chrome, setChrome] = useState<ScrollChrome>(AT_TOP);
  const away = useEffectEvent(isAway);

  useEffect(() => {
    let memory: ScrollMemory = INITIAL_SCROLL;
    let frame = 0;

    const read = () => {
      frame = 0;
      // Elastic overscroll (iOS, trackpads) reports positions outside the page: clamp them.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.min(Math.max(window.scrollY, 0), Math.max(max, 0));
      memory = nextScrollChrome(memory, y, away(y), travel);
      const next = { away: memory.away, hidden: memory.hidden };
      setChrome((c) => (c.away === next.away && c.hidden === next.hidden ? c : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    frame = requestAnimationFrame(read);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [travel]);

  return chrome;
}
