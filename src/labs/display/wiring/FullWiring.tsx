import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { HoldButton } from "@/ui/board-button/BoardButton";
import { type Cubic, cubicAtFraction, cubicPath } from "./bezier";
import { Label, WireCaption } from "./parts";
import { cssVars, headerLabel, LEFT_HEADER, WIRES } from "./wiring-data";
import styles from "./wiring.module.css";

const EX = 600;
const eY = (i: number) => 50 + i * 22;
const DX = 252;
const dY = (i: number) => 76 + i * 32;
const BTN_PIN = 4; // GPIO 5 on the left header
const GND_PIN = 21;
const PULSE_MS = 500;

const SCREEN_WIRES = WIRES.map((w, i) => ({
  ...w,
  y1: dY(i),
  d: cubicPath({
    from: [DX, dY(i)],
    c1: [DX + 150, dY(i)],
    c2: [EX - 170, eY(w.idx)],
    to: [EX, eY(w.idx)],
  }),
}));
const SIGNAL: Cubic = {
  from: [144, 446],
  c1: [330, 430],
  c2: [EX - 200, eY(BTN_PIN) + 10],
  to: [EX, eY(BTN_PIN)],
};
const GROUND: Cubic = {
  from: [216, 518],
  c1: [300, 560],
  c2: [EX - 160, eY(GND_PIN) + 30],
  to: [EX, eY(GND_PIN)],
};
const LEGS = [
  [144, 446, "A"],
  [216, 446, "B"],
  [144, 518, "C"],
  [216, 518, "D"],
] as const;

type Mode = "both" | "screen" | "button";
// Labels and captions live in labs-display (full.modes.*, full.captions.*).
const MODES: readonly Mode[] = ["both", "screen", "button"];
const CAPTION_COLORS: Record<Mode, string> = {
  both: "--copper",
  screen: "--w-scl",
  button: "--w-btn",
};

function pinStyle(i: number) {
  if (i === BTN_PIN) return { fill: "var(--w-btn)", fontWeight: 700, fontSize: 10 };
  if (WIRES.some((w) => w.idx === i)) return { fill: "var(--silk)", fontSize: 10 };
  return undefined;
}

/** Lesson 03b variation 2: the screen (output) and the push button (input) on one header. */
export function FullWiring(_: WidgetProps) {
  const { t } = useTranslation("labs-display");
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("both");
  const [down, setDown] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const pulseStart = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<SVGCircleElement>(null);
  const showS = mode !== "button";
  const showB = mode !== "screen";

  // Press: the knob goes down, GPIO 5 drops LOW, and a pulse travels from the button to the pin.
  function pressDown() {
    setDown(true);
    if (mode === "screen") setMode("both");
    pulseStart.current = performance.now();
    setPulsing(true);
  }

  useFrameLoop(
    wrapRef,
    ({ now }) => {
      const dot = pulseRef.current;
      if (!dot) return;
      const k = Math.min(1, (now - pulseStart.current) / (reduce ? 1 : PULSE_MS));
      const [x, y] = cubicAtFraction(SIGNAL, k);
      dot.setAttribute("cx", String(x));
      dot.setAttribute("cy", String(y));
      dot.setAttribute("opacity", k < 1 ? "1" : "0");
      if (k >= 1) setPulsing(false);
    },
    pulsing,
  );

  const buttonWire = `${styles.wire} ${showB ? "" : styles.dim} ${down ? styles.active : ""}`;

  return (
    <div className={styles.wd}>
      <div className={styles.wdBar} role="group" aria-label={t("full.show")}>
        <span className={styles.show} aria-hidden="true">
          {t("full.show")}
        </span>
        {MODES.map((m) => (
          <Button key={m} pressed={mode === m} onClick={() => setMode(m)}>
            {t(`full.modes.${m}`)}
          </Button>
        ))}
        <HoldButton
          down={down}
          aria-label={t("press.aria")}
          onDown={pressDown}
          onUp={() => setDown(false)}
        >
          {t("press.label")}
        </HoldButton>
      </div>
      <div ref={wrapRef} className={`${styles.wdSvg} ${styles.signals}`} dir="ltr">
        <svg viewBox="0 0 760 600" role="img" aria-label={t("full.aria")}>
          {/* ESP32 left header */}
          <rect
            x={EX - 20}
            y="24"
            width="110"
            height="528"
            rx="10"
            fill="var(--pcb)"
            stroke="var(--pcb-edge)"
            strokeWidth="2"
          />
          <Label x={EX - 20} y={16} className={styles.title}>
            {t("wiring.leftHeader")}
          </Label>
          <Label x={EX + 35} y={568} className={styles.silk} anchor="middle">
            USB ↓
          </Label>
          {LEFT_HEADER.map((pin, i) => (
            <g key={i}>
              <circle cx={EX} cy={eY(i)} r="4" fill="var(--silk-dim)" opacity="0.6" />
              <Label x={EX + 14} y={eY(i) + 3.5} className={styles.silk} style={pinStyle(i)}>
                {headerLabel(pin)}
              </Label>
            </g>
          ))}

          {/* Display module (top-left) */}
          <rect
            x="30"
            y="40"
            width="220"
            height="290"
            rx="12"
            fill="var(--pcb)"
            stroke="var(--pcb-edge)"
            strokeWidth="2"
          />
          <rect x="50" y="58" width="136" height="254" rx="4" fill="var(--scope-paper)" />
          <Label x={118} y={182} className={styles.silk} anchor="middle">
            {t("full.screen")}
          </Label>
          <Label x={118} y={196} className={styles.silk} anchor="middle">
            {t("full.output")}
          </Label>
          <Label x={30} y={32} className={styles.title}>
            {t("full.display")}
          </Label>

          {/* Push button (bottom-left) */}
          <Label x={110} y={418} className={styles.title}>
            {t("full.button")}
          </Label>
          <rect
            x="130"
            y="432"
            width="100"
            height="100"
            rx="10"
            fill="var(--pcb)"
            stroke="var(--pcb-edge)"
            strokeWidth="2"
          />
          <circle
            cx="180"
            cy="482"
            r="24"
            fill={down ? "var(--w-btn)" : "var(--pcb-edge)"}
            stroke="var(--silk-dim)"
            strokeWidth="2"
          />
          {LEGS.map(([x, y, k]) => (
            <g key={k}>
              <circle cx={x} cy={y} r="4" fill="var(--silk-dim)" />
              <Label
                x={x + (x < 180 ? -10 : 10)}
                y={y + 4}
                className={styles.silk}
                anchor={x < 180 ? "end" : "start"}
              >
                {k}
              </Label>
            </g>
          ))}

          {/* Screen wires: data flows out of the ESP32 */}
          {SCREEN_WIRES.map((w) => (
            <g key={w.disp}>
              <path
                d={w.d}
                className={`${styles.wire} ${showS ? "" : styles.dim}`}
                stroke={`var(${w.color})`}
              />
              {w.speed && showS && !reduce ? (
                <path
                  d={w.d}
                  className={`${styles.flow} ${styles.flowOut}`}
                  style={cssVars({ "--speed": `${w.speed}s` })}
                />
              ) : null}
              <circle
                cx={DX}
                cy={w.y1}
                r="5"
                fill={`var(${w.color})`}
                stroke="var(--pcb)"
                strokeWidth="2"
              />
              <Label
                x={DX - 10}
                y={w.y1 + 4}
                className={styles.silk}
                anchor="end"
                style={{ fill: "var(--silk)", fontSize: 11 }}
              >
                {w.disp}
              </Label>
            </g>
          ))}
          {/* Button wires: GPIO 5 and GND */}
          <path d={cubicPath(SIGNAL)} className={buttonWire} stroke="var(--w-btn)" />
          <path d={cubicPath(GROUND)} className={buttonWire} stroke="var(--w-gnd)" />
          <circle ref={pulseRef} r="6" fill="var(--w-btn)" opacity="0" />
          {WIRES.map((w) => (
            <circle
              key={w.disp}
              cx={EX}
              cy={eY(w.idx)}
              r="5.5"
              fill={`var(${w.color})`}
              stroke="var(--pcb)"
              strokeWidth="2"
            />
          ))}
          <circle
            cx={EX}
            cy={eY(BTN_PIN)}
            r="5.5"
            fill="var(--w-btn)"
            stroke="var(--pcb)"
            strokeWidth="2"
          />

          {/* Direction labels */}
          <Label
            x={400}
            y={40}
            className={`${styles.lbl} ${styles.on}`}
            anchor="middle"
            style={{ opacity: showS ? 1 : 0.25 }}
          >
            {t("full.out")}
          </Label>
          <Label
            x={130}
            y={586}
            className={`${styles.lbl} ${styles.on}`}
            style={{ opacity: showB ? 1 : 0.25 }}
          >
            {t("full.in")}
          </Label>
          <Label x={EX - 12} y={eY(GND_PIN) + 46} anchor="end">
            {t("full.gnd")}
          </Label>
          <Label
            x={EX - 40}
            y={eY(BTN_PIN) - 14}
            className={`${styles.lbl} ${styles.on}`}
            anchor="end"
          >
            {down ? t("full.pinLow") : t("full.pinHigh")}
          </Label>
        </svg>
      </div>
      <WireCaption color={CAPTION_COLORS[mode]} title={t(`full.captions.${mode}.title`)}>
        {t(`full.captions.${mode}.text`)}
      </WireCaption>
    </div>
  );
}
