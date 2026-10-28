import { type PointerEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WidgetProps } from "@/widgets/types";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range } from "../controls";
import styles from "../panel.module.css";
import { drawComparator } from "./comparator-draw";
import { ComparatorSim, potFromY } from "./comparator-sim";

const H = 290;

/** S1 panel: the LM393 comparator and its pot; drag the dashed line or the slider. */
export function SoundComparator(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [pot, setPot] = useState(10);
  const sim = useRef<ComparatorSim | null>(null);
  const dragging = useRef(false);

  const fromPointer = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPot(potFromY(((e.clientY - r.top) / r.height) * H));
  };

  return (
    <CanvasPanel
      h={H}
      label={tr("comparator.label")}
      controls={
        <>
          <Range
            label={tr("comparator.potRange")}
            ariaLabel={tr("comparator.potLabel")}
            min={1}
            max={120}
            value={pot}
            onChange={setPot}
            output={`${pot} mV`}
          />
          <span className={styles.mono}>{tr("comparator.drag")}</span>
        </>
      }
      canvas={{
        style: { cursor: "ns-resize", touchAction: "none" },
        onPointerDown: (e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        },
        onPointerMove: (e) => {
          if (dragging.current) fromPointer(e);
        },
        onPointerUp: () => {
          dragging.current = false;
        },
        onPointerCancel: () => {
          dragging.current = false;
        },
      }}
      onFrame={({ g, C, dt, t, caption }) => {
        const s = (sim.current ??= new ComparatorSim());
        s.mic.potMv = pot;
        s.step(dt, t);
        drawComparator(g, C, s, tr);
        caption(tr("comparator.caption", { pot }));
      }}
    />
  );
}
