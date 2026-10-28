import { useEffect, useState } from "react";

/**
 * A pool of timeouts tied to the component: whatever a preview scheduled (a busy job's ticks,
 * a copy finishing) stops when it closes. Returns `after(ms, fn)`.
 */
export function useTimers(): (ms: number, fn: () => void) => void {
  const [timers] = useState(() => new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.forEach(clearTimeout), [timers]);
  return (ms, fn) => {
    const handle = setTimeout(() => {
      timers.delete(handle);
      fn();
    }, ms);
    timers.add(handle);
  };
}
