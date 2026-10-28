import { useId, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { WidgetProps } from "@/widgets/types";
import {
  type DoorCard,
  type DoorClock,
  doorDecide,
  type Lock,
  type Role,
  ruleTrail,
  type Until,
} from "./door-rules";
import styles from "./door.module.css";

type Setup = DoorCard & DoorClock & { lock: Lock };

const ROLES: readonly Role[] = ["resident", "guest", "maintenance", "admin"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** R7 panel: set up a card, the clock and lockdown, and see which rule decides. */
export function DoorRules(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const [st, setSt] = useState<Setup>(() => ({
    lock: "front",
    listed: true,
    role: "resident",
    blocked: false,
    until: "none",
    from: 0,
    to: 0,
    uses: -1,
    lockdown: false,
    synced: true,
    hour: new Date().getHours(),
  }));
  const ids = useId();
  const set = <K extends keyof Setup>(k: K, v: Setup[K]) => setSt((s) => ({ ...s, [k]: v }));
  const decided = doorDecide(st, st);

  return (
    <div className={styles.rulesUi}>
      <div className={styles.rulesForm}>
        <label>
          {t("doorRules.tappedAt")}
          <select value={st.lock} onChange={(e) => set("lock", e.target.value as Lock)}>
            <option value="front">{t("doorRules.front")}</option>
            <option value="admin">{t("doorRules.adminRoom")}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={st.listed}
            onChange={(e) => set("listed", e.target.checked)}
          />{" "}
          {t("doorRules.listed")}
        </label>
        <label>
          {t("doorRules.role")}
          <select value={st.role} onChange={(e) => set("role", e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`doorRules.roles.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={st.blocked}
            onChange={(e) => set("blocked", e.target.checked)}
          />{" "}
          {t("doorRules.blocked")}
        </label>
        <label>
          {t("doorRules.endDate")}
          <select value={st.until} onChange={(e) => set("until", e.target.value as Until)}>
            <option value="none">{t("doorRules.until.none")}</option>
            <option value="future">{t("doorRules.until.future")}</option>
            <option value="past">{t("doorRules.until.past")}</option>
          </select>
        </label>
        <label>
          {t("doorRules.hoursFrom")}
          <select value={st.from} onChange={(e) => set("from", Number(e.target.value))}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hh(h)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("doorRules.to")}
          <select value={st.to} onChange={(e) => set("to", Number(e.target.value))}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hh(h)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("doorRules.uses")}
          <select value={st.uses} onChange={(e) => set("uses", Number(e.target.value))}>
            <option value={-1}>{t("doorRules.unlimited")}</option>
            <option value={3}>{t("doorRules.usesLeft", { count: 3 })}</option>
            <option value={0}>{t("doorRules.usesLeft", { count: 0 })}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={st.lockdown}
            onChange={(e) => set("lockdown", e.target.checked)}
          />{" "}
          {t("doorRules.lockdown")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={st.synced}
            onChange={(e) => set("synced", e.target.checked)}
          />{" "}
          {t("doorRules.synced")}
        </label>
        <label htmlFor={`${ids}h`}>
          {t("doorRules.timeNow")}
          <input
            id={`${ids}h`}
            type="range"
            min={0}
            max={23}
            value={st.hour}
            onChange={(e) => set("hour", Number(e.target.value))}
          />
          <output htmlFor={`${ids}h`}>{hh(st.hour)}</output>
        </label>
      </div>
      <ol className={styles.rulesList}>
        {ruleTrail(st, st).map(({ rule, state }) => (
          <li key={rule.key} className={styles[state]}>
            <span>{t(`doorRules.rules.${rule.key}.name`)}</span>
            <b>{t(`doorRules.trail.${state}`, { says: t(`doorRules.rules.${rule.key}.says`) })}</b>
          </li>
        ))}
        <li className={decided ? styles.skip : styles.open}>
          <span>{t("doorRules.allPassed")}</span>
          <b>{decided ? "–" : t("doorRules.openNote")}</b>
        </li>
      </ol>
      <p className={styles.verdict} aria-live="polite">
        {decided ? (
          <Trans
            t={t}
            i18nKey="doorRules.denied"
            values={{ says: t(`doorRules.rules.${decided.key}.says`) }}
            components={{ now: <span className={`${styles.now} ${styles.critical}`} /> }}
          />
        ) : (
          <Trans
            t={t}
            i18nKey="doorRules.granted"
            components={{ now: <span className={`${styles.now} ${styles.good}`} /> }}
          />
        )}
      </p>
    </div>
  );
}
