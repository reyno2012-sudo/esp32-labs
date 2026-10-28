import { useTranslation } from "react-i18next";
import type { WiringTable as Wiring } from "@/domain/lesson";
import { RichText } from "@/ui/RichText";
import styles from "./tables.module.css";

const GPIO = /^GPIO \d+$/;

/** Board-side pin names render as coloured chips, like the tags on the pinout. */
function PinChip({ text }: { text: string }) {
  if (text === "GND") return <span className={`${styles.chip} ${styles.gnd}`}>GND</span>;
  if (text === "3V3") return <span className={`${styles.chip} ${styles.pwr}`}>3V3</span>;
  if (GPIO.test(text)) return <span className={styles.chip}>{text}</span>;
  return <RichText text={text} />;
}

/** From where to where, one row per wire. The section around it carries the title. */
export function WiringTable({ wiring }: { wiring: Wiring }) {
  const { t } = useTranslation("lesson");
  const head = wiring.head ?? [t("wiring.from"), t("wiring.to"), t("wiring.notes")];
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wiring.rows.map(([from, to, note]) => (
            <tr key={`${from}-${to}`}>
              <td className={styles.mono}>
                <RichText text={from} />
              </td>
              <td>
                <PinChip text={to} />
              </td>
              <td>
                <RichText text={note} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
