import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RichText } from "@/ui/RichText";
import type { WidgetProps } from "@/widgets/types";
import styles from "./compare.module.css";

// The words live in labs-display (compare.rows.<key>); the code row is code, so it stays here.
const ROWS = ["direction", "wires", "power", "signal", "pins", "helper", "code", "wrong"] as const;
const CODE: readonly [ReactNode, ReactNode] = [
  <>
    <code>SPI.begin(12, -1, 11, 10)</code>
    <br />
    <code>tft.init(170, 320)</code>
  </>,
  <>
    <code>pinMode(5, INPUT_PULLUP)</code>
    <br />
    <code>attachInterruptArg(…, CHANGE)</code>
  </>,
];

/** Lesson 03b variation 2: the screen (an output) and the button (an input), side by side. */
export function ScreenVsButton(_: WidgetProps) {
  const { t } = useTranslation("labs-display");
  return (
    <div className={styles.cmp} role="table" aria-label={t("compare.aria")}>
      <div role="row" className={styles.head}>
        <div role="columnheader" className={`${styles.k} ${styles.blank}`}>
          <span className={styles.srOnly}>{t("compare.aspect")}</span>
        </div>
        <div role="columnheader" className={styles.h}>
          <i style={{ background: "var(--w-scl)" }}>{t("compare.output")}</i>
          {t("compare.screen")}
        </div>
        <div role="columnheader" className={styles.h}>
          <i style={{ background: "var(--w-btn)" }}>{t("compare.input")}</i>
          {t("compare.button")}
        </div>
      </div>
      {ROWS.map((key) => (
        <div role="row" key={key} className={styles.row}>
          <div role="rowheader" className={styles.k}>
            {t(`compare.rows.${key}.label`)}
          </div>
          <div role="cell">
            {key === "code" ? CODE[0] : <RichText text={t(`compare.rows.${key}.screen`)} />}
          </div>
          <div role="cell">
            {key === "code" ? CODE[1] : <RichText text={t(`compare.rows.${key}.button`)} />}
          </div>
        </div>
      ))}
    </div>
  );
}
