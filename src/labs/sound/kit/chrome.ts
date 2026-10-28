// The board's header and footer (kit/lib/sound-kit/src/sound_views.h): lab id, view name, view dots,
// the ear (10 level segments, the DO lamp or "D", speaker waves, the REC dot), the hint and the
// latest note.
import type { ResolvedLesson } from "@/domain/lesson";
import { SCREEN_W, type ScopePalette } from "@/lib/canvas";
import { display, levelColour, S8, textWriter } from "./draw";
import type { SoundSpec, SoundState } from "./types";

export function drawSoundChrome<S extends SoundState>(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  lesson: ResolvedLesson,
  spec: SoundSpec<S>,
  view: number,
  st: S,
  t: number,
): void {
  const T = textWriter(g, S8);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, SCREEN_W, 29);
  g.fillRect(0, 158, SCREEN_W, 12);
  T(8, 18, lesson.id, C.pink, display(12));
  T(30, 18, spec.views[view] ?? "", C.muted, display(12, false));
  const L = st.mic.level;
  const x = 246;
  const lit = Math.round(Math.min(1, L.above() / 50) * 10);
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i < lit ? levelColour(C, i * 5) : C.dim;
    g.fillRect(x + i * 4, 10, 3, 10);
  }
  if (st.mic.digital) T(x + 45, 19, "D", C.teal);
  else {
    g.fillStyle = st.doLamp ? C.amber : C.dim;
    g.beginPath();
    g.arc(x + 48, 15, 3, 0, 7);
    g.fill();
  }
  if (st.mic.spk.busy()) {
    g.strokeStyle = C.pink;
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.arc(x - 8 + i * 3, 15, 3 + i * 3, -Math.PI / 2, Math.PI / 2);
      g.stroke();
    }
  }
  if (st.rec && t % 1 < 0.6) {
    g.fillStyle = C.coral;
    g.beginPath();
    g.arc(x + 60, 15, 4, 0, 7);
    g.fill();
  }
  const n = spec.views.length;
  const first = SCREEN_W - 84 - (n - 1) * 9;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i === view ? C.ink : C.dim;
    g.beginPath();
    g.arc(first + i * 9, 15, 3, 0, 7);
    g.fill();
  }
  g.fillStyle = C.dim;
  g.fillRect(0, 28, SCREEN_W, 1);
  const act = spec.dbl[view];
  T(6, 166, act ? `2x: ${act}` : "click: next view", C.muted);
  if (st.note && st.noteAt !== undefined) {
    const age = performance.now() - st.noteAt;
    if (age < 6000) {
      g.globalAlpha = age > 4000 ? 1 - (age - 4000) / 2500 : 1;
      T(314, 166, st.note.slice(0, 30), C[st.noteCol ?? "muted"], S8, "right");
      g.globalAlpha = 1;
    }
  }
}
