import { type ComponentProps, type KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "./BoardButton.module.css";

// The board's BOOT / push button, three ways: a plain look-alike, a press-and-hold that reports
// down/up, and a firmware-style button that decides click / double-click / hold itself.

type BoardButtonProps = Omit<ComponentProps<"button">, "type"> & {
  /** Drawn pushed in while held (pointer or key). */
  down: boolean;
};

/** The round, chunky button that stands in for BOOT or the push button. */
export function BoardButton({ down, className, ...rest }: BoardButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.bootBtn} ${down ? styles.down : ""} ${className ?? ""}`}
      {...rest}
    />
  );
}

const isPressKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";

type HoldButtonProps = Omit<
  BoardButtonProps,
  "onPointerDown" | "onPointerUp" | "onPointerCancel" | "onKeyDown" | "onKeyUp"
> & {
  onDown: () => void;
  /** Release; `cancelled` when the pointer was taken away (scroll, system gesture). */
  onUp: (cancelled: boolean) => void;
};

/** A BoardButton you press and hold (pointer, Space or Enter): `onDown`, then `onUp`. */
export function HoldButton({ onDown, onUp, ...rest }: HoldButtonProps) {
  return (
    <BoardButton
      {...rest}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onDown();
      }}
      onPointerUp={() => onUp(false)}
      onPointerCancel={() => onUp(true)}
      onKeyDown={(e) => {
        if (!isPressKey(e)) return;
        e.preventDefault();
        if (!e.repeat) onDown();
      }}
      onKeyUp={(e) => {
        if (!isPressKey(e)) return;
        e.preventDefault();
        onUp(false);
      }}
    />
  );
}

export type Press = "click" | "double" | "hold";

interface PushButtonProps {
  label: string;
  /** Accessible name: what click, double-click (and hold) do. */
  "aria-label": string;
  onPress: (press: Press) => void;
  /** A second click within this window is a double-click. */
  doubleMs: number;
  /** Held this long is a hold; without it a long press is just a click. */
  holdMs?: number;
}

/**
 * The push button as the firmware sees it: click, double-click and hold, decided the same way
 * (a click waits `doubleMs` for a second one).
 */
export function PushButton({ label, onPress, doubleMs, holdMs, ...aria }: PushButtonProps) {
  const [down, setDown] = useState(false);
  const downAt = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(clickTimer.current), []);

  function release(cancelled: boolean) {
    setDown(false);
    const held = downAt.current ? performance.now() - downAt.current : 0;
    const wasDown = downAt.current !== 0;
    downAt.current = 0;
    if (cancelled || !wasDown) return;
    if (holdMs !== undefined && held >= holdMs) return onPress("hold");
    if (clickTimer.current !== undefined) {
      clearTimeout(clickTimer.current);
      clickTimer.current = undefined;
      return onPress("double");
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = undefined;
      onPress("click");
    }, doubleMs);
  }

  return (
    <HoldButton
      down={down}
      onDown={() => {
        setDown(true);
        downAt.current = performance.now();
      }}
      onUp={release}
      {...aria}
    >
      {label}
    </HoldButton>
  );
}
