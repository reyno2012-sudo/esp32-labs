import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { useSimulation } from "../../shared/simulation";
import { FIELD, isHeard, isPowered, rangeAt, WUPA_SYMBOLS } from "../protocol/field";
import { StepCaption } from "../panels/StepCaption";
import styles from "./f3d.module.css";
import { buildFieldScene, initialField, sendWupa } from "./field-scene";
import { FieldChart } from "./FieldChart";
import { StageBox } from "@/ui/stage3d/StageBox";
import { useStage3d } from "@/ui/stage3d/use-stage";

/** R2 panel: the reader's field in 3D, a card at a chosen height and gain, and one wake-up. */
export function RfidField3d(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const [sim, snapshot] = useSimulation(initialField);
  const [spinning, setSpinning] = useState(() => !prefersReducedMotion());
  const ids = useId();
  const { boxRef, canvasRef, labelsRef, stageRef, status } = useStage3d(
    {
      target: { x: 0.6, y: 1.4, z: 0 },
      radius: 13,
      az: 0.9,
      el: 0.5,
      ground: { w: 11, d: 8, y: -0.17 },
    },
    (T, stage) =>
      buildFieldScene(T, stage, sim, {
        coil: t("field3d.labels.coil"),
        chip: t("field3d.labels.chip"),
        pins: t("field3d.labels.pins"),
        cardCoil: t("field3d.labels.cardCoil"),
        cardChip: t("field3d.labels.cardChip"),
      }),
  );
  const st = snapshot.state;
  const db = FIELD.gains[st.gain] ?? 33;
  const powered = isPowered(st.dist);
  const heard = isHeard(st.dist, db);
  const ready = status === "ready";

  return (
    <div className={styles.f3d}>
      <StageBox
        boxRef={boxRef}
        canvasRef={canvasRef}
        labelsRef={labelsRef}
        stageRef={stageRef}
        status={status}
        label={t("field3d.stage")}
        fallback={t("field3d.fallback")}
      />
      <div className={styles.ctl}>
        <label htmlFor={`${ids}d`}>
          {t("field3d.height")} <output htmlFor={`${ids}d`}>{st.dist} mm</output>
          <input
            id={`${ids}d`}
            type="range"
            min={0}
            max={80}
            step={1}
            value={st.dist}
            onChange={(e) => sim.update((s) => (s.dist = Number(e.target.value)))}
          />
        </label>
        <label htmlFor={`${ids}g`}>
          {t("field3d.gain")} <output htmlFor={`${ids}g`}>{db} dB</output>
          <input
            id={`${ids}g`}
            type="range"
            min={0}
            max={FIELD.gains.length - 1}
            step={1}
            value={st.gain}
            onChange={(e) => sim.update((s) => (s.gain = Number(e.target.value)))}
          />
        </label>
        <ButtonRow>
          <Button
            disabled={!ready}
            onClick={() => sim.update((s) => sendWupa(s, performance.now() / 1000))}
          >
            {t("field3d.send")}
          </Button>
          <Button
            disabled={!ready}
            pressed={spinning}
            onClick={() => {
              const stage = stageRef.current;
              if (!stage) return;
              stage.view.spinning = !stage.view.spinning;
              setSpinning(stage.view.spinning);
            }}
          >
            {t("controls.turn")}
          </Button>
          <Button
            disabled={!ready}
            pressed={st.slice}
            onClick={() => sim.update((s) => (s.slice = !s.slice))}
          >
            {t("field3d.slice")}
          </Button>
        </ButtonRow>
      </div>
      <div className={styles.pills} aria-live="polite">
        <span className={powered ? styles.yes : styles.no}>
          {powered ? t("field3d.powered") : t("field3d.unpowered")}
        </span>
        <span className={!powered ? "" : heard ? styles.yes : styles.no}>
          {!powered
            ? t("field3d.nothingToHear")
            : heard
              ? t("field3d.heard")
              : t("field3d.unheard")}
        </span>
        <span>{t("field3d.range", { db, mm: Math.round(rangeAt(db)) })}</span>
      </div>
      <div className={styles.bitstrip} role="group" aria-label={t("field3d.air")}
        dir="ltr">
        {WUPA_SYMBOLS.map((s, j) => (
          <span key={j} className={j === st.sym ? styles.now : undefined}>
            {s.s}
            <small>{t(`field3d.symbols.${s.what}`, { bit: s.bit, value: s.value })}</small>
          </span>
        ))}
      </div>
      <FieldChart dist={st.dist} db={db} />
      <StepCaption
        title={t(`field3d.captions.${st.cap}.title`)}
        text={t(`field3d.captions.${st.cap}.text`)}
        token="--w-sda"
      />
    </div>
  );
}
