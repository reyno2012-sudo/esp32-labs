import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBoardRgb } from "@/features/board/board-signals";
import { useFrameLoop } from "@/lib/animation";
import { context2d, SCREEN_H, SCREEN_W, scopePalette } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import { ScreenFrame } from "@/ui/ScreenFrame";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { WidgetProps } from "@/widgets/types";
import { useSimulation } from "../../shared/simulation";
import { useTimers } from "../lab/use-timers";
import {
  DOOR_VIEWS,
  type DoorKey,
  drawDoorScreen,
  initialDoor,
  ledColor,
  stepDoor,
  tap,
} from "./door-sim";
import styles from "./door.module.css";

const TAPS: readonly DoorKey[] = ["white", "tag", "stranger"];
const COPY_MS = 4000;
const clock = () => new Date().toTimeString().slice(0, 5);

/** R7 preview: the door screen, taps, the app's actions and the serial monitor (example data). */
export function DoorPreview(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const term = useTerminalLog();
  const after = useTimers();
  const [sim, snapshot] = useSimulation(initialDoor);
  const setRgb = useBoardRgb();
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    term.line(
      "[I][main.cpp] setup(): rfid-lab-r7: reader task on core 0. Type token for the app's .env, help for commands.",
      "info",
    );
    term.line("[I][registry.h] begin(): card list: 2 cards, lockdown off");
    term.line(
      "[I][main.cpp] loop(): App: http://bench.local or http://192.168.178.57  (set BENCH_URL in door-app/.env)",
    );
    return () => term.clear();
  }, [term]);

  useFrameLoop(canvasRef, ({ now }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const st = sim.state;
    stepDoor(st, now);
    drawDoorScreen(context2d(canvas), scopePalette(), st, now, reduce, new Date().getHours());
    const color = ledColor(st);
    setRgb(color ? { color } : null);
  });

  function copy() {
    if (performance.now() < sim.state.copyUntil) return;
    sim.update((st) => {
      st.view = 0;
      st.copyUntil = performance.now() + COPY_MS;
    });
    term.line('[I][door_api.h] POST /api/copy -> 202 {"job":9}');
    term.line(
      "[I][door.h] copyStart(): copy: 6 blocks read from 9C4F2A1B; lay the card to copy onto within 20 s",
    );
    after(COPY_MS, () => {
      sim.update((st) => {
        st.copyUntil = 0;
        st.log.push({ t: clock(), who: st.cards.tag.name, d: "data copied here" });
      });
      term.line("[I][door.h] event(): data copied here Key tag", "info");
      term.line(
        "[I][door.h] finish(): job 9: 6 of 6 blocks copied from White card onto 9C4F6A0D",
        "info",
      );
    });
  }

  const st = snapshot.state;
  return (
    <div className={styles.sim}>
      <ButtonRow aria-label={t("door.taps")}>
        {TAPS.map((key) => (
          <Button
            key={key}
            onClick={() =>
              sim.update((s) => {
                const [line, tone] = tap(s, key, performance.now(), clock(), new Date().getHours());
                term.line(line, tone);
              })
            }
          >
            {t(`door.tap.${key}`)}
          </Button>
        ))}
      </ButtonRow>
      <ButtonRow aria-label={t("door.app")}>
        <Button
          pressed={st.cards.white.blocked}
          onClick={() =>
            sim.update((s) => {
              s.cards.white.blocked = !s.cards.white.blocked;
              term.line(
                `[I][door_api.h] PUT /api/card?uid=${s.cards.white.uid} {"blocked":${s.cards.white.blocked}} -> 200`,
              );
            })
          }
        >
          {t("door.block")}
        </Button>
        <Button
          pressed={st.lockdown}
          onClick={() =>
            sim.update((s) => {
              s.lockdown = !s.lockdown;
              term.line(`[I][door_api.h] PUT /api/lockdown {"on":${s.lockdown}} -> 200`);
            })
          }
        >
          {t("door.lockdown")}
        </Button>
        <Button
          onClick={() =>
            sim.update((s) => {
              s.mode = "open";
              s.until = performance.now() + 5000;
              s.name = "the app";
              s.log.push({ t: clock(), who: "the app", d: "granted" });
              term.line("[I][door.h] event(): opened from the app the app", "info");
            })
          }
        >
          {t("door.open")}
        </Button>
        <Button onClick={copy}>{t("door.copy")}</Button>
        <Button onClick={() => sim.update((s) => (s.view = (s.view + 1) % DOOR_VIEWS.length))}>
          {t("door.nextView")}
        </Button>
      </ButtonRow>
      <ScreenFrame>
        <canvas
          dir="ltr"
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          role="img"
          aria-label={t("door.screen", { view: t(`views.${DOOR_VIEWS[st.view] ?? "door"}`) })}
        />
      </ScreenFrame>
      <Caption>
        {t("door.example")}
      </Caption>
      <Terminal log={term} title="$ uv run pio device monitor" />
    </div>
  );
}
