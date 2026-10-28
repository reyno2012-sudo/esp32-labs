import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Select } from "../controls";
import { drawBallistics, Replay, SCENES, type SceneKey } from "./ballistics";

const SCENE_KEYS = Object.keys(SCENES) as SceneKey[];

/** S2 panel: fast, slow and the floor, replayed. */
export function SoundBallistics(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [scene, setScene] = useState<SceneKey>("talk");
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState(2);
  const replay = useRef<Replay | null>(null);

  const restart = () => {
    replay.current = null;
  };

  return (
    <CanvasPanel
      h={280}
      label={tr("ballistics.label")}
      controls={
        <>
          <Select
            ariaLabel={tr("ballistics.scene")}
            value={scene}
            options={SCENE_KEYS.map((k) => [k, tr(`ballistics.scenes.${k}`)] as const)}
            onChange={(k) => {
              setScene(k);
              restart();
            }}
          />
          <Button onClick={() => setPlaying((p) => !p)}>{playing ? tr("controls.pause") : tr("controls.play")}</Button>
          <Button onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 6 : 1))}>
            {tr("controls.speed", { speed })}
          </Button>
          <Button onClick={restart}>{tr("controls.restart")}</Button>
        </>
      }
      onFrame={({ g, C, dt, reduce, caption }) => {
        let r = replay.current;
        if (!r || r.scene !== scene) r = replay.current = new Replay(scene, reduce);
        if (playing) r.advance(dt * speed);
        caption(drawBallistics(g, C, r, tr));
      }}
    />
  );
}
