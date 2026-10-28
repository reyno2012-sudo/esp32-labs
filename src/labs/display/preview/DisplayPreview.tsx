import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { context2d, SCREEN_H, SCREEN_W } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import { ScreenFrame } from "@/ui/ScreenFrame";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { WidgetProps } from "@/widgets/types";
import styles from "../display.module.css";
import { COLOUR_CHECK_MS, displayPalette, drawColourCheck, drawScope } from "./display-scope";

const FPS_LOG_MS = 5000;

/** What the screen shows; each phase's caption is preview.captions.<phase> in labs-display. */
type Phase = "check" | "scope";

/** Lesson 03 preview: the ST7789's colour check, then the bench scope, plus its serial output. */
export function DisplayPreview(_: WidgetProps) {
  const { t } = useTranslation("labs-display");
  const term = useTerminalLog();
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("check");
  // Frame-loop bookkeeping: when the board "powered on", a smoothed fps, the last fps log line.
  const clock = useRef({ t0: 0, fps: 0, lastLog: 0, scope: false });

  useEffect(() => {
    clock.current = { t0: performance.now(), fps: 0, lastLog: 0, scope: false };
    term.line("[I][main.cpp:116] setup(): Display ready: 320x170 over SPI at 40 MHz", "info");
    term.line(
      "[I][main.cpp:76] colourCheck(): Colour check on screen. Left->right should read red, green, blue.",
      "info",
    );
    return () => term.clear();
  }, [term]);

  useFrameLoop(canvasRef, ({ now, dt }) => {
    const canvas = canvasRef.current;
    const c = clock.current;
    if (!canvas || !c.t0) return;
    const g = context2d(canvas);
    const C = displayPalette();
    const elapsed = now - c.t0;
    if (dt > 0) c.fps = c.fps * 0.9 + Math.min(60, 1 / dt) * 0.1;
    if (elapsed < COLOUR_CHECK_MS) {
      drawColourCheck(g, C);
      return;
    }
    if (!c.scope) {
      c.scope = true;
      term.line("[I][main.cpp:127] setup(): Frame buffer: 106 KB, PSRAM free: 8085 KB", "info");
      setPhase("scope");
    }
    drawScope(g, C, reduce ? 0 : elapsed / 1000, elapsed, c.fps);
    if (now - c.lastLog > FPS_LOG_MS) {
      c.lastLog = now;
      term.line(`[I][main.cpp:156] loop(): ${(21.6 + Math.random() * 0.8).toFixed(1)} fps`, "info");
    }
  });

  return (
    <div className={styles.sim}>
      <ScreenFrame>
        <canvas
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          role="img"
          aria-label={t("preview.aria")}
          dir="ltr"
        />
      </ScreenFrame>
      <Caption live>{t(`preview.captions.${phase}`)}</Caption>
      <Terminal log={term} title="$ uv run pio device monitor" />
    </div>
  );
}
