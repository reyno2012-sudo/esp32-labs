import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

// Simulators light up parts of the board drawing (the RGB LED next to the chip), like the real
// firmware does. They write to this store; only the LED in <BoardPinout> subscribes to it, so a
// 60 fps colour change re-renders one circle, not the page.

export interface RgbState {
  /** Any CSS colour, including var(--token). */
  readonly color: string;
  readonly glow?: boolean;
  /** Radius scale: >1 for a flash. */
  readonly scale?: number;
}

export class BoardSignals {
  #rgb: RgbState | null = null;
  #listeners = new Set<() => void>();

  setRgb = (next: RgbState | null) => {
    if (
      next?.color === this.#rgb?.color &&
      next?.glow === this.#rgb?.glow &&
      next?.scale === this.#rgb?.scale
    )
      return;
    this.#rgb = next;
    this.#listeners.forEach((l) => l());
  };

  getRgb = () => this.#rgb;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };
}

const BoardSignalsContext = createContext<BoardSignals | null>(null);

export function BoardSignalsProvider({ children }: { children: ReactNode }) {
  const [signals] = useState(() => new BoardSignals());
  return <BoardSignalsContext value={signals}>{children}</BoardSignalsContext>;
}

function useSignals(): BoardSignals {
  const signals = use(BoardSignalsContext);
  if (!signals) throw new Error("useBoardRgb needs a <BoardSignalsProvider>");
  return signals;
}

/** For the board drawing: the RGB LED's current state. */
export function useRgbState(): RgbState | null {
  const s = useSignals();
  return useSyncExternalStore(s.subscribe, s.getRgb, s.getRgb);
}

/**
 * For simulators: a setter for the board's RGB LED. The LED goes dark again when the
 * simulator unmounts, so the next lesson starts clean.
 */
export function useBoardRgb(): (next: RgbState | null) => void {
  const s = useSignals();
  useEffect(() => () => s.setRgb(null), [s]);
  return s.setRgb;
}
