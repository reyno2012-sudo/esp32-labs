import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { hxs } from "../../protocol/hex";
import styles from "../panels.module.css";
import own from "./B3Table.module.css";
import { GATT_ROWS, handleLabel, type Op, OPS } from "./gatt-ops";

const OP_STROKE: Readonly<Record<Op, string>> = {
  notify: "var(--w-cs)",
  read: "var(--ok)",
  write: "var(--ble)",
  subscribe: "var(--ble)",
};

/** B3: the GATT table, operation by operation. */
export function B3Table(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  // `seq` counts sends, so sending the same operation again replays it.
  const [sent, setSent] = useState<{ i: number; op: Op; seq: number }>({
    i: 0,
    op: "write",
    seq: 0,
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const anim = useRef({ seq: -1, start: 0 });

  const row = GATT_ROWS[sent.i] ?? GATT_ROWS[0];
  const spec = OPS[sent.op];
  const value = row?.ops[sent.op] ?? [];
  const req = row ? spec.req(row, value) : [];
  const rsp = row && spec.rsp ? spec.rsp(row, value) : null;

  const send = (i: number, op: Op) => setSent((s) => ({ i, op, seq: s.seq + 1 }));

  // The packet crosses over (and the answer comes back).
  useFrameLoop(svgRef, ({ now }) => {
    const dot = dotRef.current;
    if (!dot) return;
    if (anim.current.seq !== sent.seq) anim.current = { seq: sent.seq, start: now };
    const legs = rsp ? 2 : 1;
    const k = Math.min((now - anim.current.start) / (reduce ? 1 : 900), legs);
    if (k >= legs) {
      dot.setAttribute("cx", "-20");
      return;
    }
    const leg = Math.floor(Math.min(k, legs - 0.0001));
    const f = k - leg;
    const outward = (spec.dir === "out") !== (leg === 1);
    const y = 55 + sent.i * 36;
    dot.setAttribute("cx", String(outward ? 255 - f * 140 : 115 + f * 140));
    dot.setAttribute("cy", String(120 + (y - 120) * (outward ? 1 - f : f)));
    dot.setAttribute("fill", leg === 1 ? "var(--ok)" : "var(--ble)");
  });

  const [ask, answer] =
    spec.dir === "out"
      ? [t("table.toPhone"), t("table.toBoard")]
      : [t("table.toBoard"), t("table.toPhone")];
  return (
    <div className={styles.wd}>
      <div className={styles.scroll}>
        <svg
          ref={svgRef}
          viewBox="0 0 680 230"
          className={styles.full}
          direction="ltr"
          role="img"
          aria-label={t("table.aria")}
        >
          <rect x={20} y={40} width={90} height={160} rx={14} className={own.phone} />
          <text x={65} y={125} textAnchor="middle" className={own.phoneLabel}>
            {t("table.phone")}
          </text>
          <text x={400} y={26} className={own.service}>
            {t("table.service")}
          </text>
          {GATT_ROWS.map((r, i) => {
            const y = 40 + i * 36;
            return (
              <g key={r.name}>
                <rect
                  x={260}
                  y={y}
                  width={400}
                  height={30}
                  rx={6}
                  className={own.row}
                  style={i === sent.i ? { stroke: OP_STROKE[sent.op] } : undefined}
                />
                <text x={272} y={y + 19} className={own.name}>
                  {r.name}
                </text>
                <text x={372} y={y + 19} className={own.meta}>
                  {handleLabel(r)}
                </text>
              </g>
            );
          })}
          <circle ref={dotRef} r={7} cx={-20} cy={-20} fill="var(--ble)" />
        </svg>
      </div>
      <ButtonRow aria-label={t("table.operations")}>
        {GATT_ROWS.flatMap((r, i) =>
          (Object.keys(r.ops) as Op[]).map((op) => (
            <Button key={`${op}-${r.name}`} onClick={() => send(i, op)}>
              {t(`table.ops.${op}.action`, { name: r.name })}
            </Button>
          )),
        )}
      </ButtonRow>
      {row ? (
        <p className={styles.field} aria-live="polite">
          <b>{t(`table.ops.${sent.op}.action`, { name: row.name })}</b>
          {t("table.what", { what: t(`table.ops.${sent.op}.what`) })}
          <br />
          <code>
            {ask} {hxs(req)}
          </code>
          {rsp ? (
            <>
              <br />
              <code>
                {answer} {hxs(rsp)}
              </code>
            </>
          ) : null}
          <br />
          {t("table.value", { value: row.show(value, t) })}
        </p>
      ) : null}
    </div>
  );
}
