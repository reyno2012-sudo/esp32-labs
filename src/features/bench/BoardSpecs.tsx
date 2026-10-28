import { Trans, useTranslation } from "react-i18next";
import styles from "./BenchOverview.module.css";

/** The board on the bench, in five numbers. */
const SPECS = ["chip", "cores", "flash", "psram", "radio", "logic"] as const;

export function BoardSpecs() {
  const { t } = useTranslation("bench");
  return (
    <p className={styles.spec} aria-label={t("specs.label")}>
      {SPECS.map((spec) => (
        <span key={spec}>
          <Trans t={t} i18nKey={`specs.${spec}`} components={{ b: <b /> }} />
        </span>
      ))}
    </p>
  );
}
