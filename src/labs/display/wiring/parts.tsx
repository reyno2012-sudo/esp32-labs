// Small building blocks shared by the wiring diagrams.
import type { CSSProperties, ReactNode } from "react";
import type { CaptionLine } from "./spi-analyzer";
import styles from "./wiring.module.css";

/** The caption box under a diagram: a colour swatch, a bold line and an explanation. */
export function WireCaption({
  color,
  title,
  children,
}: {
  color: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <p className={styles.wdCap} aria-live="polite">
      <i className={styles.sw} style={{ background: `var(${color})` }} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{children}</span>
    </p>
  );
}

/** Two lines of "dim key + value" under a scope canvas. */
export function ScopeCaption({
  lines,
  live = false,
}: {
  lines: readonly CaptionLine[];
  live?: boolean;
}) {
  return (
    <p aria-live={live ? "polite" : undefined}>
      {lines.map(([key, value], i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          <span className={styles.k}>{key}</span>
          {value}
        </span>
      ))}
    </p>
  );
}

/** An SVG text label. */
export function Label({
  x,
  y,
  className = styles.lbl,
  anchor = "start",
  style,
  children,
}: {
  x: number;
  y: number;
  className?: string;
  anchor?: "start" | "middle" | "end";
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <text x={x} y={y} className={className} textAnchor={anchor} style={style}>
      {children}
    </text>
  );
}
