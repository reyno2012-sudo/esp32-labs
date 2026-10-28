import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import { RichText } from "@/ui/RichText";
import type { WidgetProps } from "@/widgets/types";
import { airTimeline, type LinkSettings, throughput } from "../../protocol/throughput";
import styles from "../panels.module.css";
import own from "./B5Throughput.module.css";

type Slider = "mtu" | "interval" | "cap";

// Labels: throughput.sliders.<key>.label / .aria.
const SLIDERS: readonly { key: Slider; min: number; max: number; step: number }[] = [
  { key: "mtu", min: 23, max: 247, step: 1 },
  { key: "interval", min: 7.5, max: 100, step: 1.25 },
  { key: "cap", min: 1, max: 20, step: 1 },
];

const W = 660;
const X0 = 10;
const UNLIT = "var(--line)";

/** B5: the throughput calculator, with three connection events drawn to scale. */
export function B5Throughput(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  const [s, setS] = useState<LinkSettings>({ mtu: 247, interval: 30, cap: 6, phy: 1, dle: true });
  const svgRef = useRef<SVGSVGElement>(null);
  const model = throughput(s);
  const packets = airTimeline(s, model);
  const shown = 3 * s.interval * 1000;
  const px = W / shown;
  const shownText = {
    mtu: t("throughput.mtuValue", { mtu: s.mtu, data: s.mtu - 3 }),
    interval: t("throughput.ms", { value: s.interval }),
    cap: t("throughput.count", { value: s.cap }),
  };

  // Packets light up as the sweep passes, once per 1.2 s: written straight onto the rects.
  useFrameLoop(
    svgRef,
    ({ now }) => {
      const phase = (now / 1200) % 1;
      svgRef.current?.querySelectorAll<SVGRectElement>("rect[data-lit]").forEach((r) => {
        const lit = Number(r.dataset.lit) / 1000 < phase * s.interval;
        r.setAttribute(
          "fill",
          lit ? (r.dataset.dir === "ack" ? "var(--ok)" : "var(--scope-violet)") : UNLIT,
        );
      });
    },
    !reduce,
  );

  return (
    <div className={styles.wd}>
      <div className={own.sliders}>
        {SLIDERS.map((x) => (
          <label key={x.key} className={own.slider}>
            <span>
              {t(`throughput.sliders.${x.key}.label`)} <b>{shownText[x.key]}</b>
            </span>
            <input
              type="range"
              min={x.min}
              max={x.max}
              step={x.step}
              value={s[x.key]}
              aria-label={t(`throughput.sliders.${x.key}.aria`)}
              onChange={(e) => setS((v) => ({ ...v, [x.key]: Number(e.target.value) }))}
            />
          </label>
        ))}
        <ButtonRow>
          <Button pressed={s.phy === 1} onClick={() => setS((v) => ({ ...v, phy: 1 }))}>
            1M PHY
          </Button>
          <Button pressed={s.phy === 2} onClick={() => setS((v) => ({ ...v, phy: 2 }))}>
            2M PHY
          </Button>
          <Button pressed={s.dle} onClick={() => setS((v) => ({ ...v, dle: !v.dle }))}>
            {s.dle ? t("throughput.longOn") : t("throughput.longOff")}
          </Button>
        </ButtonRow>
      </div>
      <div className={styles.scroll}>
        <svg
          ref={svgRef}
          viewBox="0 0 680 150"
          className={styles.full}
          direction="ltr"
          role="img"
          aria-label={t("throughput.aria")}
        >
          <line x1={X0} y1={92} x2={X0 + W} y2={92} className={own.axis} />
          {[0, 1, 2].map((e) => {
            const x = X0 + e * s.interval * 1000 * px;
            return (
              <g key={e}>
                <line x1={x} y1={30} x2={x} y2={110} className={own.event} />
                <text x={x + 4} y={126} className={own.eventLabel}>
                  {t("throughput.event", { n: e + 1, ms: e * s.interval })}
                </text>
              </g>
            );
          })}
          {packets.map((p, i) => (
            <rect
              key={i}
              x={X0 + p.at * px}
              y={p.dir === "data" ? 58 : 94}
              width={Math.max(p.us * px, 1)}
              height={p.dir === "data" ? 26 : 10}
              rx={p.dir === "data" ? 1 : 0}
              fill={UNLIT}
              data-lit={p.litAt - p.event}
              data-dir={p.dir}
            />
          ))}
          <text x={X0} y={22} className={own.title}>
            {t("throughput.data")}
          </text>
          <text x={X0 + W} y={22} textAnchor="end" className={own.titleMuted}>
            {t("throughput.acks")}
          </text>
          <text x={X0} y={146} className={own.note}>
            {t("throughput.shown", { ms: shown / 1000 })}
          </text>
        </svg>
      </div>
      <p className={styles.field} aria-live="polite">
        <RichText
          text={t("throughput.result", {
            kBps: model.kBps,
            count: model.perEvent,
            data: s.mtu - 3,
            interval: s.interval,
          })}
        />{" "}
        {t("throughput.frags", { count: model.frags, ms: model.notifUs / 1000 })}{" "}
        {t(`throughput.limit.${model.limit}`)}
        {model.perEvent === 0 ? (
          <>
            {" "}
            <RichText text={t("throughput.nothing")} />
          </>
        ) : null}
      </p>
    </div>
  );
}
