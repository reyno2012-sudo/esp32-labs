import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { context2d, SCREEN_H, SCREEN_W, scopePalette } from "@/lib/canvas";
import { prefersReducedMotion, useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import { ScreenFrame } from "@/ui/ScreenFrame";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import type { WidgetProps } from "@/widgets/types";
import { useSimulation } from "@/labs/shared/simulation";
import { BoardButton as BootButton } from "@/ui/board-button/BoardButton";
import styles from "../display.module.css";
import { ShowcaseRenderer, showcaseColors } from "./renderer";
import {
  AUTO_CYCLE_MS,
  autoLines,
  BUTTON_LABEL,
  clickLine,
  DOUBLE_CLICK_MS,
  doubleClickLine,
  type LogLine,
  releaseGesture,
  type ShowcaseMode,
  showcaseMode,
  showSceneLine,
  startLines,
  wrapScene,
} from "./showcase-firmware";

interface ShowcaseState {
  scene: number;
  /** performance.now() when the scene was shown: its animation and banner start there. */
  sceneStart: number;
  auto: boolean;
  down: boolean;
  downAt: number;
}

// The firmware's scene names stay English on the screen and the serial monitor; the chooser
// and the screen's description use labs-display showcase.scenes.<index>.
const SCENE_KEYS = ["torus", "plasma", "fireworks", "dashboard"] as const;

/** Lesson 03b preview: the four showcase scenes, switched with BOOT (variation 1) or the push button (variation 2). */
export function ShowcasePreview({ lesson }: WidgetProps) {
  const mode = showcaseMode(lesson.previewMode);
  // A different variation is a different firmware: remount so the monitor starts over.
  return <Showcase key={mode} mode={mode} />;
}

function Showcase({ mode }: { mode: ShowcaseMode }) {
  const { t } = useTranslation("labs-display");
  const term = useTerminalLog();
  const reduce = useReducedMotion();
  const [sim, { state }] = useSimulation<ShowcaseState>(() => ({
    scene: 0,
    sceneStart: 0,
    auto: true,
    down: false,
    downAt: 0,
  }));
  const [renderer] = useState(() => new ShowcaseRenderer());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fps = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneName = (i: number) => {
    const key = SCENE_KEYS[i];
    return key ? t(`showcase.scenes.${key}`) : "";
  };
  const sceneChoices = SCENE_KEYS.map((key, i) => ({
    key: i,
    label: t("showcase.choice", { n: i + 1, name: t(`showcase.scenes.${key}`) }),
  }));

  const print = (lines: readonly LogLine[]) =>
    lines.forEach(([text, tone]) => term.line(text, tone));

  function show(i: number, via?: string) {
    const scene = wrapScene(i);
    sim.update((st) => {
      st.scene = scene;
      st.sceneStart = performance.now();
    });
    renderer.reset(scene);
    if (via) term.line(via, "you");
    print([showSceneLine(scene)]);
  }

  function setAuto(on: boolean) {
    sim.update((st) => {
      st.auto = on;
    });
    print(autoLines(mode, on));
  }

  const start = useEffectEvent(() => {
    print(startLines(mode));
    sim.update((st) => {
      st.auto = !prefersReducedMotion();
    });
    show(0);
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      term.clear();
    };
  });
  useEffect(() => start(), []);

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    sim.update((st) => {
      st.down = true;
      st.downAt = performance.now();
    });
  }

  function onPointerUp() {
    const { downAt, scene, auto } = sim.state;
    sim.update((st) => {
      st.down = false;
      st.downAt = 0;
    });
    if (!downAt) return;
    if (releaseGesture(performance.now() - downAt) === "long") return setAuto(!auto);
    if (mode === "boot") return show(scene + 1);
    // Variation 2 waits to see whether a second click follows.
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      print([doubleClickLine]);
      return show(scene - 1);
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      print([clickLine(2 + Math.floor(Math.random() * 5))]);
      show(sim.state.scene + 1);
    }, DOUBLE_CLICK_MS);
  }

  function onPointerCancel() {
    sim.update((st) => {
      st.down = false;
      st.downAt = 0;
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    show(sim.state.scene + 1);
  }

  useFrameLoop(canvasRef, ({ now, dt }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (dt > 0) fps.current = fps.current * 0.9 + (1 / dt) * 0.1;
    if (sim.state.auto && now - sim.state.sceneStart >= AUTO_CYCLE_MS) show(sim.state.scene + 1);
    const st = sim.state;
    const since = now - st.sceneStart;
    renderer.draw(
      context2d(canvas),
      showcaseColors(scopePalette()),
      st.scene,
      reduce ? 1.2 : since / 1000,
      dt,
      reduce ? Infinity : since,
      {
        fps: fps.current,
        auto: st.auto,
        buttonDown: mode === "button" ? st.down : undefined,
      },
    );
  });

  return (
    <div className={styles.sim}>
      <ScreenFrame>
        <canvas
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          role="img"
          aria-label={t("showcase.aria", { n: state.scene + 1, name: sceneName(state.scene) })}
          dir="ltr"
        />
      </ScreenFrame>
      <div className={styles.bootRow}>
        <BootButton
          down={state.down}
          aria-label={t(`showcase.${mode}.aria`)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
        >
          {BUTTON_LABEL[mode]}
        </BootButton>
        <ChoiceGroup
          label={t("showcase.scenesLabel")}
          choices={sceneChoices}
          value={state.scene}
          onChange={(i) => show(i, `scene ${i + 1}`)}
        />
        <span className={styles.autoFlag}>
          {state.auto ? t("showcase.autoOn") : t("showcase.autoOff")}
        </span>
      </div>
      <Caption>{t(`showcase.${mode}.caption`)}</Caption>
      <Terminal log={term} title={t("showcase.terminal")} />
    </div>
  );
}
