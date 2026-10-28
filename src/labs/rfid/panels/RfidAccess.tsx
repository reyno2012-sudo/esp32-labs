import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { RichText } from "@/ui/RichText";
import { Button, ButtonRow } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import {
  BIT_MAP,
  bitsOf,
  type Conditions,
  decodeAccess,
  encodeAccess,
  locksForever,
  PRESETS,
  type PresetKey,
  ruleId,
  withCondition,
} from "../protocol/access-bits";
import { hx, hxs, parseHexBytes } from "../protocol/bytes";
import styles from "./panels.module.css";

const BYTE_NOTE = ["~C2 | ~C1", "C1 | ~C3", "C3 | C2"] as const;

/** R4 panel: decode and build a sector trailer's access bits (bytes 6-8). */
export function RfidAccess(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const blockName = (b: number) => (b === 3 ? t("access.theTrailer") : t("access.rowBlock", { n: b }));
  const [cond, setCond] = useState<Conditions>([0, 0, 0, 1]);
  const [text, setText] = useState("FF 07 80");
  const [inconsistent, setInconsistent] = useState(false);
  const [hl, setHl] = useState(-1);
  const inputId = useId();
  const bytes = encodeAccess(cond);

  function apply(next: Conditions) {
    setCond(next);
    setText(hxs(encodeAccess(next)));
    setInconsistent(false);
  }

  function toggle(block: number, k: number, on: boolean) {
    const bit = 4 >> k;
    const c = cond[block] ?? 0;
    apply(withCondition(cond, block, on ? c | bit : c & ~bit));
  }

  function type(value: string) {
    setText(value);
    const parsed = parseHexBytes(value, 3);
    if (!parsed) return;
    const decoded = decodeAccess([parsed[0] ?? 0, parsed[1] ?? 0, parsed[2] ?? 0]);
    if (!decoded) {
      setInconsistent(true);
      return;
    }
    setInconsistent(false);
    setCond(decoded);
  }

  const trailer = cond[3] ?? 0;
  return (
    <div className={styles.wd}>
      <ButtonRow className={styles.alignEnd}>
        {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
          <Button key={key} onClick={() => apply(PRESETS[key])}>
            {t(`access.presets.${key}`)}
          </Button>
        ))}
        <span className={styles.inputs}>
          <label htmlFor={inputId}>
            {t("access.typeBytes")}
            <input
              id={inputId}
              className={styles.field}
              value={text}
              onChange={(e) => type(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
            />
          </label>
        </span>
      </ButtonRow>
      <div className={styles.tableScroll}>
        <table className={styles.abTable}>
          <thead>
            <tr>
              <th>{t("access.colBlock")}</th>
              <th>C1</th>
              <th>C2</th>
              <th>C3</th>
              <th>{t("access.colAllows")}</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((b) => (
              // Hovering or focusing a row lights up where its 3 bits (and their inverted copies) live.
              <tr key={b} onMouseEnter={() => setHl(b)} onFocus={() => setHl(b)}>
                <td className={styles.mono}>{b === 3 ? t("access.rowTrailer") : t("access.rowBlock", { n: b })}</td>
                {bitsOf(cond, b).map((v, k) => (
                  <td key={k} className={styles.c}>
                    <input
                      type="checkbox"
                      checked={v === 1}
                      onChange={(e) => toggle(b, k, e.target.checked)}
                      aria-label={t("access.bitOf", { n: k + 1, block: blockName(b) })}
                    />
                  </td>
                ))}
                <td>{t(`access.${b === 3 ? "trailer" : "data"}.${ruleId(cond[b] ?? 0)}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.abBytes} dir="ltr">
        {bytes.map((v, i) => (
          <div key={i} className={styles.abByte}>
            <b>{t("access.byte", { n: 6 + i })}</b>
            <span className={styles.hex}>{hx(v)}</span>
            <div className={styles.bits}>
              {(BIT_MAP[i] ?? []).map(([n, b, inv], k) => (
                <i
                  key={k}
                  className={`${inv ? styles.inv : ""} ${b === hl ? styles.hl : ""}`}
                  title={t(inv ? "access.invertedBitOf" : "access.bitOf", { n, block: blockName(b) })}
                >
                  {(v >> (7 - k)) & 1}
                </i>
              ))}
            </div>
            <small>{t("access.byteNote", { bits: BYTE_NOTE[i] })}</small>
          </div>
        ))}
      </div>
      <div aria-live="polite">
        {inconsistent ? (
          <div className={styles.warnBox}>
            <RichText text={t("access.inconsistent")} />
          </div>
        ) : locksForever(trailer) ? (
          <div className={styles.warnBox}>
            <RichText
              text={t("access.locked", { bits: trailer.toString(2).padStart(3, "0") })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
