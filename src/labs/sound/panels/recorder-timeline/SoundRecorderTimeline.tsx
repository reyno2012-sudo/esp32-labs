/* eslint-disable i18next/no-literal-string -- literal text here is step sizes with units, not interface text. */
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range } from "../controls";
import { drawRecorder, FR, LEN, scenePoints } from "./recorder-timeline";

const END = LEN - FR;

interface Replay {
  cursor: number;
  readonly pts: readonly number[];
}

/** S4 panel: voice-activated recording, step by step. */
export function SoundRecorderTimeline(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [trig, setTrig] = useState(15);
  const [hold, setHold] = useState(1200);
  const sim = useRef<Replay | null>(null);
  const replay = () =>
    (sim.current ??= { cursor: prefersReducedMotion() ? END : 0, pts: scenePoints() });

  const nudge = (ms: number) => {
    setPlaying(false);
    const r = replay();
    r.cursor = Math.max(0, Math.min(END, r.cursor + ms));
  };

  return (
    <CanvasPanel
      h={300}
      label={tr("recorder.label")}
      controls={
        <>
          <Button aria-label={tr("recorder.back")} onClick={() => nudge(-100)}>
            ◀ 0.1 s
          </Button>
          <Button
            onClick={() => {
              const r = replay();
              if (r.cursor >= END) r.cursor = 0;
              setPlaying((p) => !p);
            }}
          >
            {playing ? tr("controls.pause") : tr("controls.play")}
          </Button>
          <Button aria-label={tr("recorder.on")} onClick={() => nudge(100)}>
            0.1 s ▶
          </Button>
          <Range
            label={tr("recorder.trigger")}
            ariaLabel={tr("recorder.triggerLabel")}
            min={5}
            max={35}
            value={trig}
            onChange={setTrig}
            output={`${trig} dB`}
          />
          <Range
            label={tr("recorder.hold")}
            ariaLabel={tr("recorder.holdLabel")}
            min={300}
            max={3000}
            step={100}
            value={hold}
            onChange={setHold}
            output={`${(hold / 1000).toFixed(1)} s`}
          />
        </>
      }
      onFrame={({ g, C, dt, caption }) => {
        const r = replay();
        if (playing) {
          r.cursor += dt * 1000;
          if (r.cursor >= END) {
            r.cursor = END;
            setPlaying(false);
          }
        }
        caption(drawRecorder(g, C, r.pts, r.cursor, trig, hold, tr));
      }}
    />
  );
}
