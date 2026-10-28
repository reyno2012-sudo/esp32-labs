/* eslint-disable i18next/no-literal-string -- literal text here is the Bluetooth spec's feature name, not interface text. */
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import type { WidgetProps } from "@/widgets/types";
import { B4_CAPS, b4Method, type PairMethod } from "../../protocol/pairing";
import styles from "../panels.module.css";
import own from "./B4Matrix.module.css";

const COLOR: Readonly<Record<PairMethod, string>> = {
  J: "var(--scope-amber)",
  N: "var(--scope-violet)",
  PI: "var(--ble)",
  PR: "var(--ble)",
  PB: "var(--ble)",
};
const CODE = "482915";

type RoleText = "nothing" | "tapYes" | "pressYes" | "types" | "shows" | "typeSame" | "onBoth";

/** What one side does; the words live in the catalogue (matrix.roles.<text>). */
interface Role {
  readonly text: RoleText;
  /** The number or keys drawn on the device; "digits" is the translated "⌨ 6 digits". */
  readonly code?: string;
  readonly col?: string;
}

const ROLES: Readonly<Record<PairMethod, readonly [Role, Role]>> = {
  J: [{ text: "nothing" }, { text: "nothing" }],
  N: [
    { text: "tapYes", code: CODE, col: "var(--scope-violet)" },
    { text: "pressYes", code: CODE, col: "var(--scope-violet)" },
  ],
  PI: [
    { text: "types", code: "⌨ ······", col: "var(--muted)" },
    { text: "shows", code: CODE, col: "var(--ble)" },
  ],
  PR: [
    { text: "shows", code: CODE, col: "var(--ble)" },
    { text: "types", code: "⌨ ······", col: "var(--muted)" },
  ],
  PB: [
    { text: "typeSame", code: "digits", col: "var(--muted)" },
    { text: "onBoth", code: "digits", col: "var(--muted)" },
  ],
};

/** Why the method follows: Just Works has two reasons, depending on MITM. */
const whyKey = (m: PairMethod, mitm: boolean) => (m === "J" ? (mitm ? "JNoInput" : "JNoMitm") : m);

/** B4: which pairing method two IO capabilities lead to. */
export function B4Matrix(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  const [init, setInit] = useState(4);
  const [resp, setResp] = useState(0);
  const [sc, setSc] = useState(true);
  const [mitm, setMitm] = useState(true);
  const pathRef = useRef<SVGPathElement>(null);
  const scId = useId();
  const mitmId = useId();
  const m = b4Method(init, resp, sc, mitm);
  const [phoneRole, boardRole] = ROLES[m];

  useFrameLoop(
    pathRef,
    ({ now }) => pathRef.current?.setAttribute("stroke-dashoffset", String(-(now / 40) % 12)),
    !reduce,
  );

  return (
    <div className={styles.wd}>
      <div className={styles.ctl}>
        <label>
          {t("matrix.phone")}
          <select
            className={styles.select}
            aria-label={t("matrix.phoneAria")}
            value={init}
            onChange={(e) => setInit(Number(e.target.value))}
          >
            {B4_CAPS.map((c, i) => (
              <option key={c.k} value={i}>
                {c.k}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("matrix.board")}
          <select
            className={styles.select}
            aria-label={t("matrix.boardAria")}
            value={resp}
            onChange={(e) => setResp(Number(e.target.value))}
          >
            {B4_CAPS.map((c, i) => (
              <option key={c.k} value={i}>
                {c.k}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={scId}>
          <input id={scId} type="checkbox" checked={sc} onChange={(e) => setSc(e.target.checked)} />{" "}
          LE Secure Connections
        </label>
        <label htmlFor={mitmId}>
          <input
            id={mitmId}
            type="checkbox"
            checked={mitm}
            onChange={(e) => setMitm(e.target.checked)}
          />{" "}
          {t("matrix.mitm")}
        </label>
      </div>
      <div className={styles.scroll}>
        <svg
          viewBox="0 0 680 170"
          className={styles.full}
          direction="ltr"
          role="img"
          aria-label={t("matrix.aria")}
        >
          <Device x={30} label={t("matrix.initiator")} cap={B4_CAPS[init]?.k ?? ""} role={phoneRole} />
          <Device x={530} label={t("matrix.responder")} cap={B4_CAPS[resp]?.k ?? ""} role={boardRole} />
          <path
            ref={pathRef}
            d="M 160 85 C 260 40, 420 40, 520 85"
            className={own.link}
            style={{ stroke: COLOR[m] }}
          />
          <text
            x={340}
            y={112}
            textAnchor="middle"
            className={own.method}
            style={{ fill: COLOR[m] }}
          >
            {t(`matrix.methods.${m}`)}
          </text>
          <text x={340} y={132} textAnchor="middle" className={own.verdict}>
            {m === "J" ? t("matrix.unchecked") : t("matrix.checked")}
          </text>
        </svg>
      </div>
      <p className={styles.field} aria-live="polite">
        <b>{t("matrix.methodTitle", { method: t(`matrix.methods.${m}`) })}</b>{" "}
        {t(`matrix.why.${whyKey(m, mitm)}`)}
      </p>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("matrix.corner")}</th>
              {B4_CAPS.map((c) => (
                <th key={c.k}>{c.k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {B4_CAPS.map((c, a) => (
              <tr key={c.k}>
                <td className={styles.mono}>{c.k}</td>
                {B4_CAPS.map((d, b) => {
                  const mm = b4Method(a, b, sc, mitm);
                  const on = a === init && b === resp;
                  return (
                    <td
                      key={d.k}
                      className={own.cell}
                      aria-current={on || undefined}
                      style={{
                        background: `color-mix(in srgb, ${COLOR[mm]} ${on ? 45 : 14}%, transparent)`,
                        outline: on ? `2px solid ${COLOR[mm]}` : undefined,
                      }}
                    >
                      {t(`matrix.short.${mm}`)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Device({ x, label, cap, role }: { x: number; label: string; cap: string; role: Role }) {
  const { t } = useTranslation("labs-ble");
  return (
    <g>
      <rect x={x} y={30} width={120} height={110} rx={14} className={own.device} />
      <text x={x + 60} y={22} textAnchor="middle" className={own.label}>
        {label}
      </text>
      <text x={x + 60} y={158} textAnchor="middle" className={own.cap}>
        {cap}
      </text>
      <text x={x + 60} y={96} textAnchor="middle" className={own.role}>
        {t(`matrix.roles.${role.text}`)}
      </text>
      {role.code ? (
        <text x={x + 60} y={74} textAnchor="middle" className={own.code} style={{ fill: role.col }}>
          {role.code === "digits" ? t("matrix.sixDigits") : role.code}
        </text>
      ) : null}
    </g>
  );
}
