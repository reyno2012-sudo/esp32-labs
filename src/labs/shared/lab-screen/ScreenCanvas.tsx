import { type KeyboardEvent, useRef } from "react";
import type { ResolvedLesson } from "@/domain/lesson";
import { useFrameLoop } from "@/lib/animation";
import { context2d, SCREEN_H, SCREEN_W, scopePalette } from "@/lib/canvas";
import { createLogger, errorData } from "@/lib/logger";
import { useReducedMotion } from "@/lib/media";
import { ScreenFrame } from "@/ui/ScreenFrame";
import type { Simulation } from "../simulation";
import { labText, useLabT } from "./lab-text";
import type { LabKit, LabState, ScreenSpec } from "./types";

const log = createLogger("lab-screen");
const VIEW_TOP = 29;
const VIEW_H = 129;

interface ScreenCanvasProps<S extends LabState, Spec extends ScreenSpec<S>> {
  kit: LabKit<S, Spec>;
  spec: Spec;
  lesson: ResolvedLesson;
  sim: Simulation<S>;
  /** A fixed view (gallery), or follow `state.view` (the live preview). */
  view?: number;
  label: string;
}

/** The simulated 320×170 TFT: the kit's chrome around the lab's view, redrawn every frame. */
export function ScreenCanvas<S extends LabState, Spec extends ScreenSpec<S>>({
  kit,
  spec,
  lesson,
  sim,
  view,
  label,
}: ScreenCanvasProps<S, Spec>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const failed = useRef(false);
  const reduce = useReducedMotion();
  const tr = useLabT(kit.ns);

  useFrameLoop(canvasRef, ({ now, dt }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = context2d(canvas);
    const C = scopePalette();
    const st = sim.state;
    const v = view ?? st.view;
    const t = reduce ? 1.2 : now / 1000;
    kit.step?.(st, dt);
    spec.tick?.(st, dt, v);
    g.fillStyle = C.paper;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.save();
    g.beginPath();
    g.rect(0, VIEW_TOP, SCREEN_W, VIEW_H);
    g.clip();
    try {
      spec.draw(g, C, v, t, st);
    } catch (error) {
      // Same as the firmware's guard: show the error on the screen, keep the loop alive.
      g.fillStyle = C.coral;
      g.font = "10px monospace";
      g.fillText(String(error).slice(0, 50), 8, 60);
      if (!failed.current) log.error(`${lesson.id} view ${v} failed to draw`, errorData(error));
      failed.current = true;
    }
    g.restore();
    kit.chrome(g, C, lesson, spec, v, st, t);
  });

  const onTap = kit.onTap;
  const tap = onTap ? () => onTap(sim.state) : undefined;
  const onKeyDown = tap
    ? (e: KeyboardEvent) => {
        if (e.code !== "Space") return;
        e.preventDefault();
        tap();
      }
    : undefined;

  return (
    <ScreenFrame>
      {/* The device screen is physical: it never mirrors. */}
      <canvas
        dir="ltr"
        ref={canvasRef}
        width={SCREEN_W}
        height={SCREEN_H}
        role="img"
        aria-label={
          tap && kit.tapHint
            ? tr("screen.withHint", { label, hint: labText(kit.tapHint, tr) })
            : label
        }
        tabIndex={tap ? 0 : undefined}
        onPointerDown={tap}
        onKeyDown={onKeyDown}
        style={tap ? { cursor: "pointer" } : undefined}
      />
    </ScreenFrame>
  );
}
