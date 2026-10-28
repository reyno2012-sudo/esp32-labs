import type { MouseEventHandler, ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/ui/Icon";
import type { Stage3d } from "./stage3d";
import styles from "./StageBox.module.css";
import type { StageStatus } from "./use-stage";

interface StageBoxProps {
  boxRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  labelsRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Stage3d | null>;
  status: StageStatus;
  label: string;
  /** What still works when three.js can't run. */
  fallback: string;
  onClick?: MouseEventHandler<HTMLCanvasElement>;
  className?: string;
  /** Class of the canvas's own frame (it holds the toolbar), for layouts that place it. */
  viewClassName?: string;
  /** Extra content inside the box, e.g. callout cards the leaders point from. */
  children?: ReactNode;
}

const STEP = Math.PI / 8;

/**
 * The 3D stage's box: canvas, the labels and leaders that follow 3D points, a small toolbar
 * (turn, zoom, recentre: the same as dragging and pinching, for keyboards and one hand) and
 * the load state.
 */
export function StageBox({
  boxRef,
  canvasRef,
  labelsRef,
  stageRef,
  status,
  label,
  fallback,
  onClick,
  className,
  viewClassName,
  children,
}: StageBoxProps) {
  const { t } = useTranslation();
  return (
    <div ref={boxRef} className={`${styles.stage} ${className ?? ""}`} data-status={status}>
      <div className={`${styles.view} ${viewClassName ?? ""}`}>
        {/* Clicks pick a part of the model; every pick also has a button or menu outside it. */}
        <canvas ref={canvasRef} dir="ltr" role="img" aria-label={label} onClick={onClick} />
        {status === "ready" ? (
          <div className={styles.tools} role="toolbar" aria-label={t("ui.stage.toolbar")}>
            <button
              type="button"
              onClick={() => stageRef.current?.rotate(-STEP)}
              aria-label={t("ui.stage.turnLeft")}
            >
              <Icon name="rotateLeft" size={16} />
            </button>
            <button
              type="button"
              onClick={() => stageRef.current?.rotate(STEP)}
              aria-label={t("ui.stage.turnRight")}
            >
              <Icon name="rotateRight" size={16} />
            </button>
            <span className={styles.sep} aria-hidden="true" />
            <button
              type="button"
              onClick={() => stageRef.current?.zoom(1.18)}
              aria-label={t("ui.stage.zoomOut")}
            >
              <Icon name="zoomOut" size={16} />
            </button>
            <button
              type="button"
              onClick={() => stageRef.current?.zoom(1 / 1.18)}
              aria-label={t("ui.stage.zoomIn")}
            >
              <Icon name="zoomIn" size={16} />
            </button>
            <span className={styles.sep} aria-hidden="true" />
            <button
              type="button"
              onClick={() => stageRef.current?.recenter()}
              aria-label={t("ui.stage.recenter")}
            >
              <Icon name="recenter" size={16} />
            </button>
          </div>
        ) : null}
        <p className={styles.hint} aria-hidden="true">
          {t("ui.stage.hint")}
        </p>
        {status !== "ready" ? (
          <p className={styles.load} role="status">
            {status === "loading"
              ? t("ui.stage.loading")
              : t("ui.stage.failed", { fallback })}
          </p>
        ) : null}
      </div>
      {children}
      {/* Labels and leaders are positioned by the stage every frame (physical x, y), so the box stays
          left to right; React leaves it empty. */}
      <div ref={labelsRef} className={styles.labels} dir="ltr" aria-hidden="true" />
    </div>
  );
}
