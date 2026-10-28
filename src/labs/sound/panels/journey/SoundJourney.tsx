import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { context2d, scopePalette } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import type { WidgetProps } from "@/widgets/types";
import { drawJourney } from "./journey-draw";
import { type JourneyLab, LABS } from "./journey-data";
import styles from "./journey.module.css";

function Parts({ lab }: { lab: JourneyLab }) {
  const { t } = useTranslation("labs-sound");
  return (
    <span className={styles.parts}>
      {lab.need.map((k) => (
        <span key={k} className={styles.need}>
          {t(`journey.parts.${k}`)}
        </span>
      ))}
      {(lab.opt ?? []).map((k) => (
        <span key={k} className={styles.opt}>
          {t("journey.optional", { part: t(`journey.parts.${k}`) })}
        </span>
      ))}
    </span>
  );
}

/** S1 panel: the whole track at a glance, and the signal path of the lab you pick. */
export function SoundJourney(_: WidgetProps) {
  const { t } = useTranslation("labs-sound");
  const [pick, setPick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useFrameLoop(canvasRef, ({ now }) => {
    const node = canvasRef.current;
    const lab = LABS[pick];
    if (!node || !lab) return;
    const text = {
      title: t(`journey.labs.${lab.id}.title`),
      what: t(`journey.labs.${lab.id}.what`),
      out: t(`journey.labs.${lab.id}.out`),
      noMic: t("journey.path.noMic"),
      adcOrI2s: t("journey.path.adcOrI2s"),
      withSpeaker: t("journey.path.withSpeaker"),
    };
    drawJourney(context2d(node), scopePalette(), lab, text, reduce ? 0.4 : now / 1000);
  });

  return (
    <div className={styles.wd}>
      <ul className={styles.journey}>
        {LABS.map((l, i) => (
          <li key={l.id}>
            <button
              type="button"
              className={styles.stop}
              aria-pressed={i === pick}
              onClick={() => setPick(i)}
            >
              <b>{l.id}</b>
              <span className={styles.t}>{t(`journey.labs.${l.id}.title`)}</span>
              <span className={styles.w}>{t(`journey.labs.${l.id}.what`)}</span>
              <span className={styles.o}>{t("journey.output", { out: t(`journey.labs.${l.id}.out`) })}</span>
              <Parts lab={l} />
            </button>
          </li>
        ))}
      </ul>
      <canvas
        ref={canvasRef}
        width={680}
        height={120}
        role="img"
        dir="ltr"
        className={styles.canvas}
        aria-label={t("journey.canvasLabel")}
      />
    </div>
  );
}
