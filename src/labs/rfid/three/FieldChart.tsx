import { useTranslation } from "react-i18next";
import styles from "../panels/chart.module.css";
import { FIELD, rangeAt } from "../protocol/field";

const W = 680;
const H = 210;
const L = 58;
const R = 14;
const T = 14;
const B = 34;
const x = (mm: number) => L + (mm / 80) * (W - L - R);
const y = (b: number) => T + (1 - (Math.log10(b) + 2) / 2) * (H - T - B); // 0.01 … 1
const CURVE = Array.from(
  { length: 81 },
  (_, mm) => `${mm ? "L" : "M"}${x(mm).toFixed(1)} ${y(Math.max(0.01, FIELD.B(mm))).toFixed(1)}`,
).join("");

/** Field at the card vs height (log scale), the two thresholds and the zone that works. */
export function FieldChart({ dist, db }: { dist: number; db: number }) {
  const { t } = useTranslation("labs-rfid");
  const r = rangeAt(db);
  const hearB = FIELD.hear(db);
  const b = Math.max(0.01, FIELD.B(dist));
  return (
    <div className={styles.scroll} dir="ltr">
      <svg
        className={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t("field3d.chart.label")}
      >
        {[1, 0.1, 0.01].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={styles.ax} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" className={styles.tk}>
              {String(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: 9 }, (_, i) => i * 10).map((mm) => (
          <text key={mm} x={x(mm)} y={H - B + 16} textAnchor="middle" className={styles.tk}>
            {mm}
          </text>
        ))}
        <text x={W - R} y={H - 4} textAnchor="end" className={styles.tk}>
          {t("field3d.chart.x")}
        </text>
        <text x={4} y={T + 4} className={styles.tk}>
          {t("field3d.chart.y")}
        </text>
        {r > 0 ? (
          <rect
            x={x(0)}
            y={T}
            width={x(Math.min(r, 80)) - x(0)}
            height={H - T - B}
            className={styles.zone}
          />
        ) : null}
        <path d={CURVE} className={styles.curve} />
        <line x1={L} x2={W - R} y1={y(FIELD.need)} y2={y(FIELD.need)} className={styles.need} />
        <text x={W - R - 4} y={y(FIELD.need) - 5} textAnchor="end" className={styles.lbl}>
          {t("field3d.chart.wakes")}
        </text>
        {hearB > 0.01 ? (
          <>
            <line x1={L} x2={W - R} y1={y(hearB)} y2={y(hearB)} className={styles.hear} />
            <text
              x={W - R - 4}
              y={y(hearB) + 13}
              textAnchor="end"
              className={styles.lbl}
            >
              {t("field3d.chart.hears", { db })}
            </text>
          </>
        ) : null}
        <text x={x(Math.min(r, 80) / 2)} y={T + 14} textAnchor="middle" className={styles.lbl}>
          {r > 0 ? t("field3d.chart.works", { mm: Math.round(r) }) : t("field3d.chart.nothing")}
        </text>
        <line x1={x(dist)} x2={x(dist)} y1={T} y2={H - B} className={styles.cursor} />
        <circle cx={x(dist)} cy={y(b)} r={5} className={styles.dot} />
      </svg>
    </div>
  );
}
