import { type CSSProperties, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInterval } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { hx } from "../../protocol/hex";
import styles from "../panels.module.css";
import { anatomy, SAMPLE_KEYS, type SampleKey } from "./anatomy-packet";

/** B1: one advertising packet on air, field by field. */
export function BleAnatomy(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  const [sample, setSample] = useState<SampleKey>("phone");
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const { fields, used } = anatomy(sample, t);
  const n = fields.length;
  const go = (d: number) => setAt((a) => (a + d + n) % n);

  useInterval(() => go(1), playing ? 2600 : null);

  const current = fields[at] ?? fields[0];
  return (
    <div className={styles.wd}>
      <div className={styles.ctl}>
        <select
          className={styles.select}
          aria-label={t("anatomy.device")}
          value={sample}
          onChange={(e) => {
            const key = SAMPLE_KEYS.find((k) => k === e.target.value);
            if (key) setSample(key);
            setAt(0);
          }}
        >
          {SAMPLE_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`anatomy.samples.${k}`)}
            </option>
          ))}
        </select>
        <Button
          aria-label={t("anatomy.previous")}
          onClick={() => {
            setPlaying(false);
            go(-1);
          }}
        >
          ◀
        </Button>
        <Button aria-label={playing ? t("controls.pauseAria") : t("controls.playAria")} onClick={() => setPlaying((p) => !p)}>
          {playing ? "❚❚" : "▶"}
        </Button>
        <Button
          aria-label={t("anatomy.next")}
          onClick={() => {
            setPlaying(false);
            go(1);
          }}
        >
          ▶
        </Button>
      </div>
      <div className={styles.bytes} role="list" aria-label={t("anatomy.bytes")}>
        {fields.map((f, i) => (
          <span
            key={f.id}
            role="listitem"
            className={`${styles.bf} ${i === at ? styles.on : ""}`}
            style={{ "--bf": f.col } as CSSProperties}
          >
            <b>{f.name}</b>
            {f.bytes.map((b, j) => (
              <i key={j}>{hx(b)}</i>
            ))}
          </span>
        ))}
        <span className={styles.used}>{t("anatomy.used", { used })}</span>
      </div>
      {current ? (
        <p className={styles.field} aria-live={playing ? "off" : "polite"}>
          {t("anatomy.position", { at: at + 1, n, what: current.what })}
        </p>
      ) : null}
    </div>
  );
}
