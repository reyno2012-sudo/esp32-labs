import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleInfo } from "@/i18n/use-locale";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button } from "../Button";
import { ChoiceGroup } from "../ChoiceGroup";
import styles from "./SequenceDiagram.module.css";
import type { LegendItem, SeqFlows } from "./types";

interface SequenceDiagramProps {
  flows: SeqFlows;
  legend: readonly LegendItem[];
  /** Lane 0 is a loop that keeps drawing frames: its subtitle counts them. */
  frames?: boolean;
  /** Whose lifeline shows the wait bar (default 1). */
  waitLane?: number;
  /** Payload text for `live` steps, redrawn every other frame. */
  live?: (frame: number, seconds: string) => string;
}

const W = 680;
const TOP = 64;
const GAP = 40;
const HOLD_MS = 1600;

// Units stay as on a datasheet (ms, s); the number follows the reader's language.
const formatMs = (ms: number, tag: string) =>
  ms >= 1000
    ? `${new Intl.NumberFormat(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ms / 1000)} s`
    : `${new Intl.NumberFormat(tag).format(ms)} ms`;

/**
 * A steppable, animated sequence diagram: lanes, numbered messages, one explained step at a
 * time. Plays on its own (unless reduced motion is on); Back/Next take over.
 */
export function SequenceDiagram({
  flows,
  legend,
  frames = false,
  waitLane = 1,
  live,
}: SequenceDiagramProps) {
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const { tag } = useLocaleInfo();
  const keys = Object.keys(flows);
  const [flowKey, setFlowKey] = useState(keys[0] ?? "");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const arrowId = useId();

  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const frameLabelRef = useRef<SVGTextElement>(null);
  const liveRef = useRef<HTMLPreElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const stepStart = useRef(0);
  const frameCount = useRef(0);

  const flow = flows[flowKey] ?? flows[keys[0] ?? ""];
  if (!flow || flow.steps.length === 0)
    throw new Error("SequenceDiagram needs at least one flow with steps");
  const n = flow.lanes.length;
  const H = TOP + flow.steps.length * GAP + 24;
  const laneX = (i: number) => 60 + i * ((W - 120) / Math.max(1, n - 1));
  const current = flow.steps[step] ?? flow.steps[0]!;
  const [w0, w1] = flow.wait ?? [-1, -1];
  const waiting = step >= w0 && step <= w1;
  const isLive = Boolean(current.live && live);

  const count = flow.steps.length;
  function go(next: number) {
    setStep(((next % count) + count) % count);
    stepStart.current = performance.now();
  }

  function pickFlow(key: string) {
    setFlowKey(key);
    setStep(0);
    stepStart.current = performance.now();
  }

  // Narrow screens scroll the diagram sideways: keep the current message in view.
  useEffect(() => {
    const sc = scrollRef.current;
    const svg = svgRef.current;
    if (!sc || !svg || sc.scrollWidth <= sc.clientWidth) return;
    const mid = ((laneX(current.f) + laneX(current.t)) / 2) * (svg.clientWidth / W);
    sc.scrollTo({ left: mid - sc.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
    // laneX only depends on the lane count, which `flowKey` covers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, flowKey, reduce]);

  // The travelling dot, the frame counter and live payloads change every frame: they are
  // written straight to DOM nodes React renders empty, so no re-render per frame.
  useFrameLoop(svgRef, ({ now }) => {
    frameCount.current++;
    const frame = Math.floor(frameCount.current / 2);
    if (frames && frameCount.current % 2 === 0 && frameLabelRef.current)
      frameLabelRef.current.textContent = t("ui.sequence.frame", { frame });
    if (isLive && live && frameCount.current % 2 === 0 && liveRef.current) {
      liveRef.current.textContent = live(frame, ((now - stepStart.current) / 1000).toFixed(1));
    }
    const path = pathRefs.current[step];
    const dot = dotRef.current;
    const duration = Math.min(2200, Math.max(900, current.ms ?? 0));
    if (path && dot) {
      const k = reduce ? 1 : Math.min(1, (now - stepStart.current) / duration);
      const pt = path.getPointAtLength(path.getTotalLength() * k);
      dot.setAttribute("cx", String(pt.x));
      dot.setAttribute("cy", String(pt.y));
    }
    if (playing && now - stepStart.current > duration + HOLD_MS) go(step + 1);
  });

  const lanesLabel = new Intl.ListFormat(tag, { type: "unit" }).format(
    flow.lanes.map(([name]) => name),
  );
  const from = flow.lanes[current.f]?.[0] ?? "";
  const to = flow.lanes[current.t]?.[0] ?? "";
  const position = { step: step + 1, total: flow.steps.length, from, to };

  return (
    <div className={styles.root}>
      <div className={styles.top}>
        {keys.length > 1 ? (
          <ChoiceGroup
            label={t("ui.sequence.flow")}
            value={flowKey}
            onChange={pickFlow}
            choices={keys.map((k) => ({ key: k, label: flows[k]!.label }))}
          />
        ) : (
          <span />
        )}
        <div className={styles.controls} role="group" aria-label={t("ui.sequence.playback")}>
          <Button
            onClick={() => {
              setPlaying(false);
              go(step - 1);
            }}
          >
            {t("ui.sequence.back")}
          </Button>
          <Button
            onClick={() => {
              setPlaying((p) => !p);
              stepStart.current = performance.now();
            }}
          >
            {playing ? t("ui.sequence.pause") : t("ui.sequence.play")}
          </Button>
          <Button
            onClick={() => {
              setPlaying(false);
              go(step + 1);
            }}
          >
            {t("ui.sequence.next")}
          </Button>
        </div>
      </div>

      {/* The lanes are drawn left to right in every language, so the scroller (and its scrollLeft
          math) stays left to right too. */}
      <div ref={scrollRef} className={styles.scroll} dir="ltr">
        <svg
          ref={svgRef}
          className={styles.seq}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t("ui.sequence.label", { lanes: lanesLabel, count: flow.steps.length })}
        >
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" className={styles.head} />
            </marker>
          </defs>
          {flow.lanes.map(([name, sub], i) => {
            const x = laneX(i);
            const loop = i === 0 && frames;
            return (
              <g key={name}>
                <line x1={x} y1={46} x2={x} y2={H - 8} className={styles.life} />
                <rect
                  x={x - 62}
                  y={4}
                  width={124}
                  height={40}
                  rx={8}
                  className={`${styles.lane} ${loop ? styles.laneLoop : ""}`}
                />
                <text x={x} y={21} className={styles.name} textAnchor="middle">
                  {name}
                </text>
                {loop ? (
                  <text
                    ref={frameLabelRef}
                    x={x}
                    y={36}
                    className={styles.sub}
                    textAnchor="middle"
                  />
                ) : (
                  <text x={x} y={36} className={styles.sub} textAnchor="middle">
                    {sub}
                  </text>
                )}
              </g>
            );
          })}
          {flow.steps.map((st, i) => {
            const y = TOP + i * GAP;
            const x1 = laneX(st.f);
            const x2 = laneX(st.t);
            const state = i < step ? "done" : i === step ? "now" : "next";
            const self = isSelfCall(st);
            const left = st.f === n - 1;
            const dir = left ? -1 : 1;
            return (
              <g key={`${flowKey}-${i}`} className={styles.row} data-state={state}>
                {self ? (
                  <>
                    <path
                      ref={(el) => {
                        pathRefs.current[i] = el;
                      }}
                      d={`M${x1} ${y - 8} h ${28 * dir} v 16 h ${-28 * dir}`}
                      className={styles.msg}
                      markerEnd={`url(#${arrowId})`}
                    />
                    <text
                      x={x1 + 34 * dir}
                      y={y + 4}
                      className={styles.label}
                      textAnchor={left ? "end" : "start"}
                    >
                      {st.msg}
                    </text>
                  </>
                ) : (
                  <>
                    <path
                      ref={(el) => {
                        pathRefs.current[i] = el;
                      }}
                      d={`M${x1} ${y} H${x2 + (x2 > x1 ? -4 : 4)}`}
                      className={`${styles.msg} ${st.net ? styles.net : ""}`}
                      markerEnd={`url(#${arrowId})`}
                    />
                    <text x={(x1 + x2) / 2} y={y - 6} className={styles.label} textAnchor="middle">
                      {st.msg}
                    </text>
                  </>
                )}
                <text x={14} y={y + 4} className={styles.num}>
                  {i + 1}
                </text>
              </g>
            );
          })}
          {waiting ? (
            <rect
              x={laneX(waitLane) - 4}
              y={TOP + w0 * GAP - 6}
              width={8}
              height={(step - w0) * GAP + 12}
              rx={3}
              className={styles.wait}
            />
          ) : null}
          <circle ref={dotRef} r={5} className={styles.dot} />
        </svg>
      </div>

      <p className={styles.legend}>
        {legend.map((item) => (
          <span key={item.label} className={styles.legendItem}>
            <span className={`${styles.swatch} ${LEGEND_CLASS[item.kind]}`} /> {item.label}
          </span>
        ))}
      </p>

      <div className={styles.caption} aria-live="polite">
        <p className={styles.stepLine}>
          {current.ms
            ? t(isSelfCall(current) ? "ui.sequence.step.selfTimed" : "ui.sequence.step.callTimed", {
                ...position,
                duration: formatMs(current.ms, tag),
              })
            : t(isSelfCall(current) ? "ui.sequence.step.self" : "ui.sequence.step.call", position)}
        </p>
        <h4>{current.title}</h4>
        <p className={styles.text}>{current.text}</p>
        {isLive ? (
          <pre ref={liveRef} className={styles.code} />
        ) : current.code ? (
          <pre className={styles.code}>{current.code}</pre>
        ) : null}
      </div>
    </div>
  );
}

const isSelfCall = (st: { f: number; t: number }) => st.f === st.t;

const LEGEND_CLASS = { msg: styles.lgMsg, wait: styles.lgWait, loop: styles.lgLoop } as const;
