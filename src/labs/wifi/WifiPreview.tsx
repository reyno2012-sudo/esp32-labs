import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { context2d, SCREEN_H, SCREEN_W, scopePalette } from "@/lib/canvas";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import { ScreenFrame } from "@/ui/ScreenFrame";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { WidgetProps } from "@/widgets/types";
import { useSimulation } from "../shared/simulation";
import { type LogLine, printLog } from "./log";
import { PushButton, type Press } from "@/ui/board-button/BoardButton";
import { drawScanner } from "./scanner-draw";
import {
  bootScanner,
  initScanner,
  joinFirst,
  SCANNER_VIEWS,
  setAuto,
  setView,
  startScan,
  stepScanner,
} from "./scanner-model";
import styles from "./wifi.module.css";

const MONITOR = "$ uv run pio device monitor";
const JOIN = "join 1";

/** W1 preview: the scanner's views, the push button, a join and the serial monitor (example networks). */
export function WifiPreview(_: WidgetProps) {
  const term = useTerminalLog();
  const [sim, snapshot] = useSimulation(() => initScanner());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const { t } = useTranslation("labs-wifi");
  // The firmware names its views in English; the picker names them in the reader's language.
  const viewChoices = SCANNER_VIEWS.map((v, i) => ({
    key: i,
    label: t("preview.viewChoice", { n: i + 1, view: t(`views.${v}`) }),
  }));

  const print = (lines: readonly LogLine[]) => printLog(term, lines);

  useEffect(() => {
    printLog(term, bootScanner(sim.state, performance.now()));
    return () => term.clear();
  }, [sim, term]);

  useFrameLoop(canvasRef, ({ now }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    print(stepScanner(sim.state, now, Math.random));
    drawScanner(context2d(canvas), scopePalette(), sim.state, now, reduce);
  });

  function onPress(press: Press) {
    const now = performance.now();
    sim.update((st) => {
      if (press === "hold") print(setAuto(st, !st.auto));
      else if (press === "double") print(startScan(st, "button", now));
      else print(setView(st, st.view + 1, now));
    });
  }

  const { state } = snapshot;

  return (
    <div className={styles.sim}>
      <ScreenFrame>
        <canvas
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          role="img"
          aria-label={t("preview.scannerScreen")}
          dir="ltr"
        />
      </ScreenFrame>
      <div className={styles.bootRow}>
        <PushButton
          label="BUTTON"
          aria-label={t("preview.scannerButton")}
          doubleMs={280}
          holdMs={600}
          onPress={onPress}
        />
        <ChoiceGroup
          label={t("preview.views")}
          choices={viewChoices}
          value={state.view}
          onChange={(i) =>
            sim.update((st) => print(setView(st, i, performance.now(), `view ${i + 1}`)))
          }
        />
        <Button onClick={() => sim.update((st) => print(joinFirst(st, performance.now())))}>
          {t("preview.join", { command: JOIN })}
        </Button>
        <span className={styles.autoFlag}>{t(state.auto ? "preview.autoOn" : "preview.autoOff")}</span>
      </div>
      <Caption>
        {t("preview.scannerCaption", { join: t("preview.join", { command: JOIN }) })}
      </Caption>
      <Terminal
        log={term}
        title={t("terminal.expectedNetworks", { command: MONITOR })}
      />
    </div>
  );
}
