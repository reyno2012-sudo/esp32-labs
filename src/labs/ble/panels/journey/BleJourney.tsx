import { type KeyboardEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import styles from "../panels.module.css";
import own from "./BleJourney.module.css";

type Flow = "in" | "out" | "both";

type StageId = "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8";

/** Each lab's place on the path; its title, role and sentence live in the catalogue. */
interface Stage {
  readonly id: StageId;
  readonly arrow: Flow;
  readonly lock?: boolean;
}

const STAGES: readonly Stage[] = [
  { id: "B1", arrow: "in" },
  { id: "B2", arrow: "out" },
  { id: "B3", arrow: "both" },
  { id: "B4", arrow: "both", lock: true },
  { id: "B5", arrow: "both" },
  { id: "B6", arrow: "out", lock: true },
  { id: "B7", arrow: "both" },
  { id: "B8", arrow: "in", lock: true },
];

const pos = (i: number) => ({ x: 50 + (i % 4) * 166, y: i < 4 ? 66 : 190 });

/** B1: the whole track at a glance, from listening to hosting. */
export function BleJourney({ lesson }: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const [pick, setPick] = useState(() =>
    Math.max(
      0,
      STAGES.findIndex((s) => s.id === lesson.id),
    ),
  );
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);

  // Each lab's dot runs along its card in the direction the data flows.
  useFrameLoop(
    svgRef,
    ({ now }) => {
      const k = (now / 1400) % 1;
      const odd = Math.floor(now / 1400) % 2 === 1;
      STAGES.forEach((s, i) => {
        const dot = dots.current[i];
        if (!dot) return;
        const { x } = pos(i);
        const back = s.arrow === "in" || (s.arrow === "both" && odd);
        dot.setAttribute("cx", String(x - 26 + (back ? 1 - k : k) * 126));
        dot.setAttribute("opacity", s.arrow === "both" ? (odd ? "1" : "0.6") : "1");
      });
    },
    !reduce,
  );

  const s = STAGES[pick] ?? STAGES[0];
  const choose = (i: number) => (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    setPick(i);
  };

  return (
    <div className={styles.wd}>
      <div className={styles.scroll}>
        <svg
          ref={svgRef}
          direction="ltr"
          viewBox="0 0 680 260"
          className={styles.full}
          role="group"
          aria-label={t("journey.aria")}
        >
          <path
            d="M 160 66 H 180 M 326 66 H 346 M 492 66 H 512 M 658 66 Q 672 66 672 128 Q 672 190 658 190 M 160 190 H 180 M 326 190 H 346 M 492 190 H 512"
            className={own.path}
          />
          {STAGES.map((st, i) => {
            const { x, y } = pos(i);
            return (
              <g
                key={st.id}
                tabIndex={0}
                role="button"
                aria-pressed={i === pick}
                aria-label={t("journey.stageLabel", {
                  id: st.id,
                  title: t(`journey.stages.${st.id}.title`),
                  what: t(`journey.stages.${st.id}.what`),
                })}
                className={own.stage}
                onClick={() => setPick(i)}
                onKeyDown={choose(i)}
              >
                <rect
                  x={x - 36}
                  y={y - 34}
                  width={146}
                  height={68}
                  rx={10}
                  className={own.card}
                  data-on={i === pick}
                />
                <text x={x - 26} y={y - 14} className={own.id}>
                  {st.id}
                </text>
                <text x={x + 2} y={y - 14} className={own.title}>
                  {t(`journey.stages.${st.id}.title`)}
                </text>
                <text x={x - 26} y={y + 4} className={own.role}>
                  {t(`journey.stages.${st.id}.role`)}
                </text>
                {st.lock ? (
                  <text x={x + 92} y={y + 4} className={own.role}>
                    🔒
                  </text>
                ) : null}
                <circle
                  ref={(el) => {
                    dots.current[i] = el;
                  }}
                  cx={x}
                  cy={y + 20}
                  r={4}
                  className={own.dot}
                />
              </g>
            );
          })}
        </svg>
      </div>
      {s ? (
        <Caption live>{t(`journey.stages.${s.id}.caption`)}</Caption>
      ) : null}
    </div>
  );
}
