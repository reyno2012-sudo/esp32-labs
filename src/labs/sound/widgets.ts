import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Every widget the sound lessons reference, each in its own chunk.
export const soundWidgets = {
  sound: lazyWidget(() => import("./SoundPreview"), "SoundPreview"),
  soundScreens: lazyWidget(() => import("./SoundScreens"), "SoundScreens"),
  soundJourney: lazyWidget(() => import("./panels/journey/SoundJourney"), "SoundJourney"),
  soundChain: lazyWidget(() => import("./panels/chain/SoundChain"), "SoundChain"),
  soundMics: lazyWidget(() => import("./panels/mics/SoundMics"), "SoundMics"),
  soundBias: lazyWidget(() => import("./panels/bias/SoundBias"), "SoundBias"),
  soundComparator: lazyWidget(
    () => import("./panels/comparator/SoundComparator"),
    "SoundComparator",
  ),
  soundDecibels: lazyWidget(() => import("./panels/decibels/SoundDecibels"), "SoundDecibels"),
  soundBallistics: lazyWidget(
    () => import("./panels/ballistics/SoundBallistics"),
    "SoundBallistics",
  ),
  soundClapMachine: lazyWidget(
    () => import("./panels/clap-machine/SoundClapMachine"),
    "SoundClapMachine",
  ),
  soundRecorderTimeline: lazyWidget(
    () => import("./panels/recorder-timeline/SoundRecorderTimeline"),
    "SoundRecorderTimeline",
  ),
  soundGetOut: lazyWidget(() => import("./panels/get-out/SoundGetOut"), "SoundGetOut"),
  soundFftExplainer: lazyWidget(
    () => import("./panels/fft-explainer/SoundFftExplainer"),
    "SoundFftExplainer",
  ),
  soundWhistleSeq: lazyWidget(
    () => import("./panels/whistle-seq/SoundWhistleSeq"),
    "SoundWhistleSeq",
  ),
  soundKnockMatcher: lazyWidget(
    () => import("./panels/knock-matcher/SoundKnockMatcher"),
    "SoundKnockMatcher",
  ),
  soundSpeakerPath: lazyWidget(
    () => import("./panels/speaker-path/SoundSpeakerPath"),
    "SoundSpeakerPath",
  ),
  soundSynth: lazyWidget(() => import("./panels/synth/SoundSynth"), "SoundSynth"),
  soundParrot: lazyWidget(() => import("./panels/parrot/SoundParrot"), "SoundParrot"),
} as const satisfies WidgetMap;
