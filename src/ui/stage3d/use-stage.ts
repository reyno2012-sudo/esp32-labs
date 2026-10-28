import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useFrameLoop } from "@/lib/animation";
import { createLogger, errorData } from "@/lib/logger";
import { prefersReducedMotion } from "@/lib/media";
import { Stage3d, type StageOptions, type ThreeModule } from "./stage3d";

const log = createLogger("stage-3d");

export type StageStatus = "loading" | "ready" | "failed";

/**
 * Loads three.js (its own chunk, only when a 3D panel opens), builds the stage inside the
 * box once, runs it while it is on screen and disposes everything on unmount.
 */
export function useStage3d(
  options: Omit<StageOptions, "reduce">,
  build: (T: ThreeModule, stage: Stage3d) => void,
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage3d | null>(null);
  const [status, setStatus] = useState<StageStatus>("loading");

  const create = useEffectEvent((T: ThreeModule): Stage3d | null => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const labels = labelsRef.current;
    if (!box || !canvas || !labels) return null;
    const stage = new Stage3d(T, box, canvas, labels, {
      ...options,
      reduce: prefersReducedMotion(),
    });
    build(T, stage);
    stage.outline();
    return stage;
  });

  useEffect(() => {
    let cancelled = false;
    let stage: Stage3d | null = null;
    import("three")
      .then((T) => {
        if (cancelled) return;
        stage = create(T);
        stageRef.current = stage;
        setStatus(stage ? "ready" : "failed");
      })
      .catch((error: unknown) => {
        log.error("three.js failed to load", errorData(error));
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
      stage?.dispose();
      stageRef.current = null;
    };
  }, []);

  useFrameLoop(boxRef, ({ now, dt }) => stageRef.current?.tick(now, dt), status === "ready");

  return { boxRef, canvasRef, labelsRef, stageRef, status };
}
