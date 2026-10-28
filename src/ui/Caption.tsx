import type { ReactNode } from "react";
import styles from "./Caption.module.css";

/** The small mono note under a simulator or diagram. */
export function Caption({ children, live = false }: { children: ReactNode; live?: boolean }) {
  return (
    <p className={styles.caption} aria-live={live ? "polite" : undefined}>
      {children}
    </p>
  );
}
