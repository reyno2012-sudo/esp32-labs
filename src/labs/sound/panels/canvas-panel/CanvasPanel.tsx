import { type ComponentProps, type ReactNode, useRef } from "react";
import { useFrameLoop } from "@/lib/animation";
import { context2d, type ScopePalette, scopePalette } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import styles from "../panel.module.css";

export interface PanelFrame {
  readonly g: CanvasRenderingContext2D;
  readonly C: ScopePalette;
  /** Seconds since the last frame (≤ 0.1). */
  readonly dt: number;
  /** Seconds, for animation phases. */
  readonly t: number;
  readonly reduce: boolean;
  /** Writes the live caption (only when the text changed). */
  caption(text: string): void;
}

type CanvasEvents = Pick<
  ComponentProps<"canvas">,
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "onKeyDown"
  | "tabIndex"
  | "style"
>;

interface CanvasPanelProps {
  /** Drawing size in canvas pixels; the canvas scales to the panel's width. */
  w?: number;
  h: number;
  /** What the picture shows, for screen readers. */
  label: string;
  /** The control bar above the picture. */
  controls?: ReactNode;
  /** A caption React renders; when absent, the frame loop writes it through `frame.caption`. */
  caption?: ReactNode;
  /** Draws one frame; runs every animation frame while the panel is on screen. */
  onFrame: (frame: PanelFrame) => void;
  canvas?: CanvasEvents;
  children?: ReactNode;
}

/**
 * The sound panels' shape (the original soundPanelCanvas + soundLoop): a control bar, a canvas
 * redrawn every frame, a caption. Off-screen panels sleep.
 */
export function CanvasPanel({
  w = 680,
  h,
  label,
  controls,
  caption,
  onFrame,
  canvas,
  children,
}: CanvasPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capRef = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();

  useFrameLoop(canvasRef, ({ now, dt }) => {
    const node = canvasRef.current;
    if (!node) return;
    onFrame({
      g: context2d(node),
      C: scopePalette(),
      dt,
      t: now / 1000,
      reduce,
      caption: (text) => {
        const cap = capRef.current;
        if (cap && cap.textContent !== text) cap.textContent = text;
      },
    });
  });

  return (
    <div className={styles.wd}>
      {controls ? <div className={styles.ctl}>{controls}</div> : null}
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        role="img"
        dir="ltr"
        aria-label={label}
        className={styles.canvas}
        {...canvas}
      />
      {caption !== undefined ? (
        <Caption live>{caption}</Caption>
      ) : (
        <p ref={capRef} className={styles.cap} aria-live="polite" />
      )}
      {children}
    </div>
  );
}
