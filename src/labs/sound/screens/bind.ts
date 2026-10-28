import { bindLab as bindToKit, type BoundLab } from "@/labs/shared/lab-screen/bind";
import { soundKit } from "../kit/kit";
import type { SoundSpec, SoundState } from "../kit/types";

/** One lab's screen bound to the sound kit, ready to render as a preview or a gallery. */
export type SoundLab = BoundLab;

// Each lab has its own state type; binding here keeps the kit and the spec on the same S.
export function bindLab<S extends SoundState>(lab: SoundSpec<S>): SoundLab {
  const kit = soundKit<S>();
  // The original's microphones ran from page load, so the quiet was learned before you reached
  // the screen. Frame loops here sleep off screen: learn 0.6 s of quiet up front instead.
  const spec: SoundSpec<S> = {
    ...lab,
    init() {
      const st = lab.init();
      for (let i = 0; i < 3; i++) st.mic.step(0.2);
      return st;
    },
  };
  return bindToKit(kit, spec);
}
