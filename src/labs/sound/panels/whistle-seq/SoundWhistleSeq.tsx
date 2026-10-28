import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { Fft } from "../../model/fft";
import { gauss } from "../../model/random";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range } from "../controls";
import styles from "../panel.module.css";
import { drawWhistleStep, WHISTLE_RATE } from "./whistle-draw";

/** Each step's title and text live in whistle.steps.<id>. */
const STEPS = ["samples", "window", "fft", "peak", "parabola", "note"] as const;

interface WhistleSim {
  fft: Fft;
  s: Float32Array;
  ws: Float32Array;
  since: number;
}

/** S5 panel: from a whistle to a note, step by step. */
export function SoundWhistleSeq(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [hz, setHz] = useState(1763);
  const sim = useRef<WhistleSim | null>(null);

  const go = (step: number) => {
    setAt((step + STEPS.length) % STEPS.length);
    if (sim.current) sim.current.since = 0;
  };
  const id = STEPS[at] ?? "samples";

  return (
    <CanvasPanel
      h={280}
      label={tr("whistle.label")}
      controls={
        <>
          <Button aria-label={tr("whistle.previous")} onClick={() => go(at - 1)}>
            ◀
          </Button>
          <Button onClick={() => setPlaying(!playing)}>{playing ? tr("controls.pause") : tr("controls.play")}</Button>
          <Button aria-label={tr("whistle.next")} onClick={() => go(at + 1)}>
            ▶
          </Button>
          <span className={styles.mono} aria-live="polite">
            {tr("whistle.position", { at: at + 1, total: STEPS.length })}
          </span>
          <Range
            label={tr("whistle.whistle")}
            ariaLabel={tr("whistle.whistleLabel")}
            min={600}
            max={3000}
            value={hz}
            onChange={setHz}
            output={`${hz} Hz`}
          />
        </>
      }
      caption={
        <>
          <b>{tr("whistle.title", { n: at + 1, title: tr(`whistle.steps.${id}.title`) })}</b>{" "}
          {tr(`whistle.steps.${id}.text`)}
        </>
      }
      onFrame={({ g, C, dt }) => {
        const w = (sim.current ??= {
          fft: new Fft(512),
          s: new Float32Array(512),
          ws: new Float32Array(512),
          since: 0,
        });
        if (playing && (w.since += dt) > 5) {
          w.since = 0;
          setAt((a) => (a + 1) % STEPS.length);
        }
        for (let i = 0; i < 512; i++) {
          const v = 9000 * Math.sin((2 * Math.PI * hz * i) / WHISTLE_RATE) + gauss() * 300;
          w.s[i] = v;
          w.ws[i] = v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / 511));
        }
        w.fft.run(w.s);
        drawWhistleStep(g, C, at, w.fft, w.s, w.ws, w.fft.peak(WHISTLE_RATE, 80, 4000), tr);
      }}
    />
  );
}
