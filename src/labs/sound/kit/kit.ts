// What every sound lab shares, as one LabKit: the status bar, the pretend microphone stepping every
// frame, the hands and voice buttons, the mic and browser-sound toggles, the shell and the boot.
import type { LabAction, LabKit } from "@/labs/shared/lab-screen/types";
import { browserAudio } from "../audio/browser-audio";
import { Mic, type MicOptions } from "../model/mic";
import { drawSoundChrome } from "./chrome";
import { soundNote } from "./note";
import { micLine, micName, printSoundHelp, soundShell, switchMic } from "./shell";
import type { SoundSpec, SoundState } from "./types";

/** A pretend microphone whose speaker plays through the browser (once you switch sound on). */
export const soundMic = (o: MicOptions = {}) => new Mic({ out: browserAudio, ...o });

/** Sound buttons every preview shares: the things your hands and voice do. */
export const SOUND_HANDS: readonly LabAction<SoundState>[] = [
  { label: (_, t) => t("labs-sound:kit.hands.clap"), run: (st) => st.mic.clap() },
  {
    label: (_, t) => t("labs-sound:kit.hands.twoClaps"),
    run: (st) => {
      st.mic.clap();
      st.mic.clap(0.3);
    },
  },
  { label: (_, t) => t("labs-sound:kit.hands.talk"), run: (st) => st.mic.say("talk", 3) },
  { label: (_, t) => t("labs-sound:kit.hands.whistle"), run: (st) => st.mic.say("whistle", 3) },
  {
    label: (_, t) => t("labs-sound:kit.hands.silence"),
    run: (st) => {
      st.mic.say("quiet");
      st.mic.claps = [];
    },
  },
];

/** The sound track's kit for a lab whose state is S. */
export function soundKit<S extends SoundState>(): LabKit<S, SoundSpec<S>> {
  return {
    firmware: "sound-lab",
    ns: "labs-sound",
    previewCaption: (t) => t("labs-sound:kit.previewCaption"),
    chrome: drawSoundChrome,
    step(st, dt) {
      st.mic.step(dt);
      st.doLamp = st.mic.takeDo();
    },
    handActions: SOUND_HANDS,
    trailingActions: () => [
      {
        label: (st, t) =>
          t(st.mic.digital ? "labs-sound:kit.micToKy" : "labs-sound:kit.micToInmp"),
        run: (st, term) => switchMic(st, term, st.mic.digital ? "ky037" : "inmp441"),
      },
      {
        label: (_, t) =>
          t(browserAudio.isOn() ? "labs-sound:kit.browserOn" : "labs-sound:kit.browserOff"),
        pressed: () => browserAudio.isOn(),
        // A click: the only place the AudioContext may be created.
        run: () => browserAudio.setOn(!browserAudio.isOn()),
      },
    ],
    // Panels (synth, speaker path, parrot) can switch browser sound too: keep the label honest.
    subscribe: (changed) => browserAudio.subscribe(changed),
    bootLines: (st) => [
      ["Listening for an INMP441 on the I2S pins...", "plain"],
      [`Microphone: ${micName(st.mic)} (mic setting: auto)`, "plain"],
      [micLine(st.mic), "info"],
    ],
    afterBoot(st, term, lesson, spec) {
      printSoundHelp(lesson, spec, term, st);
      st.mic.spk.play(500, 523, "hello");
      soundNote(st, term, "-", "learning the quiet...");
    },
    shell: soundShell,
    onTap: (st) => st.mic.clap(),
    tapHint: (t) => t("labs-sound:kit.tapHint"),
    start(st, term) {
      st.term = term;
      const release = browserAudio.retain();
      return () => {
        clearInterval(st.plotTimer);
        st.plotTimer = undefined;
        st.term = undefined;
        release();
      };
    },
  };
}
