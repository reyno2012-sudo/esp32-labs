import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import type { WidgetProps } from "@/widgets/types";
import { browserAudio, type PlayingSound } from "../../audio/browser-audio";
import {
  canCapture,
  CaptureError,
  type CaptureFailure,
  captureVoice,
} from "../../audio/mic-capture";
import { useBrowserAudio } from "../../audio/use-browser-audio";
import type { SoundT } from "../../kit/i18n";
import { applyVoiceFx, cannedVoice, fxSpeed, VOICE_FX, type VoiceFx } from "../../model/voice-fx";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import shared from "../panel.module.css";
import { drawParrot, H } from "./parrot-draw";
import styles from "./parrot.module.css";

interface Voice {
  samples: Float32Array;
  rate: number;
}

interface ParrotSim {
  voice: Voice;
  /** The last voice + effect and what it produced, so a frame doesn't redo the effect. */
  shown: { voice: Voice; fx: VoiceFx; out: Float32Array } | null;
  playing: { sound: PlayingSound | null; at: number; dur: number; out: Float32Array } | null;
  /** performance.now() when the microphone opened, while recording. */
  recAt: number | null;
}

/** The caption, resolved at render so it follows the language. */
type Caption = (tr: SoundT) => string;

const failed =
  (reason: CaptureFailure): Caption =>
  (tr) =>
    tr(`parrot.failed.${reason}`);

/** S8 panel: the parrot, in your browser. Your microphone only opens on the record click. */
export function SoundParrot(_: WidgetProps) {
  useBrowserAudio();
  const [fx, setFx] = useState<VoiceFx>("chipmunk");
  const [recording, setRecording] = useState(false);
  const { t: tr } = useTranslation("labs-sound");
  const [caption, setCaption] = useState<Caption>(() => (t: SoundT) => t("parrot.intro"));
  const sim = useRef<ParrotSim | null>(null);
  // Aborted on unmount: stops a recording in progress and what the parrot is saying.
  const life = useRef<AbortController | null>(null);
  const get = () =>
    (sim.current ??= { voice: cannedVoice(), shown: null, playing: null, recAt: null });

  useEffect(() => {
    const ac = new AbortController();
    life.current = ac;
    ac.signal.addEventListener("abort", () => sim.current?.playing?.sound?.stop(), { once: true });
    return () => ac.abort();
  }, []);

  function play() {
    // A click: browser sound may start here.
    browserAudio.setOn(true);
    if (!browserAudio.start()) {
      setCaption(() => (t: SoundT) => t("parrot.noAudio"));
      return;
    }
    const s = get();
    s.playing?.sound?.stop();
    const out = applyVoiceFx(s.voice.samples, s.voice.rate, fx);
    const speed = fxSpeed(fx);
    s.playing = {
      sound: browserAudio.samples(out, s.voice.rate, speed),
      at: performance.now(),
      dur: (out.length / s.voice.rate / speed) * 1000,
      out,
    };
  }

  async function record() {
    const s = get();
    const signal = life.current?.signal;
    if (s.recAt !== null || !signal) return;
    if (!canCapture()) {
      setCaption(() => failed("unsupported"));
      return;
    }
    try {
      const voice = await captureVoice(
        3000,
        () => {
          s.recAt = performance.now();
          setRecording(true);
          setCaption(() => (t: SoundT) => t("parrot.recording"));
        },
        signal,
      );
      s.voice = { samples: voice.samples, rate: voice.rate };
      const seconds = voice.seconds;
      setCaption(() => (t: SoundT) => t("parrot.recorded", { s: seconds }));
    } catch (error) {
      if (!signal.aborted)
        setCaption(() => failed(error instanceof CaptureError ? error.reason : "unreadable"));
    } finally {
      s.recAt = null;
      if (!signal.aborted) setRecording(false);
    }
  }

  return (
    <CanvasPanel
      h={H}
      label={tr("parrot.label")}
      caption={caption(tr)}
      controls={
        <>
          <ChoiceGroup
            label={tr("parrot.voice")}
            value={fx}
            onChange={setFx}
            choices={VOICE_FX.map(([f]) => ({ key: f, label: tr(`parrot.fx.${f}`) }))}
            className={styles.full}
          />
          <Button onClick={play}>{tr("parrot.play")}</Button>
          <Button onClick={() => void record()}>{tr("parrot.record")}</Button>
          {recording ? <span className={shared.rec}>● REC</span> : null}
          <Button
            onClick={() => {
              get().voice = cannedVoice();
              setCaption(() => (t: SoundT) => t("parrot.example"));
            }}
          >
            {tr("parrot.useExample")}
          </Button>
        </>
      }
      onFrame={({ g, C }) => {
        const s = get();
        let { shown } = s;
        if (!shown || shown.voice !== s.voice || shown.fx !== fx)
          shown = s.shown = {
            voice: s.voice,
            fx,
            out: applyVoiceFx(s.voice.samples, s.voice.rate, fx),
          };
        const p = s.playing;
        let playhead: number | null = null;
        if (p) {
          const k = (performance.now() - p.at) / p.dur;
          if (k <= 1) playhead = k;
          else s.playing = null;
        }
        const speed = fxSpeed(fx);
        drawParrot(g, C, {
          heard: s.voice.samples,
          says: p ? p.out : shown.out,
          heardLabel: tr("parrot.heard"),
          saysLabel:
            speed !== 1
              ? tr("parrot.saysSpeed", { fx: tr(`parrot.fx.${fx}`), speed })
              : tr("parrot.says", { fx: tr(`parrot.fx.${fx}`) }),
          playhead,
          recSecs: s.recAt !== null ? (performance.now() - s.recAt) / 1000 : null,
        });
      }}
    />
  );
}
