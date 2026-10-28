import { useTranslation } from "react-i18next";
import { type KeyboardEvent, type PointerEvent, useEffect, useEffectEvent, useRef } from "react";
import { Button, ButtonRow } from "@/ui/Button";
import own from "./B8Decoder.module.css";

export interface MouseMove {
  dx: number;
  dy: number;
  buttons: number;
  wheel: number;
  /** Fly the report in and light its fields one by one (buttons), or show it at once (drags). */
  animate?: boolean;
}

const clamp12 = (v: number) => Math.max(-2047, Math.min(2047, v));
const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-40, 0],
  ArrowRight: [40, 0],
  ArrowUp: [0, -40],
  ArrowDown: [0, 40],
};

/** A pad that turns pointer movement into relative mouse reports, at most one per 60 ms. */
export function MousePad({
  onMove,
  onClickButton,
}: {
  onMove(m: MouseMove): void;
  onClickButton(buttons: number): void;
}) {
  const { t } = useTranslation("labs-ble");
  const padRef = useRef<HTMLDivElement>(null);
  const last = useRef<[number, number] | null>(null);
  const lastSent = useRef(0);
  const buttons = useRef(0);

  // The wheel needs a non-passive listener to keep the page from scrolling.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault();
    onMove({ dx: 0, dy: 0, buttons: buttons.current, wheel: e.deltaY < 0 ? 1 : -1 });
  });
  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    const listener = (e: WheelEvent) => onWheel(e);
    pad.addEventListener("wheel", listener, { passive: false });
    return () => pad.removeEventListener("wheel", listener);
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = [e.clientX, e.clientY];
    buttons.current = e.button === 2 ? 2 : e.button === 1 ? 4 : 1;
    onMove({ dx: 0, dy: 0, buttons: buttons.current, wheel: 0 });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const from = last.current;
    if (!from) {
      last.current = [e.clientX, e.clientY];
      return;
    }
    const now = performance.now();
    if (now - lastSent.current < 60) return;
    const dx = Math.round((e.clientX - from[0]) * 4);
    const dy = Math.round((e.clientY - from[1]) * 4);
    if (!dx && !dy) return;
    last.current = [e.clientX, e.clientY];
    lastSent.current = now;
    onMove({ dx: clamp12(dx), dy: clamp12(dy), buttons: buttons.current, wheel: 0 });
  };
  const up = () => {
    buttons.current = 0;
    onMove({ dx: 0, dy: 0, buttons: 0, wheel: 0 });
  };
  // Arrow keys move too, for keyboards.
  const key = (e: KeyboardEvent) => {
    const step = ARROWS[e.key];
    if (!step) return;
    e.preventDefault();
    onMove({ dx: step[0], dy: step[1], buttons: 0, wheel: 0 });
  };

  return (
    <div className={own.mouse}>
      {/* A pointer surface (role application) with its own keys: the arrow keys move the cursor. */}
      {/* eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions */}
      <div
        ref={padRef}
        className={own.pad}
        role="application"
        aria-label={t("pad.aria")}
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={() => (last.current = null)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={key}
      >
        {t("pad.hint")}
      </div>
      <ButtonRow>
        <Button onClick={() => onClickButton(1)}>{t("pad.left")}</Button>
        <Button onClick={() => onClickButton(2)}>{t("pad.right")}</Button>
        <Button onClick={() => onMove({ dx: 0, dy: 0, buttons: 0, wheel: 1, animate: true })}>
          {t("pad.wheelUp")}
        </Button>
        <Button onClick={() => onMove({ dx: 0, dy: 0, buttons: 0, wheel: -1, animate: true })}>
          {t("pad.wheelDown")}
        </Button>
      </ButtonRow>
    </div>
  );
}
