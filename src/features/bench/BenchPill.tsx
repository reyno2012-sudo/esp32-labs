import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { benchStatusQuery } from "./queries";
import styles from "./BenchPill.module.css";

/** The one bench fact worth seeing everywhere: what is flashed on the board right now. */
export function BenchPill() {
  const { data } = useQuery(benchStatusQuery());
  const now = data?.overview.find((item) => item.highlight);
  if (!now) return null; // The guide works without it; a failed fetch is already logged.
  return (
    <Link to="/log" className={styles.pill} title={now.detail}>
      <span className={styles.led} aria-hidden="true" />
      <span className={styles.label}>{now.label}</span>
      <b>{now.value}</b>
    </Link>
  );
}
