import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { browserAudio } from "../../audio/browser-audio";
import { useBrowserAudio } from "../../audio/use-browser-audio";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range } from "../controls";
import { drawSpeakerPath, volumeGain } from "./speaker-draw";

/** S7 panel: from numbers to a moving cone, volume, and the echo guard. */
export function SoundSpeakerPath(_: WidgetProps) {
  useBrowserAudio();
  const { t: tr } = useTranslation("labs-sound");
  const [vol, setVol] = useState(40);
  const loopT = useRef(0);
  const gain = volumeGain(vol);
  const db = gain > 0 ? 20 * Math.log10(gain) : -Infinity;

  // A click: the only place this panel switches browser sound on.
  const hear = () => {
    browserAudio.setOn(true);
    browserAudio.tone(440, 600, "sine", 0, [10, 50, 1, 80], Math.min(1, (vol / 100) ** 2 * 2.5));
  };

  return (
    <CanvasPanel
      h={400}
      label={tr("speaker.label")}
      controls={
        <>
          <Range
            label={tr("speaker.volume")}
            ariaLabel={tr("speaker.volumeLabel")}
            min={0}
            max={100}
            value={vol}
            onChange={setVol}
            output={
              Number.isFinite(db)
                ? tr("speaker.output", { vol, gain, db })
                : tr("speaker.outputSilent", { vol, gain })
            }
          />
          <Button onClick={hear}>{tr("speaker.hear")}</Button>
        </>
      }
      caption={tr("speaker.caption", { vol, gain })}
      onFrame={({ g, C, dt, t, reduce }) => {
        if (!reduce) loopT.current = (loopT.current + dt) % 6;
        drawSpeakerPath(g, C, vol, t, reduce ? 0.3 : t * 0.25, loopT.current, tr);
      }}
    />
  );
}
