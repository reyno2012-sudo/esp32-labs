/* eslint-disable i18next/no-literal-string -- literal text here is the page the firmware serves, shown as the phone sees it, not interface text. */
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBoardRgb } from "@/features/board/board-signals";
import { useFrameLoop } from "@/lib/animation";
import { context2d, SCREEN_H, SCREEN_W, scopePalette } from "@/lib/canvas";
import { Button } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import { ScreenFrame } from "@/ui/ScreenFrame";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { WidgetProps } from "@/widgets/types";
import { drawPhoneScreen, ledBody, MAX_MESSAGE, MESSAGE_VIEW, PHONE_VIEWS } from "./phone-screen";
import styles from "./wifi.module.css";

// The colour picker's starting value (a colour as data: what the page sends, not a theme colour).
const LED_START = "#00a078";
const MONITOR = "$ uv run pio device monitor";

/** W2 preview: the phone page at bench.local driving the board's screen and RGB LED. */
export function PhonePreview(_: WidgetProps) {
  const term = useTerminalLog();
  const setRgb = useBoardRgb();
  const [view, setView] = useState(MESSAGE_VIEW);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState("Hello from my phone");
  const [backlight, setBacklight] = useState(255);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const viewsId = useId();
  const { t } = useTranslation("labs-wifi");

  useEffect(() => {
    term.line(
      "[I][web_api.h:134] begin(): Web server on port 80: phone page at /, API at /api, live updates at /ws",
      "info",
    );
    term.line(
      "[I][connection.h:101] loop(): Reachable as bench.local (try: ping bench.local, or open http://bench.local)",
      "info",
    );
    return () => term.clear();
  }, [term]);

  useFrameLoop(canvasRef, () => {
    const canvas = canvasRef.current;
    if (canvas) drawPhoneScreen(context2d(canvas), scopePalette(), { view, message, backlight });
  });

  // The page sends a request when a slider or picker is let go (the DOM `change` event), not on
  // every step of the drag; React's onChange fires on every step, so these listen natively.
  const onBacklight = useEffectEvent((e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const bl = Number(e.target.value);
    setBacklight(bl);
    term.line(`PUT /api/settings {"backlight":${bl}}`, "you");
    term.line(`[I][main.cpp:221] applyCommand(): backlight ${bl}`, "info");
  });
  const onLedCommit = useEffectEvent((e: Event) => {
    if (e.target instanceof HTMLInputElement)
      term.line(`PUT /api/led ${ledBody(e.target.value)}`, "you");
  });
  useEffect(() => {
    const range = rangeRef.current;
    const color = colorRef.current;
    const bl = (e: Event) => onBacklight(e);
    const led = (e: Event) => onLedCommit(e);
    range?.addEventListener("change", bl);
    color?.addEventListener("change", led);
    return () => {
      range?.removeEventListener("change", bl);
      color?.removeEventListener("change", led);
    };
  }, []);

  function pickView(i: number) {
    setView(i);
    term.line(`PUT /api/view {"view":"${PHONE_VIEWS[i]}"}`, "you");
    term.line(`[I][main.cpp:198] setView(): view ${i + 1}: ${PHONE_VIEWS[i]}`, "info");
  }

  function send() {
    const text = draft.slice(0, MAX_MESSAGE);
    setMessage(text);
    setView(MESSAGE_VIEW);
    term.line(`PUT /api/message {"text":"${text}"}`, "you");
    term.line(
      `[I][main.cpp:226] applyCommand(): message from the web (${text.length} characters)`,
      "info",
    );
  }

  return (
    <div className={styles.sim}>
      <div className={styles.phoneSim}>
        {/* The page the firmware serves, so it stays as the board writes it (English, LTR). */}
        <div className={styles.phone} role="group" aria-label={t("phone.page")} dir="ltr" lang="en">
          <div className={styles.phoneBar}>bench.local</div>
          <label className={styles.field}>
            Message
            <input
              type="text"
              maxLength={MAX_MESSAGE}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <Button onClick={send}>Show on screen</Button>
          <div className={styles.field}>
            <span id={viewsId}>View</span>
            <div className={styles.views} role="group" aria-labelledby={viewsId}>
              {PHONE_VIEWS.map((v, i) => (
                <button key={v} type="button" aria-pressed={i === view} onClick={() => pickView(i)}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.field}>
            Brightness
            <input ref={rangeRef} type="range" min={20} max={255} defaultValue={255} />
          </label>
          <label className={styles.field}>
            LED colour
            <input
              ref={colorRef}
              type="color"
              defaultValue={LED_START}
              onChange={(e) => setRgb({ color: e.target.value, glow: true })}
            />
          </label>
        </div>
        <div className={styles.screenCol}>
          <ScreenFrame>
            <canvas
              ref={canvasRef}
              width={SCREEN_W}
              height={SCREEN_H}
              role="img"
              aria-label={t("phone.screen")}
              dir="ltr"
            />
          </ScreenFrame>
          <Caption>
            {t("phone.caption")}
          </Caption>
        </div>
      </div>
      <Terminal log={term} title={t("terminal.expected", { command: MONITOR })} />
    </div>
  );
}
