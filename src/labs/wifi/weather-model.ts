// wifi-lab-w3's example data and its view/oracle logic as pure functions: each changes the
// state it is given and returns what the firmware prints.
import type { LogLine } from "./log";

export const WEATHER_VIEWS = ["now", "forecast", "week", "oracle"] as const;
export const ORACLE_VIEW = 3;

export type Sky = "sun" | "rain" | "clouds";

export const WX = {
  place: "Hamburg, Germany",
  temp: 11,
  feels: 8,
  wind: 19,
  hum: 84,
  desc: "light rain",
  hours: [11, 11, 10, 10, 9, 9, 9, 8, 8, 9, 10, 12, 13, 14, 14, 14, 13, 12, 12, 11, 11, 10, 10, 10],
  rain: [
    70, 65, 55, 40, 30, 20, 10, 10, 5, 5, 10, 20, 35, 50, 60, 45, 30, 20, 10, 10, 5, 5, 10, 15,
  ],
  days: [
    ["Today", 8, 14, "rain"],
    ["Mon", 7, 12, "rain"],
    ["Tue", 6, 13, "clouds"],
    ["Wed", 9, 16, "sun"],
    ["Thu", 10, 17, "sun"],
    ["Fri", 8, 13, "clouds"],
    ["Sat", 5, 11, "rain"],
  ] as readonly (readonly [string, number, number, Sky])[],
} as const;

export interface OracleAnswer {
  readonly title: string;
  /** The colour the model picked for the title and LED (data, as the model sent it). */
  readonly color: string;
  readonly scene: Sky;
  readonly lines: readonly string[];
  /** The question asked; empty for a haiku. */
  readonly q: string;
}

export const ANSWERS: readonly OracleAnswer[] = [
  {
    title: "Drizzle hum",
    color: "#5fa8ff",
    scene: "rain",
    lines: ["Rain taps the window", "the chip hums at forty-two", "solder waits for sun"],
    q: "",
  },
  {
    title: "Bring it",
    color: "#ffb03c",
    scene: "rain",
    lines: ["Yes: 70% rain now,", "drier after 18:00.", "Umbrella, or wait", "and bike home late."],
    q: "should I take an umbrella?",
  },
];

export const HAIKU = 0;
export const UMBRELLA = 1;

export interface WeatherState {
  view: number;
  /** Index into ANSWERS once one arrived. */
  answer: number | null;
  answerAt: number;
  /** performance.now() when the oracle was asked; 0 when idle. */
  asking: number;
  footer: string;
}

export const initWeather = (): WeatherState => ({
  view: 0,
  answer: null,
  answerAt: 0,
  asking: 0,
  footer: "weather 412 ms 1.7 KB",
});

export const BOOT_LINES: readonly LogLine[] = [
  [
    "[I][main.cpp:330] setup(): wifi-lab-w3: city Hamburg, Germany, AI gateway set, model oracle",
    "info",
  ],
  ["[I][worker.h:96] perform(): weather: HTTP 200 in 412 ms, 1701 bytes", "info"],
];

export function setWeatherView(st: WeatherState, v: number, via?: string): LogLine[] {
  const n = WEATHER_VIEWS.length;
  st.view = ((v % n) + n) % n;
  const lines: LogLine[] = via ? [[via, "you"]] : [];
  lines.push([
    `[I][main.cpp:95] setView(): view ${st.view + 1}: ${WEATHER_VIEWS[st.view]}`,
    "info",
  ]);
  return lines;
}

/** Starts asking the oracle; returns null when a question is already on its way. */
export function askOracle(
  st: WeatherState,
  i: number,
  now: number,
  via?: string,
): LogLine[] | null {
  if (st.asking) return null;
  const q = ANSWERS[i]?.q;
  const lines: LogLine[] = via ? [[via, "you"]] : [];
  lines.push(...setWeatherView(st, ORACLE_VIEW));
  st.asking = now;
  lines.push([
    `[I][main.cpp:140] askOracle(): asking oracle${q ? `: ${q}` : " for a haiku"}`,
    "info",
  ]);
  return lines;
}

/** The answer arrives (2.4 s later in the preview). */
export function oracleAnswered(st: WeatherState, i: number, now: number): LogLine[] {
  const answer = ANSWERS[i];
  if (!answer) return [];
  st.asking = 0;
  st.answer = i;
  st.answerAt = now;
  st.footer = "ai 2840 ms 1.4 KB";
  return [
    ["[I][worker.h:96] perform(): ai: HTTP 200 in 2840 ms, 1388 bytes", "info"],
    [
      `[I][main.cpp:260] takeResults(): oracle: "${answer.title}" (${answer.lines.length} lines, 612 > 94 tokens)`,
      "info",
    ],
    ...answer.lines.map((l): LogLine => [`    ${l}`, "plain"]),
  ];
}

/** Double-click outside the oracle view: fetch the weather again. */
export function refreshWeather(st: WeatherState): LogLine[] {
  st.footer = "weather 398 ms 1.7 KB";
  return [
    ["[I][main.cpp:108] fetchWeather(): weather for Hamburg, Germany (button)", "info"],
    ["[I][worker.h:96] perform(): weather: HTTP 200 in 398 ms, 1701 bytes", "info"],
  ];
}

/** How much of the answer is typed out after `ms`: 35 characters a second, line by line. */
export function typedLines(lines: readonly string[], ms: number): string[] {
  let budget = Math.floor((ms * 35) / 1000);
  const out: string[] = [];
  for (const l of lines) {
    if (budget <= 0) break;
    out.push(l.slice(0, budget));
    budget -= l.length;
  }
  return out;
}
