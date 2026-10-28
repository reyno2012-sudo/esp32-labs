import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { context2d, scopePalette } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import styles from "../panels.module.css";
import { drawRadio, RADIO_H, RADIO_W } from "./draw-radio";
import { RadioSim } from "./radio-sim";

type Mode = "passive" | "active";

/** B1: three advertising channels and a scanner's listening window. */
export function BleRadio(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  const [win, setWin] = useState(50);
  const [mode, setMode] = useState<Mode>("passive");
  const [playing, setPlaying] = useState(!reduce);
  const [sim] = useState(() => {
    const s = new RadioSim();
    s.step(600, 50);
    return s;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const winId = useId();

  useFrameLoop(canvasRef, ({ dt }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (playing) sim.step(Math.min(dt * 1000, 50) / 20, win);
    drawRadio(context2d(canvas), scopePalette(), sim, win, mode === "active", t);
  });

  return (
    <div className={styles.wd}>
      <div className={styles.ctl}>
        <label htmlFor={winId}>{t("radio.window")}</label>
        <input
          id={winId}
          type="range"
          min={10}
          max={100}
          step={10}
          value={win}
          aria-label={t("radio.windowAria")}
          onChange={(e) => {
            setWin(Number(e.target.value));
            sim.resetCounts();
          }}
        />
        <span className={styles.mono}>{t("radio.percent", { value: win })}</span>
        <select
          className={styles.select}
          aria-label={t("radio.mode")}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value === "active" ? "active" : "passive");
            sim.resetCounts();
          }}
        >
          <option value="passive">{t("radio.passive")}</option>
          <option value="active">{t("radio.active")}</option>
        </select>
        <Button onClick={() => setPlaying((p) => !p)}>{playing ? t("controls.pause") : t("controls.play")}</Button>
      </div>
      <div className={styles.scroll}>
        <canvas
          ref={canvasRef}
          width={RADIO_W}
          height={RADIO_H}
          className={styles.full}
          dir="ltr"
          role="img"
          aria-label={t("radio.aria")}
        />
      </div>
      <Caption live>
        {t("radio.caption", { value: win })}{" "}
        {mode === "active" ? t("radio.activeNote") : t("radio.passiveNote")}
      </Caption>
    </div>
  );
}
