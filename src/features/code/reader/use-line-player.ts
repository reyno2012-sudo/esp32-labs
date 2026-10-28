import { useState } from "react";
import type { Span } from "@/domain/code/analyze";
import { PACE_MS } from "@/features/settings/settings";
import { useSettings } from "@/features/settings/settings-store";
import { useInterval } from "@/lib/animation";
import { codeProgress } from "../code-progress";
import type { CodeFile } from "../lab-code";
import { playableLines, stepLine } from "../reader-logic";

export interface LinePlayer {
  /** The line being explained, or null when not stepping. */
  readonly cursor: number | null;
  readonly playing: boolean;
  /** How many lines the player stops on. */
  readonly count: number;
  play(): void;
  pause(): void;
  step(direction: 1 | -1): void;
}

/**
 * Steps through a span line by line, by hand or at the pace set in Settings. Every line it
 * shows counts as read. It resets itself when the span (a stop, a scene) changes.
 */
export function useLinePlayer(env: string, file: CodeFile, span: Span | null): LinePlayer {
  const { pace } = useSettings();
  const [cursor, setCursor] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const key = span ? `${file.path}:${span.start}-${span.end}` : "";
  const [forKey, setForKey] = useState(key);
  if (forKey !== key) {
    setForKey(key);
    setCursor(null);
    setPlaying(false);
  }
  const lines = span ? playableLines(file, span.start, span.end) : [];

  const show = (line: number) => {
    setCursor(line);
    codeProgress.readLines(env, file.path, [line]);
  };
  const step = (direction: 1 | -1) => {
    const line = stepLine(lines, cursor, direction);
    if (line === null) setPlaying(false);
    else show(line);
  };
  useInterval(() => step(1), playing ? PACE_MS[pace] : null);

  return {
    cursor,
    playing,
    count: lines.length,
    play() {
      if (cursor === null || cursor === lines.at(-1)) {
        const first = lines[0];
        if (first === undefined) return;
        show(first);
      }
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    step,
  };
}
