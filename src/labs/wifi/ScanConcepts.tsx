import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleInfo } from "@/i18n/use-locale";
import { useInterval } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { CLEAN_CHANNELS, EXAMPLE_NETS } from "./example-nets";
import styles from "./wifi.module.css";

const CHANNELS = Array.from({ length: 13 }, (_, i) => i + 1);
const HOP_MS = 900;

const TICKS = [
  ["−30", "excellent"],
  ["−55", "veryGood"],
  ["−67", "good"],
  ["−78", "weak"],
  ["−90", "barely"],
] as const;

/** W1 "How a scan works": the radio hopping channels 1 to 13, and the RSSI scale. */
export function ScanConcepts(_: WidgetProps) {
  const { t } = useTranslation("labs-wifi");
  const { tag } = useLocaleInfo();
  const reduce = useReducedMotion();
  // `hops` counts every channel visited so far; cells keep the dots of channels already heard.
  const [hops, setHops] = useState(0);
  useInterval(() => setHops((h) => h + 1), reduce ? null : HOP_MS);

  const ch = (hops % 13) + 1;
  const found = EXAMPLE_NETS.filter((n) => n.ch === ch);
  const clean = CLEAN_CHANNELS.includes(ch);

  return (
    <div className={styles.wd}>
      <p className={styles.goal}>
        {t("scan.goal")}
      </p>
      <ol className={styles.hop} aria-label={t("scan.channels")}>
        {CHANNELS.map((c) => {
          const heard = hops >= 13 || c <= ch ? EXAMPLE_NETS.filter((n) => n.ch === c).length : 0;
          return (
            <li
              key={c}
              className={`${CLEAN_CHANNELS.includes(c) ? styles.clean : ""} ${c === ch ? styles.on : ""}`}
              aria-current={c === ch ? "step" : undefined}
            >
              <span>{c}</span>
              <span className={styles.hopDots} aria-hidden="true">
                {Array.from({ length: heard }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            </li>
          );
        })}
      </ol>
      <div className={styles.capBox}>
        <i className={styles.sw} aria-hidden="true" />
        <strong>
          {t(clean ? "scan.channelClean" : "scan.channel", { channel: ch })}
        </strong>
        <span>
          {found.length
            ? t("scan.heard", {
                count: found.length,
                names: new Intl.ListFormat(tag, { style: "short", type: "unit" }).format(
                  found.map((n) => n.ssid || t("scan.hidden")),
                ),
              })
            : t("scan.nothing")}{" "}
          <em>{t("scan.example")}</em>
        </span>
      </div>
      <div className={styles.rssiScale} role="group" aria-label={t("scan.scale")}>
        <h4 className={styles.subhead}>{t("scan.scaleTitle")}</h4>
        <div className={styles.rssiBar} aria-hidden="true" />
        <div className={styles.rssiTicks}>
          {TICKS.map(([db, word]) => (
            <span key={db}>
              <b>{db}</b>
              {t(`scan.ticks.${word}`)}
            </span>
          ))}
        </div>
        <Caption>
          {t("scan.caption")}
        </Caption>
      </div>
    </div>
  );
}
