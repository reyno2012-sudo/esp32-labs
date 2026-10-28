import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range } from "../controls";
import { drawMics, sampleOf } from "./mics-draw";

/** S1 panel: the KY-037's analog path, the INMP441's digital one, and an I2S frame tick by tick. */
export function SoundMics(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [value, setValue] = useState(37);
  // The SCK tick the cursor is on: advanced by the frame loop, so not React state.
  const tick = useRef<number | null>(null);
  const acc = useRef(0);
  const s24 = sampleOf(value);

  return (
    <CanvasPanel
      h={360}
      label={tr("mics.label")}
      controls={
        <>
          <Button onClick={() => setPlaying(!playing)}>{playing ? tr("controls.pause") : tr("controls.play")}</Button>
          <Button
            aria-label={tr("mics.tickLabel")}
            onClick={() => {
              setPlaying(false);
              tick.current = ((tick.current ?? 0) + 1) % 64;
            }}
          >
            {tr("mics.tick")}
          </Button>
          <Range
            label={tr("mics.pressure")}
            ariaLabel={tr("mics.pressureLabel")}
            min={-100}
            max={100}
            value={value}
            onChange={setValue}
            output={tr("mics.output", { s24 })}
          />
        </>
      }
      onFrame={({ g, C, dt, reduce, caption }) => {
        tick.current ??= reduce ? 63 : 0;
        if (playing && (acc.current += dt) > 0.12) {
          acc.current = 0;
          tick.current = (tick.current + 1) % 64;
        }
        drawMics(g, C, s24, tick.current, tr);
        caption(
          tick.current < 25 ? tr("mics.caption.reading") : tr("mics.caption.shift"),
        );
      }}
    />
  );
}
