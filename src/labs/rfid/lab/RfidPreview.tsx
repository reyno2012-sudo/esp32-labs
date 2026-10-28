import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBoardRgb } from "@/features/board/board-signals";
import { useFrameLoop } from "@/lib/animation";
import { context2d, SCREEN_H, SCREEN_W, scopePalette } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import { ScreenFrame } from "@/ui/ScreenFrame";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { WidgetProps } from "@/widgets/types";
import { useSimulation } from "../../shared/simulation";
import { drawRfidScreen, RFID_VIEWS } from "../screen/rfid-screen";
import styles from "../screen/screen.module.css";
import { isLabId, type LabId, QUICK } from "./labs";
import { type FieldOn, initialLabState, RfidLab } from "./rfid-lab";
import { useTimers } from "./use-timers";

const LONG_PRESS_MS = 600;
const DOUBLE_CLICK_MS = 300;
const FIELD_BUTTONS: readonly FieldOn[] = ["card", "tag", "both", "none"];

/** R1-R6 preview: the rfid-lab screen, its push button, cards to lay down and the serial monitor. */
export function RfidPreview({ lesson }: WidgetProps) {
  const labId = isLabId(lesson.id) ? lesson.id : "R6";
  return <Lab key={labId} labId={labId} lessonId={lesson.id} view={lesson.preview?.view ?? 1} />;
}

function Lab({ labId, lessonId, view }: { labId: LabId; lessonId: string; view: number }) {
  const { t } = useTranslation("labs-rfid");
  const term = useTerminalLog();
  const after = useTimers();
  const [sim, snapshot] = useSimulation(() => initialLabState(view));
  const [lab] = useState(
    () =>
      new RfidLab(labId, sim.state, {
        print: term.line,
        now: () => performance.now(),
        after,
        changed: sim.notify,
      }),
  );
  const setRgb = useBoardRgb();
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const downAt = useRef(0);
  const clicks = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [down, setDown] = useState(false);

  useEffect(() => {
    lab.boot(lessonId);
    return () => {
      clearTimeout(clickTimer.current);
      term.clear();
    };
  }, [lab, lessonId, term]);

  useFrameLoop(canvasRef, ({ now }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawRfidScreen(context2d(canvas), scopePalette(), lab.screen(), now / 1000, reduce);
    const flashing = now < lab.state.flashUntil;
    setRgb(
      flashing || lab.selected() ? { color: "var(--ok)", scale: flashing ? 10 / 7 : 1 } : null,
    );
  });

  const act = (fn: () => void) => sim.update(fn);

  function release() {
    if (!down) return;
    setDown(false);
    if (performance.now() - downAt.current > LONG_PRESS_MS) {
      act(() => lab.run(`poll ${lab.state.polling ? "off" : "on"}`));
      return;
    }
    clicks.current++;
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      const double = clicks.current >= 2;
      clicks.current = 0;
      act(() => (double ? lab.doubleClick() : lab.nextView()));
    }, DOUBLE_CLICK_MS);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    act(() => lab.nextView());
  }

  const viewName = (v: number) => t(`views.${RFID_VIEWS[v] ?? "chip"}`);
  const st = snapshot.state;
  const spec = lab.spec;
  const pos = Math.max(0, spec.views.indexOf(st.view));
  return (
    <div className={styles.sim}>
      <div className={styles.bootRow}>
        <button
          type="button"
          className={`${styles.bootBtn} ${down ? styles.down : ""}`}
          aria-label={t("preview.button")}
          onPointerDown={() => {
            downAt.current = performance.now();
            setDown(true);
          }}
          onPointerUp={release}
          onPointerCancel={() => setDown(false)}
          onKeyDown={onKeyDown}
          // A click without a pointer (a screen reader's activation) is one press: next view.
          onClick={(e) => {
            if (e.detail === 0) act(() => lab.nextView());
          }}
        >
          BUTTON
        </button>
        <ChoiceGroup
          label={t("preview.views")}
          value={pos}
          onChange={(p) => act(() => lab.setView(p))}
          choices={spec.views.map((v, i) => ({
            key: i,
            label: (
              <span title={viewName(v)}>
                {i + 1}
                <span className={styles.vh}> {viewName(v)}</span>
              </span>
            ),
          }))}
        />
        <span
          className={styles.autoFlag}
        >
          {t(st.polling ? "preview.status" : "preview.statusPaused", { view: viewName(st.view) })}
        </span>
      </div>
      <ButtonRow aria-label={t("preview.cards")}>
        {FIELD_BUTTONS.map((on) => (
          <Button
            key={on}
            pressed={on === "none" ? undefined : st.on === on}
            onClick={() => act(() => lab.setField(on))}
          >
            {t(`preview.field.${on}`)}
          </Button>
        ))}
      </ButtonRow>
      <ScreenFrame>
        <canvas
          dir="ltr"
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          role="img"
          aria-label={t("preview.screen", { view: viewName(st.view) })}
        />
      </ScreenFrame>
      <Caption>
        {t("preview.example")}
      </Caption>
      <Terminal
        log={term}
        title="$ uv run pio device monitor"
        onCommand={(line) => act(() => lab.run(line))}
      />
      <ButtonRow aria-label={t("preview.quick")}>
        {QUICK[labId].map((c) => (
          <Button key={c} onClick={() => act(() => lab.run(c))}>
            {c}
          </Button>
        ))}
      </ButtonRow>
    </div>
  );
}
