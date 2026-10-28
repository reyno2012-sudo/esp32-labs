import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WidgetProps } from "@/widgets/types";
import { type Atten, attenName } from "../../model/level";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range, Select } from "../controls";
import { drawBias } from "./bias-draw";

const ATTENS = ["12", "6", "2.5", "0"] as const;

const ATTEN_OF: Readonly<Record<"12" | "6" | "2.5" | "0", Atten>> = {
  "12": 12,
  "6": 6,
  "2.5": 2.5,
  "0": 0,
};

/** 0.5 mV (hush) .. ~270 mV (bang). */
const ampMv = (slider: number) => Math.round(0.5 * Math.pow(1.065, slider) * 10) / 10;

/** S1 panel: move the bias and the loudness, change the attenuation; outside the range, clipping. */
export function SoundBias(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [bias, setBias] = useState(1450);
  const [amp, setAmp] = useState(30);
  const [atten, setAtten] = useState<"12" | "6" | "2.5" | "0">("12");
  const a = ampMv(amp);

  return (
    <CanvasPanel
      h={260}
      label={tr("bias.label")}
      controls={
        <>
          <Range
            label={tr("bias.bias")}
            ariaLabel={tr("bias.biasLabel")}
            min={100}
            max={3200}
            step={10}
            value={bias}
            onChange={setBias}
            output={`${bias} mV`}
          />
          <Range
            label={tr("bias.sound")}
            ariaLabel={tr("bias.soundLabel")}
            min={0}
            max={100}
            value={amp}
            onChange={setAmp}
            output={`±${a} mV`}
          />
          <Select
            ariaLabel={tr("bias.atten")}
            value={atten}
            options={ATTENS.map((k) => [k, tr("bias.attenOption", { db: k })] as const)}
            onChange={setAtten}
          />
        </>
      }
      onFrame={({ g, C, t, reduce, caption }) => {
        const at = ATTEN_OF[atten];
        drawBias(g, C, bias, a, at, reduce ? 0.5 : t, tr);
        caption(tr("bias.caption", { bias, a, atten: attenName(at) }));
      }}
    />
  );
}
