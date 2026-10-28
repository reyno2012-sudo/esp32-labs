import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBoardRgb } from "@/features/board/board-signals";
import { useInterval } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { Tone } from "@/ui/terminal/terminal-log";
import type { WidgetProps } from "@/widgets/types";
import styles from "./intro.module.css";
import { wheel } from "./rainbow";

const IDENTITY_CARD: readonly (readonly [string, Tone])[] = [
  ["ESP-ROM:esp32s3-20210327", "plain"],
  ["", "plain"],
  ["+---------------- ESP32 identity card ----------------+", "plain"],
  ["| chip      ESP32-S3 rev 2, 2 cores @ 240 MHz", "plain"],
  ["| flash     16 MB   (the N16 part: expect 16)", "plain"],
  ["| psram     8 MB   (the R8 part: expect ~8)", "plain"],
  ["| free heap 337 KB", "plain"],
  ["| mac       E43B9E858428", "plain"],
  ["| sdk       v5.5.5", "plain"],
  ["+-----------------------------------------------------+", "plain"],
  ["[I][main.cpp:60] setup(): RGB LED on GPIO 48. You should see a slow rainbow.", "info"],
];

/** Lesson 01 preview: the identity card, a heartbeat, and the RGB LED cycling on the board. */
export function HelloPreview(_: WidgetProps) {
  const { t } = useTranslation("labs-intro");
  const term = useTerminalLog();
  const setRgb = useBoardRgb();
  const reduce = useReducedMotion();
  const hue = useRef(0);
  const seconds = useRef(0);
  const swatch = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timers = IDENTITY_CARD.map(([text, tone], i) =>
      setTimeout(() => term.line(text, tone), 140 * i),
    );
    return () => {
      timers.forEach(clearTimeout);
      term.clear();
    };
  }, [term]);

  useInterval(() => {
    seconds.current += 5;
    term.line(
      `[I][main.cpp:76] loop(): alive for ${seconds.current}s, hue=${hue.current & 255}`,
      "info",
    );
  }, 5000);

  // Same speed as the firmware (one step per 20 ms), slower and coarser with reduced motion.
  useInterval(
    () => {
      hue.current = (hue.current + (reduce ? 8 : 1)) & 255;
      const [r, g, b] = wheel(hue.current);
      const color = `rgb(${r} ${g} ${b})`;
      setRgb({ color, glow: true });
      // The phone layout puts the board below the preview, so the LED is mirrored here too.
      swatch.current?.style.setProperty("background", color);
    },
    reduce ? 300 : 20,
  );

  return (
    <div className={styles.sim}>
      <Terminal log={term} title="$ uv run pio device monitor" />
      <div className={styles.ledLine}>
        <span ref={swatch} className={styles.swatch} aria-hidden="true" />
        <Caption>{t("hello.caption")}</Caption>
      </div>
    </div>
  );
}
