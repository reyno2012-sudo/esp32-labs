import { type RefObject, useEffect, useEffectEvent } from "react";

export interface FrameInfo {
  /** requestAnimationFrame timestamp, ms. */
  readonly now: number;
  /** Seconds since the previous frame, clamped to 0.1 s so a paused loop never jumps. */
  readonly dt: number;
}

/**
 * Runs `onFrame` on every animation frame while `target` is on screen. Lessons stack many
 * animated panels, so off-screen ones sleep instead of burning the CPU and battery.
 * `onFrame` always sees the latest props and state (it is an Effect Event).
 */
export function useFrameLoop(
  target: RefObject<Element | null>,
  onFrame: (frame: FrameInfo) => void,
  active = true,
): void {
  const tick = useEffectEvent(onFrame);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      tick({ now, dt });
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const node = target.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      start();
      return stop;
    }
    const observer = new IntersectionObserver(([entry]) =>
      entry?.isIntersecting ? start() : stop(),
    );
    observer.observe(node);
    return () => {
      stop();
      observer.disconnect();
    };
  }, [active, target]);
}

/** Calls `onTick` every `ms` while active (an Effect Event, so it sees fresh state). */
export function useInterval(onTick: () => void, ms: number | null): void {
  const tick = useEffectEvent(onTick);
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => tick(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
