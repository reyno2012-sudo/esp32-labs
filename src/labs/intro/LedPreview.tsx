import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { Button, ButtonRow } from "@/ui/Button";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { WidgetProps } from "@/widgets/types";
import styles from "./intro.module.css";
import { duty, handleCommand, helpLines, initialLed, type LedState } from "./led-firmware";

const QUICK = ["fade", "blink 200", "sos", "level 30", "on", "off", "help"] as const;

/** Lesson 02 preview: the breadboard LED driven by the same logic as the firmware. */
export function LedPreview(_: WidgetProps) {
  const { t } = useTranslation("labs-intro");
  const term = useTerminalLog();
  // Read by the frame loop and changed by commands; nothing renders from it, so a ref.
  const led = useRef<LedState | null>(null);
  const body = useRef<SVGPathElement>(null);
  const glow = useRef<SVGCircleElement>(null);
  const dutyText = useRef<SVGTextElement>(null);

  useEffect(() => {
    const state = initialLed(performance.now());
    led.current = state;
    term.line("[I][main.cpp:146] setup(): LED on GPIO 4 ready.", "info");
    term.line("[I][main.cpp:51] setMode(): mode -> fade", "info");
    helpLines(state).forEach(([text, tone]) => term.line(text, tone));
    return () => term.clear();
  }, [term]);

  function run(raw: string) {
    if (!raw.trim() || !led.current) return;
    term.line(raw.trim().toLowerCase(), "you");
    const next = handleCommand(led.current, raw, performance.now());
    led.current = next.state;
    next.lines.forEach(([text, tone]) => term.line(text, tone));
  }

  useFrameLoop(body, ({ now }) => {
    const state = led.current;
    if (!state) return;
    const d = duty(state, now - state.since);
    const k = d / 255;
    body.current?.setAttribute("opacity", (0.25 + 0.75 * k).toFixed(3));
    glow.current?.setAttribute("opacity", (0.45 * k).toFixed(3));
    if (dutyText.current) dutyText.current.textContent = t("led.duty", { duty: d });
  });

  return (
    <div className={styles.sim}>
      <div className={styles.breadboard} dir="ltr">
        <svg viewBox="0 0 520 170" role="img" aria-label={t("led.diagram")}>
          <rect
            x="6"
            y="6"
            width="508"
            height="158"
            rx="10"
            fill="var(--surface)"
            stroke="var(--line)"
          />
          <line
            x1="20"
            y1="24"
            x2="500"
            y2="24"
            stroke="var(--danger)"
            strokeWidth="2"
            opacity=".6"
          />
          <line
            x1="20"
            y1="148"
            x2="500"
            y2="148"
            stroke="var(--gnd)"
            strokeWidth="2"
            opacity=".8"
          />
          {Array.from({ length: 24 }, (_, c) =>
            Array.from({ length: 5 }, (_, r) => (
              <circle
                key={`${c}-${r}`}
                cx={30 + c * 20}
                cy={50 + r * 18}
                r="2.2"
                fill="var(--line)"
              />
            )),
          )}
          <text x="22" y="164" className={styles.label}>
            {t("led.gndRail")}
          </text>
          <path
            d="M30 50 V20 H6"
            fill="none"
            stroke="var(--copper)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <text x="38" y="40" className={`${styles.label} ${styles.strong}`}>
            GPIO 4
          </text>
          <path d="M30 86 H150" stroke="var(--muted)" strokeWidth="2" />
          <rect
            x="70"
            y="78"
            width="44"
            height="16"
            rx="6"
            fill="var(--copper-soft)"
            stroke="var(--copper)"
          />
          <rect x="80" y="78" width="4" height="16" fill="var(--danger)" />
          <rect x="88" y="78" width="4" height="16" fill="var(--danger)" />
          <rect x="96" y="78" width="4" height="16" fill="var(--gnd)" />
          <rect x="104" y="78" width="4" height="16" fill="var(--pad)" />
          <text x="70" y="112" className={styles.label}>
            220 Ω
          </text>
          <path d="M30 50 V86" stroke="var(--copper)" strokeWidth="3" />
          <path d="M150 86 V70 M190 86 V148" stroke="var(--muted)" strokeWidth="2" />
          <circle ref={glow} cx="170" cy="58" r="26" fill="var(--danger)" opacity="0" />
          <path
            ref={body}
            d="M156 70 V52 a14 14 0 0 1 28 0 V70 Z"
            fill="var(--danger)"
            opacity=".35"
            stroke="var(--danger)"
            strokeWidth="1.5"
          />
          <path
            d="M150 86 V70 H158 M190 86 V70 H182"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2"
          />
          <text x="200" y="62" className={styles.label}>
            {t("led.legs")}
          </text>
          <text ref={dutyText} x="200" y="80" className={styles.label} />
        </svg>
      </div>
      <Terminal log={term} title={t("led.terminal")} onCommand={run} />
      <ButtonRow aria-label={t("led.quick")}>
        {QUICK.map((c) => (
          <Button key={c} onClick={() => run(c)}>
            {c}
          </Button>
        ))}
      </ButtonRow>
    </div>
  );
}
