import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { context2d, scopePalette } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import styles from "../panels.module.css";
import { drawTiming, TIMING_H, TIMING_W } from "./draw-timing";
import { lockstep, type TimingSettings, TimingSim } from "./timing-sim";

interface Slider {
  readonly key: "adv" | "si" | "win";
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

// Labels: timing.sliders.<key>.label / .aria.
const SLIDERS: readonly Slider[] = [
  { key: "adv", min: 20, max: 1000, step: 10 },
  { key: "si", min: 30, max: 400, step: 10 },
  { key: "win", min: 5, max: 100, step: 5 },
];

/** B2: advertising timing against a scanner's listening windows. */
export function B2Timing(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  const [values, setValues] = useState({ adv: 100, si: 100, win: 30 });
  const [delay, setDelay] = useState(true);
  const [playing, setPlaying] = useState(!reduce);
  const [sim] = useState(() => new TimingSim());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The result line changes with every event: written by the frame loop into empty nodes.
  const countRef = useRef<HTMLElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);
  const warnRef = useRef<HTMLElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const delayId = useId();

  const settings: TimingSettings = {
    adv: values.adv,
    si: values.si,
    win: Math.round((values.si * values.win) / 100),
    delay,
  };
  const ms = (value: number) => t("timing.ms", { value });
  const shown = { adv: ms(settings.adv), si: ms(settings.si), win: ms(settings.win) };

  useFrameLoop(canvasRef, ({ dt }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // A quarter of real speed, so single events stay visible.
    sim.advance(playing ? Math.min(dt * 1000, 50) * 0.25 : 0, settings);
    drawTiming(context2d(canvas), scopePalette(), sim, settings, t);
    const pct = sim.total ? Math.round((sim.caught / sim.total) * 100) : 0;
    const stuck = lockstep(settings);
    if (countRef.current)
      countRef.current.textContent = t("timing.count", { caught: sim.caught, total: sim.total });
    if (restRef.current) {
      const listen = Math.round((settings.win / settings.si) * 100);
      restRef.current.textContent = ` ${
        sim.firstCatch !== null
          ? t("timing.restFirst", { pct, listen, first: Math.round(sim.firstCatch) })
          : t("timing.rest", { pct, listen })
      } `;
    }
    if (warnRef.current) warnRef.current.textContent = stuck ? t("timing.stuck") : "";
    if (tailRef.current)
      tailRef.current.textContent = stuck ? ` ${t("timing.stuckWhy")}` : t("timing.longer");
  });

  return (
    <div className={styles.wd}>
      <div className={styles.ctl}>
        {SLIDERS.map((s) => (
          <label key={s.key}>
            {t(`timing.sliders.${s.key}.label`)}
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={values[s.key]}
              aria-label={t(`timing.sliders.${s.key}.aria`)}
              onChange={(e) => {
                setValues((v) => ({ ...v, [s.key]: Number(e.target.value) }));
                sim.reset();
              }}
            />
            <b className={styles.mono}>{shown[s.key]}</b>
          </label>
        ))}
        <label htmlFor={delayId}>
          <input
            id={delayId}
            type="checkbox"
            checked={delay}
            onChange={(e) => {
              setDelay(e.target.checked);
              sim.reset();
            }}
          />{" "}
          {t("timing.delay")}
        </label>
        <Button aria-label={playing ? t("controls.pauseAria") : t("controls.playAria")} onClick={() => setPlaying((p) => !p)}>
          {playing ? "❚❚" : "▶"}
        </Button>
      </div>
      <div className={styles.scroll}>
        <canvas
          ref={canvasRef}
          width={TIMING_W}
          height={TIMING_H}
          className={styles.full}
          dir="ltr"
          role="img"
          aria-label={t("timing.aria")}
        />
      </div>
      <p className={styles.field}>
        <b ref={countRef} />
        <span ref={restRef} />
        <b ref={warnRef} />
        <span ref={tailRef} />
      </p>
    </div>
  );
}
