import { type CSSProperties, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleInfo } from "@/i18n/use-locale";
import { Button } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { hx, hxs } from "../protocol/bytes";
import { valueBlock } from "../protocol/card-memory";
import styles from "./panels.module.css";

const CLS = [
  "v",
  "v",
  "v",
  "v",
  "nv",
  "nv",
  "nv",
  "nv",
  "v",
  "v",
  "v",
  "v",
  "a",
  "na",
  "a",
  "na",
] as const;
const LBL = [
  "v0",
  "v1",
  "v2",
  "v3",
  "~v0",
  "~v1",
  "~v2",
  "~v3",
  "v0",
  "v1",
  "v2",
  "v3",
  "adr",
  "~adr",
  "adr",
  "~adr",
] as const;
const LEGEND = [
  ["--w-sda", "value"],
  ["--muted", "inverted"],
  ["--copper", "address"],
  ["--gnd", "addressInverted"],
] as const;

const clampInt = (text: string, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(Number(text) || 0)));

/** R5 panel: how a value block stores a number three times, once inverted. */
export function RfidValue(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const { tag } = useLocaleInfo();
  const [valueText, setValueText] = useState("47");
  const [addrText, setAddrText] = useState("8");
  const [changed, setChanged] = useState(false);
  const [refused, setRefused] = useState(false);
  const ids = useId();
  const v = clampInt(valueText, -2147483648, 2147483647);
  const a = clampInt(addrText, 0, 255);
  const bytes = valueBlock(v, a);

  function step(delta: number) {
    if (delta < 0 && Number(valueText) < -delta) {
      setRefused(true);
      return;
    }
    setValueText(String(Number(valueText) + delta));
    setChanged(true);
    setRefused(false);
  }

  return (
    <div className={styles.wd}>
      <div className={styles.inputs}>
        <label htmlFor={`${ids}v`}>
          {t("value.value")}
          <input
            id={`${ids}v`}
            className={styles.field}
            type="number"
            min={-2147483648}
            max={2147483647}
            value={valueText}
            onChange={(e) => {
              setValueText(e.target.value);
              setChanged(false);
              setRefused(false);
            }}
          />
        </label>
        <label htmlFor={`${ids}a`}>
          {t("value.address")}
          <input
            id={`${ids}a`}
            className={styles.field}
            type="number"
            min={0}
            max={255}
            value={addrText}
            onChange={(e) => {
              setAddrText(e.target.value);
              setChanged(false);
              setRefused(false);
            }}
          />
        </label>
        <Button onClick={() => step(10)}>{t("value.add")}</Button>
        <Button onClick={() => step(-3)}>{t("value.use")}</Button>
      </div>
      <div className={styles.memScroll} dir="ltr">
        <div
          className={styles.vb}
          role="img"
          aria-label={t("value.block", { bytes: hxs(bytes) })}
        >
          {bytes.map((x, i) => {
            const cls = CLS[i] ?? "v";
            return (
              <div
                key={i}
                className={`${styles[cls]} ${changed && cls !== "a" && cls !== "na" ? styles.changed : ""}`}
              >
                {hx(x)}
                <small>{LBL[i]}</small>
              </div>
            );
          })}
        </div>
      </div>
      <p className={styles.legend}>
        {LEGEND.map(([token, key]) => (
          <span key={key}>
            <i style={{ "--key": `var(${token})` } as CSSProperties} />
            {t(`value.legend.${key}`)}
          </span>
        ))}
      </p>
      <Caption live>
        {refused
          ? t("value.refused")
          : t("value.explain", {
              value: new Intl.NumberFormat(tag).format(v),
              bytes: hxs(bytes.slice(0, 4)),
            })}
      </Caption>
    </div>
  );
}
