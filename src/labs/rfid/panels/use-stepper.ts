import { useState } from "react";
import { useInterval } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";

/**
 * A step counter that plays on its own every `ms` (paused from the start with reduced motion).
 * Back/Next stop the playback, like the original walk-throughs.
 */
export function useStepper(count: number, ms: number) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const wrap = (i: number) => ((i % count) + count) % count;
  const current = Math.min(step, count - 1);

  useInterval(() => setStep((s) => wrap(Math.min(s, count - 1) + 1)), playing ? ms : null);

  return {
    step: current,
    playing,
    togglePlay: () => setPlaying((p) => !p),
    back: () => {
      setPlaying(false);
      setStep(wrap(current - 1));
    },
    next: () => {
      setPlaying(false);
      setStep(wrap(current + 1));
    },
    /** Jumps without stopping playback. */
    jump: setStep,
  };
}
