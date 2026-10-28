import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import { RichText } from "@/ui/RichText";
import type { WidgetProps } from "@/widgets/types";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Spacer } from "../controls";
import panelStyles from "../panel.module.css";
import { drawGetOut, PATHS, type PathKey, STEP_NOS, WAV_HEADER } from "./get-out";
import styles from "./get-out.module.css";

const PATH_KEYS: readonly PathKey[] = ["phone", "usb", "board"];

/** S4 panel: getting the audio out, and what a WAV file is. */
export function SoundGetOut(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [path, setPath] = useState<PathKey>("phone");
  const [at, setAt] = useState(0);
  const steps = PATHS[path];
  const step = steps[at] ?? steps[0];
  const no = STEP_NOS[at] ?? "1";
  if (!step) return null;
  const move = (d: number) => setAt((a) => (a + steps.length + d) % steps.length);

  return (
    <CanvasPanel
      h={150}
      label={tr("getOut.label")}
      controls={
        <>
          <ChoiceGroup
            label={tr("getOut.path")}
            value={path}
            onChange={(k) => {
              setPath(k);
              setAt(0);
            }}
            choices={PATH_KEYS.map((key) => ({ key, label: tr(`getOut.choices.${key}`) }))}
          />
          <Spacer />
          <Button aria-label={tr("getOut.previous")} onClick={() => move(-1)}>
            ◀
          </Button>
          <span className={panelStyles.mono}>
            {tr("getOut.position", { at: at + 1, total: steps.length })}
          </span>
          <Button aria-label={tr("getOut.next")} onClick={() => move(1)}>
            ▶
          </Button>
        </>
      }
      caption={
        <RichText
          text={tr("getOut.caption", {
            n: at + 1,
            title: tr(`getOut.paths.${path}.${no}.title`),
            text: tr(`getOut.paths.${path}.${no}.text`),
          })}
        />
      }
      onFrame={({ g, C, t, reduce }) => drawGetOut(g, C, path, step, t, reduce, tr)}
    >
      <ul className={styles.wav} aria-label={tr("getOut.wavLabel")}>
        {WAV_HEADER.map(([v, b, w], i) => (
          <li key={i} className={styles.bf}>
            <b>{v}</b>
            <code>{b}</code>
            <i>{tr(`getOut.wav.${w}`)}</i>
          </li>
        ))}
      </ul>
    </CanvasPanel>
  );
}
