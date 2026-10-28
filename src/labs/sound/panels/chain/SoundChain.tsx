import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import { RichText } from "@/ui/RichText";
import type { WidgetProps } from "@/widgets/types";
import { Mic, type MicMode } from "../../model/mic";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Spacer } from "../controls";
import styles from "../panel.module.css";
import { STEPS } from "./chain-data";
import { drawChain } from "./chain-draw";
import type { ChainSim } from "./chain-types";

const SOUNDS = ["talk", "whistle", "clap", "quiet"] as const satisfies readonly (MicMode | "clap")[];

/** S1 panel: from air to numbers, one stage at a time, every value live. */
export function SoundChain(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const since = useRef(0);
  // Quiet first, so the level meter learns the quiet; then it talks.
  const sim = useRef<ChainSim | null>(null);
  const getSim = () => (sim.current ??= { mic: new Mic(), talking: false, dmaFill: 0, flying: -1 });

  const go = (next: number) => {
    since.current = 0;
    setAt((next + STEPS.length) % STEPS.length);
  };
  const step = STEPS[at] ?? "air";

  return (
    <CanvasPanel
      h={320}
      label={tr("chain.label")}
      controls={
        <>
          <Button aria-label={tr("chain.previous")} onClick={() => go(at - 1)}>
            ◀
          </Button>
          <Button onClick={() => setPlaying(!playing)}>{playing ? tr("controls.pause") : tr("controls.play")}</Button>
          <Button aria-label={tr("chain.next")} onClick={() => go(at + 1)}>
            ▶
          </Button>
          <span className={styles.mono} aria-live="polite">
            {tr("chain.position", { at: at + 1, total: STEPS.length })}
          </span>
          <Spacer />
          {SOUNDS.map((m) => (
            <Button
              key={m}
              onClick={() => (m === "clap" ? getSim().mic.clap() : getSim().mic.say(m))}
            >
              {tr(`sounds.${m}`)}
            </Button>
          ))}
        </>
      }
      caption={
        <>
          <b>{tr(`chain.steps.${step}.title`)}</b>
          <br />
          <RichText text={tr(`chain.steps.${step}.text`)} />
        </>
      }
      onFrame={({ g, C, dt, t, reduce }) => {
        const s = getSim();
        s.mic.step(dt);
        if (!s.talking && s.mic.t > 0.7) {
          s.talking = true;
          s.mic.say("talk");
        }
        if (playing && (since.current += dt) > 9) go(at + 1);
        drawChain(g, C, at, s, t, dt, reduce, tr);
      }}
    />
  );
}
