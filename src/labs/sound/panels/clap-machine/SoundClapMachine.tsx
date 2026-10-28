/* eslint-disable i18next/no-literal-string -- literal text here is step sizes with units, not interface text. */
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range, Select } from "../controls";
import { drawClapMachine, ENV, type EnvKey, N, randomJitter } from "./clap-machine";

const ENV_KEYS = Object.keys(ENV) as EnvKey[];

interface Replay {
  cursor: number;
  acc: number;
  readonly jitter: readonly number[];
}

/** S3 panel: is it a clap? The detector, one 4 ms frame at a time. */
export function SoundClapMachine(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [env, setEnv] = useState<EnvKey>("clap");
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [rise, setRise] = useState(18);
  const [relRaw, setRel] = useState(8);
  const rel = Math.min(relRaw, rise - 1);
  const sim = useRef<Replay | null>(null);
  const replay = () =>
    (sim.current ??= {
      cursor: prefersReducedMotion() ? N - 1 : 0,
      acc: 0,
      jitter: randomJitter(),
    });

  const nudge = (d: number) => {
    setPlaying(false);
    const r = replay();
    r.cursor = Math.max(0, Math.min(N - 1, r.cursor + d));
  };

  return (
    <CanvasPanel
      h={330}
      label={tr("clapMachine.label")}
      controls={
        <>
          <Select
            ariaLabel={tr("clapMachine.which")}
            value={env}
            options={ENV_KEYS.map((k) => [k, tr(`clapMachine.sounds.${k}`)] as const)}
            onChange={(k) => {
              setEnv(k);
              const reduce = prefersReducedMotion();
              replay().cursor = reduce ? N - 1 : 0;
              setPlaying(!reduce);
            }}
          />
          <Button aria-label={tr("clapMachine.back")} onClick={() => nudge(-1)}>
            ◀ 4 ms
          </Button>
          <Button
            onClick={() => {
              const r = replay();
              if (r.cursor >= N - 1) r.cursor = 0;
              setPlaying((p) => !p);
            }}
          >
            {playing ? tr("controls.pause") : tr("controls.play")}
          </Button>
          <Button aria-label={tr("clapMachine.on")} onClick={() => nudge(1)}>
            4 ms ▶
          </Button>
          <Range
            label={tr("clapMachine.rise")}
            ariaLabel={tr("clapMachine.riseLabel")}
            min={6}
            max={40}
            value={rise}
            onChange={setRise}
            output={`${rise} dB`}
          />
          <Range
            label={tr("clapMachine.release")}
            ariaLabel={tr("clapMachine.releaseLabel")}
            min={2}
            max={20}
            value={relRaw}
            onChange={setRel}
            output={`${rel} dB`}
          />
        </>
      }
      onFrame={({ g, C, dt, caption }) => {
        const r = replay();
        if (playing) {
          r.acc += dt;
          while (r.acc > 0.016) {
            r.acc -= 0.016;
            if (r.cursor < N - 1) r.cursor++;
            else setPlaying(false);
          }
        }
        caption(drawClapMachine(g, C, env, r.cursor, rise, rel, r.jitter, tr));
      }}
    />
  );
}
