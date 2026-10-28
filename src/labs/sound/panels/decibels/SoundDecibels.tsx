import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range } from "../controls";
import { drawDecibels } from "./draw-decibels";

const STEPS: readonly (readonly [string, number])[] = [
  ["-6", -60],
  ["+6", 60],
  ["+20", 200],
];

/** S2 panel: what a decibel is. */
export function SoundDecibels(_: WidgetProps) {
  // Tenths of a dB above the quiet, like the original slider.
  const { t: tr } = useTranslation("labs-sound");
  const [tenths, setTenths] = useState(200);
  const db = tenths / 10;
  const ratio = Math.pow(10, db / 20);

  return (
    <CanvasPanel
      h={250}
      label={tr("decibels.label")}
      controls={
        <>
          <Range
            label={tr("decibels.howLoud")}
            ariaLabel={tr("decibels.howLoudLabel")}
            min={0}
            max={600}
            value={tenths}
            onChange={setTenths}
            output={`${db.toFixed(1)} dB = ×${ratio < 10 ? ratio.toFixed(2) : Math.round(ratio)}`}
          />
          {STEPS.map(([l, d]) => (
            <Button key={l} onClick={() => setTenths((v) => Math.max(0, Math.min(600, v + d)))}>
              {l} dB
            </Button>
          ))}
        </>
      }
      onFrame={({ g, C, t, reduce, caption }) => caption(drawDecibels(g, C, db, reduce ? 0 : t, tr))}
    />
  );
}
