import type { ReactNode } from "react";
import styles from "./ScreenFrame.module.css";

/** The dark bezel around a simulated 320×170 screen. Put one <canvas> inside. */
export function ScreenFrame({ children }: { children: ReactNode }) {
  return <div className={styles.frame}>{children}</div>;
}
