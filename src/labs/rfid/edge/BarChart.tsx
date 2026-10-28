import { useTranslation } from "react-i18next";
import styles from "../panels/chart.module.css";
import { type EdgeExperiment, niceTop, type Row } from "./edge-data";
import type { EdgeWords } from "./edge-words";

const W = 680;
const H = 250;
const L = 56;
const R = 12;
const T = 30;
const B = 46;

/** Bars on one scale: yours solid with the example outlined beside each, or the example alone. */
export function BarChart({
  e,
  words: w,
  mine,
}: {
  e: EdgeExperiment;
  words: EdgeWords;
  mine: readonly Row[];
}) {
  const { t } = useTranslation("labs-rfid");
  const hasMine = mine.length > 0;
  const main = hasMine ? mine : e.example;
  const exampleBy = new Map(e.example);
  const all = [
    ...main.map((r) => r[1]),
    ...(hasMine ? e.example.map((r) => r[1]) : []),
    ...(e.ghost ?? []),
  ];
  const top = e.max ?? niceTop(Math.max(0.01, ...all) * 1.08);
  const y = (v: number) => T + (1 - Math.min(v, top) / top) * (H - T - B);
  const slot = (W - L - R) / main.length;
  const bw = Math.min(46, slot * 0.5);
  const label = t("edge.chart.label", {
    name: w.label,
    unit: w.unit,
    x: w.xTitle,
    values: main.map(([l, v]) => `${l}: ${v}`).join(", "),
  });

  return (
    <div className={styles.scroll} dir="ltr">
      <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((k) => {
          const v = (top * k) / 4;
          return (
            <g key={k}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={styles.ax} />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" className={styles.tk}>
                {String(+v.toPrecision(3))}
              </text>
            </g>
          );
        })}
        <text x={4} y={12} className={styles.tk}>
          {w.unit}
        </text>
        <text x={W - R} y={H - 6} textAnchor="end" className={styles.tk}>
          {w.xTitle}
        </text>
        {main.map(([name, v], i) => {
          const cx = L + slot * (i + 0.5);
          const ex = exampleBy.get(name);
          const ghost = e.ghost?.[i];
          const h = Math.max(v > 0 ? 2 : 0, H - B - y(v));
          return (
            <g key={`${name}-${i}`}>
              <title>
                {hasMine && ex !== undefined
                  ? t("edge.chart.barWithExample", { name, value: v, unit: w.unit, example: ex })
                  : t("edge.chart.bar", { name, value: v, unit: w.unit })}
              </title>
              {ghost !== undefined ? (
                <rect
                  x={cx - bw / 2 - 4}
                  y={y(ghost)}
                  width={bw + 8}
                  height={H - B - y(ghost)}
                  rx={2}
                  className={styles.ghost}
                />
              ) : null}
              {hasMine && ex !== undefined ? (
                <rect
                  x={cx + bw / 2 + 2}
                  y={y(ex)}
                  width={8}
                  height={Math.max(1, H - B - y(ex))}
                  rx={2}
                  className={styles.ghost}
                />
              ) : null}
              <rect
                x={cx - bw / 2}
                y={H - B - h}
                width={bw}
                height={h}
                rx={3}
                className={styles.bar}
              />
              <text x={cx} y={H - B - h - 6} textAnchor="middle" className={styles.val}>
                {String(v)}
              </text>
              <text x={cx} y={H - B + 16} textAnchor="middle" className={styles.tk}>
                {name}
              </text>
              {e.mark === name ? (
                <>
                  <rect
                    x={cx - slot / 2 + 3}
                    y={T - 4}
                    width={slot - 6}
                    height={H - B - T + 26}
                    rx={4}
                    className={styles.mark}
                  />
                  {w.markText ? (
                    <text x={cx} y={T - 8} textAnchor="middle" className={styles.lbl}>
                      {w.markText}
                    </text>
                  ) : null}
                </>
              ) : null}
            </g>
          );
        })}
        {e.between !== undefined && e.between < main.length ? (
          <>
            <line
              x1={L + slot * (e.between + 1)}
              x2={L + slot * (e.between + 1)}
              y1={T}
              y2={H - B}
              className={styles.need}
            />
            <text x={L + slot * (e.between + 1) + 4} y={T + 10} className={styles.lbl}>
              {w.betweenText}
            </text>
          </>
        ) : null}
        {e.ghost ? (
          <text
            x={W - R}
            y={T - 6}
            textAnchor="end"
            className={styles.tk}
          >
            {t("edge.chart.dashed", { text: w.ghostText ?? "" })}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
