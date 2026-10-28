import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { hx } from "../../protocol/hex";
import type { HidItem } from "../../protocol/hid";
import own from "./B8Decoder.module.css";

interface Props {
  bytes: readonly number[];
  items: readonly HidItem[];
  fieldCount: number;
  /** The item that defined the field being lit, if any. */
  lit: number | undefined;
}

/** The Report Map, item by item, with the one that made the current field highlighted. */
export function ReportItems({ bytes, items, fieldCount, lit }: Props) {
  const { t } = useTranslation("labs-ble");
  const boxRef = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);

  // Only this box scrolls, never the page.
  useEffect(() => {
    const box = boxRef.current;
    const row = lit === undefined ? null : rows.current[lit];
    if (box && row) box.scrollTop = Math.max(0, row.offsetTop - 60);
  }, [lit]);

  return (
    <div className={own.term}>
      <div className={own.bar}>
        <span>{t("items.title")}</span>
        <span>{t("items.size", { bytes: bytes.length, fields: fieldCount })}</span>
      </div>
      {/* Scrollable region: focusable so keyboard users can scroll it. */}
      <div
        ref={boxRef}
        className={own.items}
        dir="ltr"
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- focusable so keyboard users can reach it
        tabIndex={0}
        role="region"
        aria-label={t("items.title")}
      >
        {items.map((it, i) => (
          <div
            key={it.at}
            ref={(el) => {
              rows.current[i] = el;
            }}
            className={i === lit ? own.lit : undefined}
          >
            {bytes
              .slice(it.at, it.at + it.len)
              .map(hx)
              .join(" ")
              .padEnd(12)}
            {"  "}
            {it.text}
          </div>
        ))}
      </div>
    </div>
  );
}
