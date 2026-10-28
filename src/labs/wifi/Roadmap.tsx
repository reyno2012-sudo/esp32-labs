import { Trans, useTranslation } from "react-i18next";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { ScrollBox } from "@/ui/ScrollBox";
import styles from "./wifi.module.css";

// Which labs exist and which parts the bench already has; their text lives in the catalogue.
const LESSONS: readonly { readonly id: "W1" | "W2" | "W3" | "W4" | "W5"; readonly built?: boolean }[] =
  [{ id: "W1", built: true }, { id: "W2", built: true }, { id: "W3", built: true }, { id: "W4" }, { id: "W5" }];

type PartId = "bme280" | "esp32" | "powerBank" | "encoder" | "ring" | "ina219" | "buzzer";
const PARTS: readonly { readonly id: PartId; readonly have?: boolean }[] = [
  { id: "bme280", have: true },
  { id: "esp32", have: true },
  { id: "powerBank", have: true },
  { id: "encoder" },
  { id: "ring" },
  { id: "ina219" },
  { id: "buzzer" },
];

/** W1 "The Wi-Fi track": what each lab adds, and parts that unlock more. */
export function Roadmap(_: WidgetProps) {
  const { t } = useTranslation("labs-wifi");
  return (
    <div>
      <ScrollBox label={t("roadmap.lessons")}>
        <table className={styles.roadmap}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{t("roadmap.lesson")}</th>
              <th scope="col">{t("roadmap.capability")}</th>
              <th scope="col">{t("roadmap.needs")}</th>
            </tr>
          </thead>
          <tbody>
            {LESSONS.map((r) => (
              <tr key={r.id} className={r.built ? styles.now : undefined}>
                <td>{r.id}</td>
                <td>{t(`roadmap.rows.${r.id}.title`)}</td>
                <td>{t(`roadmap.rows.${r.id}.capability`)}</td>
                <td className={styles.needs}>{t(`roadmap.rows.${r.id}.needs`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollBox>
      <Caption>
        <Trans
          t={t}
          i18nKey="roadmap.caption"
          components={{ code: <code className={styles.inlineCode} /> }}
        />
      </Caption>
      <h4 className={`${styles.subhead} ${styles.subheadGap}`}>{t("roadmap.parts")}</h4>
      <ScrollBox label={t("roadmap.parts")}>
        <table className={styles.roadmap}>
          <thead>
            <tr>
              <th scope="col">{t("roadmap.part")}</th>
              <th scope="col">{t("roadmap.about")}</th>
              <th scope="col">{t("roadmap.adds")}</th>
            </tr>
          </thead>
          <tbody>
            {PARTS.map((p) => (
              <tr key={p.id} className={p.have ? styles.now : undefined}>
                <td>{t(`roadmap.partRows.${p.id}.name`)}</td>
                <td className={styles.needs}>{t(`roadmap.partRows.${p.id}.about`)}</td>
                <td>{t(`roadmap.partRows.${p.id}.adds`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollBox>
    </div>
  );
}
