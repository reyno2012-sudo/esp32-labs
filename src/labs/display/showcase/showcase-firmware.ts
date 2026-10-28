// What labs/03b-showcase/src does with its controls, as pure functions: which gesture a press is,
// which scene comes next, and what the firmware prints.
import type { Tone } from "@/ui/terminal/terminal-log";
import { SCENE_NAMES } from "./renderer";

/** Variation 1 drives the scenes with BOOT, variation 2 with the push button on GPIO 5. */
export type ShowcaseMode = "boot" | "button";
export type LogLine = readonly [string, Tone];

export const LONG_PRESS_MS = 600;
export const DOUBLE_CLICK_MS = 280;
export const AUTO_CYCLE_MS = 12_000;

export const showcaseMode = (previewMode: string | undefined): ShowcaseMode =>
  previewMode === "button" ? "button" : "boot";

/** Scene index wrapped into 0..3, so "previous" from scene 1 is scene 4. */
export const wrapScene = (i: number) => (i + SCENE_NAMES.length) % SCENE_NAMES.length;

/** A release: long presses toggle auto-cycle; otherwise it is a click. */
export const releaseGesture = (heldMs: number): "long" | "click" =>
  heldMs >= LONG_PRESS_MS ? "long" : "click";

export const showSceneLine = (scene: number): LogLine => [
  `[I][main.cpp:70] showScene(): scene ${scene + 1}/4: ${SCENE_NAMES[scene] ?? ""}`,
  "info",
];

export const autoLines = (mode: ShowcaseMode, auto: boolean): LogLine[] => [
  [
    mode === "boot"
      ? "[I][boot_only.cpp:24] poll(): BOOT long press"
      : "[I][with_button.cpp:24] toAction(): button: long press",
    "info",
  ],
  [`[I][main.cpp:170] pollControls(): auto-cycle ${auto ? "on" : "off"}`, "info"],
];

export const clickLine = (bounces: number): LogLine => [
  `[I][with_button.cpp:18] toAction(): button: click (${bounces} bounces filtered)`,
  "info",
];
export const doubleClickLine: LogLine = [
  "[I][with_button.cpp:21] toAction(): button: double-click",
  "info",
];

export const startLines = (mode: ShowcaseMode): LogLine[] => [
  ["Commands: next | prev | scene <1-4> | auto on|off | hud | help", "plain"],
  [
    "[I][main.cpp:229] setup(): Frame buffer: 106 KB in internal RAM (fast) (largest free internal block was … KB)",
    "info",
  ],
  [
    mode === "boot"
      ? "[I][boot_only.cpp:15] begin(): Controls: BOOT button on GPIO 0 (variation 1)"
      : "[I][with_button.cpp:38] begin(): Controls: button on GPIO 5 and BOOT on GPIO 0 (variation 2)",
    "info",
  ],
];

/** The button's printed name: the board's silkscreen (BOOT) or the part, so English. */
export const BUTTON_LABEL = { boot: "BOOT", button: "BUTTON" } as const satisfies Record<
  ShowcaseMode,
  string
>;
