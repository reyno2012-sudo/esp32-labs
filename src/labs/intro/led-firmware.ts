// The logic of labs/02-led/src/main.cpp, as pure functions: what the LED does and how the serial
// commands change it. The preview only draws what these return.
import type { Tone } from "@/ui/terminal/terminal-log";

export type LedMode = "off" | "on" | "blink" | "fade" | "sos";

export interface LedState {
  readonly mode: LedMode;
  /** 0..255 */
  readonly level: number;
  readonly blinkMs: number;
  /** performance.now() when the mode started. */
  readonly since: number;
}

export type LogLine = readonly [string, Tone];

export const SOS = "101010001110111011100010101000000";
const SOS_UNIT_MS = 150;

export const initialLed = (now: number): LedState => ({
  mode: "fade",
  level: 255,
  blinkMs: 500,
  since: now,
});

/** PWM duty 0..255 after `elapsed` ms in the current mode. */
export function duty(state: LedState, elapsed: number): number {
  switch (state.mode) {
    case "off":
      return 0;
    case "on":
      return state.level;
    case "blink":
      return Math.floor(elapsed / state.blinkMs) % 2 === 0 ? state.level : 0;
    case "fade": {
      // A triangle wave, squared: the eye sees brightness roughly logarithmically.
      const t = elapsed % 2000;
      const x = Math.floor(t < 1000 ? (t * 255) / 1000 : ((2000 - t) * 255) / 1000);
      return Math.floor((x * x) / 255);
    }
    case "sos":
      return SOS[Math.floor(elapsed / SOS_UNIT_MS) % SOS.length] === "1" ? state.level : 0;
  }
}

export const helpLines = (s: LedState): LogLine[] => [
  ["Commands: on | off | blink [ms] | fade | sos | level <0-255> | help", "plain"],
  [`Now: mode=${s.mode} level=${s.level} blink=${s.blinkMs}ms`, "plain"],
];

const modeLine = (mode: LedMode): LogLine => [
  `[I][main.cpp:51] setMode(): mode -> ${mode}`,
  "info",
];

/** One serial command: the next state and what the firmware prints. */
export function handleCommand(
  state: LedState,
  raw: string,
  now: number,
): { state: LedState; lines: LogLine[] } {
  const line = raw.trim().toLowerCase();
  const [cmd = "", ...rest] = line.split(" ");
  const arg = rest.join(" ");
  const setMode = (mode: LedMode, extra: Partial<LedState> = {}) => ({
    state: { ...state, ...extra, mode, since: now },
    lines: [modeLine(mode)],
  });

  if (cmd === "on" || cmd === "off" || cmd === "fade" || cmd === "sos") return setMode(cmd);
  if (cmd === "blink") {
    if (!arg) return setMode("blink");
    const ms = Number.parseInt(arg, 10);
    if (!(ms >= 20 && ms <= 5000))
      return {
        state,
        lines: [
          [
            `[W][main.cpp:104] handleCommand(): blink speed must be 20-5000 ms, got '${arg}'`,
            "warn",
          ],
        ],
      };
    return setMode("blink", { blinkMs: ms });
  }
  if (cmd === "level") {
    const v = Number.parseInt(arg, 10);
    if (!arg || !(v >= 0 && v <= 255))
      return {
        state,
        lines: [
          [`[W][main.cpp:112] handleCommand(): level needs a number 0-255, got '${arg}'`, "warn"],
        ],
      };
    return {
      state: { ...state, level: v },
      lines: [[`[I][main.cpp:116] handleCommand(): level -> ${v}`, "info"]],
    };
  }
  if (cmd === "help" || cmd === "?") return { state, lines: helpLines(state) };
  return {
    state,
    lines: [[`[W][main.cpp:121] handleCommand(): unknown command '${cmd}' (type help)`, "warn"]],
  };
}
