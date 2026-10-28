import type { TFunction } from "i18next";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleInfo } from "@/i18n/use-locale";
import { useFrameLoop } from "@/lib/animation";
import { context2d } from "@/lib/canvas";
import type { WidgetProps } from "@/widgets/types";
import { HoldButton } from "@/ui/board-button/BoardButton";
import { Label, ScopeCaption, WireCaption } from "../wiring/parts";
import type { CaptionLine } from "../wiring/spi-analyzer";
import wd from "../wiring/wiring.module.css";
import { type BounceLabels, bouncePalette, drawBounceScope } from "./bounce-scope";
import { ButtonSignal, DEBOUNCE_MS, type Gesture } from "./button-signal";

// Panel 1: the button seen from above, legs A–D.
const LEGS = { A: [92, 58], B: [168, 58], C: [92, 222], D: [168, 222] } as const;
// Panel 2: on the breadboard, legs on columns 13 and 16, rows 4 (top) and 1 (bottom).
const AX = 290 + 13 * 21;
const BX = 290 + 16 * 21;
const AY = 58 + 4 * 18;
const CY = 176;
const HOLES = Array.from({ length: 20 }, (_, c) =>
  Array.from({ length: 5 }, (_, r) => [290 + c * 21, r * 18] as const),
).flat();

function gestureText(gesture: Gesture, t: TFunction<"labs-display">): string {
  switch (gesture.kind) {
    case "click":
      return t("button.gestures.click", { count: gesture.bounces });
    case "double":
      return t("button.gestures.double");
    case "long":
      return t("button.gestures.long");
  }
}

function scopeLines(lastEvent: Gesture | null, t: TFunction<"labs-display">): readonly CaptionLine[] {
  if (!lastEvent) {
    return [
      [t("button.scope.press"), ` ${t("button.scope.traces")}`],
      [t("button.scope.try"), ""],
    ];
  }
  return [
    [t("button.scope.gesture"), ` ${gestureText(lastEvent, t)}`],
    [t("button.scope.debounce", { ms: DEBOUNCE_MS }), ""],
  ];
}

/** Lesson 03b variation 2: inside the push button, how it sits on the breadboard, and its bouncy signal. */
export function ButtonWiring(_: WidgetProps) {
  const { t } = useTranslation("labs-display");
  const { dir } = useLocaleInfo();
  const labels: BounceLabels = {
    raw: t("button.canvas.raw"),
    debounced: t("button.canvas.debounced"),
    window: t("button.canvas.window"),
    zoom: t("button.canvas.zoom"),
    spike: t("button.canvas.spike"),
    capture: t("button.canvas.capture"),
    dir,
  };
  const [signal] = useState(() => new ButtonSignal());
  const [down, setDown] = useState(false);
  const [low, setLow] = useState(false);
  const [lastEvent, setLastEvent] = useState<Gesture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function pressDown() {
    setDown(true);
    signal.press(performance.now());
  }
  function pressUp() {
    setDown(false);
    signal.release(performance.now());
  }

  useFrameLoop(canvasRef, () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // performance.now(), not the frame time: edges are stamped with it.
    const now = performance.now();
    setLow(signal.step(now));
    setLastEvent(signal.lastEvent);
    drawBounceScope(context2d(canvas), bouncePalette(), signal, now, labels);
  });

  const knob = low ? "var(--copper)" : "var(--pcb-edge)";
  const strip = low ? "var(--w-dc)" : "var(--pad)";
  const wireWidth = low ? 6 : 4;

  return (
    <div className={wd.wd}>
      <div className={wd.wdSvg} dir="ltr">
        <svg viewBox="0 0 720 300" role="img" aria-label={t("button.aria")}>
          {/* Panel 1: inside the button */}
          <Label x={20} y={22} className={wd.title}>
            {t("button.inside")}
          </Label>
          {Object.entries(LEGS).map(([k, [x, y]]) => (
            <g key={k}>
              <rect
                x={x - 5}
                y={y - (y < 100 ? 12 : -2)}
                width="10"
                height="22"
                rx="2"
                fill="var(--silk-dim)"
              />
              <Label
                x={x}
                y={y < 100 ? y - 18 : y + 38}
                className={`${wd.lbl} ${wd.on}`}
                anchor="middle"
              >
                {k}
              </Label>
            </g>
          ))}
          <rect
            x="66"
            y="68"
            width="128"
            height="144"
            rx="10"
            fill="var(--pcb)"
            stroke="var(--pcb-edge)"
            strokeWidth="2"
          />
          <path d="M92 64 V216" stroke={strip} strokeWidth="6" strokeLinecap="round" />
          <path d="M168 64 V216" stroke={strip} strokeWidth="6" strokeLinecap="round" />
          <path
            d="M92 140 H168"
            stroke="var(--w-dc)"
            strokeWidth="7"
            strokeLinecap="round"
            opacity={low ? 1 : 0}
          />
          <circle cx="130" cy="140" r="26" fill={knob} stroke="var(--silk-dim)" strokeWidth="2" />
          <Label x={20} y={262}>
            {t("button.joined")}
          </Label>
          <Label x={20} y={280}>
            {t("button.pressing")}
          </Label>

          {/* Panel 2: on the breadboard */}
          <Label x={270} y={22} className={wd.title}>
            {t("button.breadboard")}
          </Label>
          <rect
            x="270"
            y="36"
            width="430"
            height="236"
            rx="10"
            fill="var(--surface)"
            stroke="var(--line)"
          />
          <rect x="270" y="148" width="430" height="12" fill="var(--bg)" />
          {HOLES.map(([x, dy]) => (
            <g key={`${x}-${dy}`}>
              <circle cx={x} cy={58 + dy} r="2.2" fill="var(--line)" />
              <circle cx={x} cy={176 + dy} r="2.2" fill="var(--line)" />
            </g>
          ))}
          <Label x={690} y={156} anchor="end">
            {t("button.gap")}
          </Label>
          <path
            d={`M${AX} ${AY} V44 H300`}
            fill="none"
            stroke="var(--w-dc)"
            strokeWidth={wireWidth}
            strokeLinecap="round"
          />
          <path
            d={`M${BX} ${CY} V264 H300`}
            fill="none"
            stroke="var(--w-gnd)"
            strokeWidth={wireWidth}
            strokeLinecap="round"
          />
          <rect
            x={AX - 10}
            y={AY - 10}
            width={BX - AX + 20}
            height={CY - AY + 20}
            rx="8"
            fill="var(--pcb)"
            stroke="var(--pcb-edge)"
            strokeWidth="2"
          />
          <circle
            cx={(AX + BX) / 2}
            cy={(AY + CY) / 2}
            r="18"
            fill={knob}
            stroke="var(--silk-dim)"
            strokeWidth="2"
          />
          {(
            [
              [AX, AY, "A"],
              [BX, AY, "B"],
              [AX, CY, "C"],
              [BX, CY, "D"],
            ] as const
          ).map(([x, y, k]) => (
            <g key={k}>
              <circle cx={x} cy={y} r="4" fill="var(--silk-dim)" />
              <Label
                x={x + (x === AX ? -8 : 8)}
                y={y + 4}
                className={wd.silk}
                anchor={x === AX ? "end" : "start"}
              >
                {k}
              </Label>
            </g>
          ))}
          <rect x="276" y="34" width="112" height="20" rx="4" fill="var(--w-dc)" />
          <Label x={332} y={48} className={wd.role} anchor="middle">
            {t("button.toPin")}
          </Label>
          <rect x="276" y="254" width="112" height="20" rx="4" fill="var(--gnd)" />
          <Label x={332} y={268} className={wd.role} anchor="middle">
            {t("button.toGnd")}
          </Label>
          <Label x={AX - 22} y={AY - 30} className={`${wd.lbl} ${wd.on}`} anchor="end">
            {t("button.diagonal")}
          </Label>
          <Label x={AX - 22} y={AY - 14} anchor="end">
            {t("button.orientation1")}
          </Label>
          <Label x={AX - 22} y={AY + 2} anchor="end">
            {t("button.orientation2")}
          </Label>
        </svg>
      </div>
      <div className={wd.wdBar}>
        <HoldButton
          down={down}
          aria-label={t("press.aria")}
          onDown={pressDown}
          onUp={pressUp}
        >
          {t("press.label")}
        </HoldButton>
        <span className={wd.wdCount}>
          {low ? t("button.readsLow") : t("button.readsHigh")}
        </span>
      </div>
      {low ? (
        <WireCaption color="--w-dc" title={t("button.pressed.title")}>
          {t("button.pressed.text")}
        </WireCaption>
      ) : (
        <WireCaption color="--line" title={t("button.released.title")}>
          {t("button.released.text")}
        </WireCaption>
      )}
      <div className={wd.la}>
        <canvas
          ref={canvasRef}
          width="680"
          height="190"
          role="img"
          aria-label={t("button.scopeAria")}
          dir="ltr"
        />
        <ScopeCaption lines={scopeLines(lastEvent, t)} live />
      </div>
    </div>
  );
}
