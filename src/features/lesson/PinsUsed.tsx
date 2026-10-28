import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { PinUse } from "@/domain/lesson";
import { pinLabel } from "@/domain/board";
import { roleFill } from "@/features/board/pin-colour";
import styles from "./PinsUsed.module.css";

const gpio = (label: string) => (/^\d+$/.test(label) ? `GPIO ${label}` : label);

/** The pins this lesson uses, as the same coloured tags the pinout shows. */
export function PinsUsed({ pins, usb }: { pins: readonly PinUse[]; usb: boolean }) {
  const { t } = useTranslation("lesson");
  if (!pins.length && !usb) return null;
  return (
    <ul className={styles.pins} aria-label={t("pins.label")}>
      {pins.map((p) => (
        <li
          key={`${p.pin}-${p.idx ?? 0}-${p.role}`}
          style={{ "--pin": roleFill(p.kind) } as CSSProperties}
        >
          <span className={styles.pin}>{gpio(pinLabel(p.pin))}</span>
          {p.role}
        </li>
      ))}
      {usb ? (
        <li style={{ "--pin": "var(--muted)" } as CSSProperties}>
          <span className={styles.pin}>USB</span>
          {t("pins.usb")}
        </li>
      ) : null}
    </ul>
  );
}
