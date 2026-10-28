import styles from "./TraceDecor.module.css";

// Copper traces with vias along the page's edges, like the margins of a schematic sheet.
const TRACES = [
  "M0 120H140L180 80H420",
  "M0 160H120L160 200H300L330 230",
  "M1200 60H1010L970 100H860",
  "M1200 110H1060L1030 140H940L910 170",
  "M0 560H70L110 600V720",
  "M1200 520H1130L1090 560V700",
];
const VIAS: readonly (readonly [number, number])[] = [
  [420, 80],
  [330, 230],
  [860, 100],
  [910, 170],
  [110, 720],
  [1090, 700],
];

/** Decoration only: hidden from assistive tech, behind everything, never in the way. */
export function TraceDecor() {
  return (
    <svg
      className={styles.decor}
      viewBox="0 0 1200 760"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      {TRACES.map((d) => (
        <path key={d} d={d} />
      ))}
      {VIAS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />
      ))}
    </svg>
  );
}
