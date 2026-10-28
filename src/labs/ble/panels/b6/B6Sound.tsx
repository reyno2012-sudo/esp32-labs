import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import styles from "../panels.module.css";
import { SvgPainter } from "../svg";
import { drawSound, MediaScene, type MediaKey, USAGE } from "./draw-sound";

const KEYS: readonly MediaKey[] = ["play", "next", "down", "up"];

/** B6: board → phone (BLE HID) → speaker (Classic A2DP), and why board → speaker fails. */
export function B6Sound(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  const [scene] = useState(() => new MediaScene());
  // What the caption explains: nothing yet, the last media key, or the direct path.
  const [cap, setCap] = useState<MediaKey | "direct" | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useFrameLoop(svgRef, ({ now }) => {
    if (svgRef.current) drawSound(new SvgPainter(svgRef.current), scene, now, reduce, t);
  });

  function press(key: MediaKey) {
    scene.press(key);
    // The phone reacts once the report has arrived.
    const id = setTimeout(
      () => {
        timers.current.delete(id);
        scene.apply(key);
      },
      reduce ? 0 : 640,
    );
    timers.current.add(id);
    setCap(key);
  }

  return (
    <div className={styles.wd}>
      <ButtonRow role="group" aria-label={t("sound.keys")}>
        {KEYS.map((k) => (
          <Button key={k} onClick={() => press(k)}>
            {t(`sound.key.${k}`)}
          </Button>
        ))}
        <Button
          onClick={() => {
            scene.press("direct");
            setCap("direct");
          }}
        >
          {t("sound.directButton")}
        </Button>
      </ButtonRow>
      <div className={styles.scroll}>
        <svg
          ref={svgRef}
          viewBox="0 0 680 230"
          className={styles.full}
          direction="ltr"
          role="img"
          aria-label={t("sound.aria")}
        />
      </div>
      <Caption live>
        {cap === null
          ? t("sound.start")
          : cap === "direct"
            ? t("sound.direct")
            : t("sound.sent", { usage: USAGE[cap] })}
      </Caption>
    </div>
  );
}
