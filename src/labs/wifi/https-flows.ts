// W3 "Follow one request, step by step": the weather fetch and the oracle call as message flows.
// Plain data: arrow labels and payloads stay as the board sends them; the explanations (lane
// subtitles, step titles and texts) live in the labs-wifi catalogue under the ids below.
import type { LegendKind, SeqFlow, SeqFlows, SeqStep } from "@/ui/sequence/types";

export type HttpsFlowKey = "weather" | "oracle";

interface LaneData {
  readonly id: string;
  /** A name that is code or a host name, shown as is; otherwise the catalogue names the lane. */
  readonly name?: string;
}

interface StepData extends Omit<SeqStep, "title" | "text"> {
  readonly id: string;
}

interface FlowData {
  readonly wait?: readonly [number, number];
  readonly lanes: readonly LaneData[];
  readonly steps: readonly StepData[];
}

/** One flow's translated text, as the catalogue holds it. */
export interface FlowText {
  readonly label: string;
  readonly lanes: Readonly<Record<string, { readonly name?: string; readonly sub: string }>>;
  readonly steps: Readonly<Record<string, { readonly title: string; readonly text: string }>>;
}

const FLOWS: Readonly<Record<HttpsFlowKey, FlowData>> = {
  weather: {
    wait: [1, 4],
    lanes: [
      { id: "loop", name: "loop()" },
      { id: "worker" },
      { id: "server", name: "api.open-meteo.com" },
    ],
    steps: [
      {
        f: 0,
        t: 1,
        msg: "weather job",
        ms: 0,
        id: "job",
        code: "Request{ job: Weather,\n         place: Hamburg, Germany (53.55, 9.99) }",
      },
      {
        f: 1,
        t: 2,
        msg: "connect :443",
        ms: 70,
        net: true,
        id: "connect",
        code: "DNS  api.open-meteo.com → an IP address\nTCP  connect to <ip>:443",
      },
      {
        f: 2,
        t: 1,
        msg: "certificate",
        ms: 160,
        net: true,
        id: "tls",
        code: "certificate for: open-meteo.com\nsigned by: an intermediate CA\n  → a root in the firmware's CA bundle ✓\nname matches ✓   keys agreed ✓",
      },
      {
        f: 1,
        t: 2,
        msg: "GET /v1/forecast?…",
        ms: 15,
        net: true,
        id: "get",
        code: "GET /v1/forecast?latitude=53.55&longitude=9.99\n    &current=temperature_2m,weather_code,…\n    &hourly=temperature_2m,precipitation_probability\n    &forecast_hours=24&daily=…&forecast_days=7",
      },
      {
        f: 2,
        t: 1,
        msg: "200 OK · 1.7 KB JSON",
        ms: 120,
        net: true,
        id: "json",
        code: '{"current":{"temperature_2m":11.2,"weather_code":61,…},\n "hourly":{"time":["2026-10-12T14:00",…24],\n           "temperature_2m":[11.2,11.0,…24],…},\n "daily":{"time":[…7],"temperature_2m_max":[14,…7],…}}',
      },
      {
        f: 1,
        t: 1,
        msg: "filter + parse",
        ms: 4,
        id: "filter",
        code: "kept     current.*  hourly.temperature_2m[24]\n         hourly.precipitation_probability[24]  daily.*[7]\ndropped  hourly.time[24]  daily.time[7]   (≈30 %)",
      },
      {
        f: 1,
        t: 0,
        msg: "Weather struct",
        ms: 0,
        id: "back",
        code: "Weather{ temp: 11.2, feels: 8.9, code: 61,\n         hourTemp[24], hourRain[24],\n         dayMin[7], dayMax[7] }   version 42 → 43",
      },
      {
        f: 0,
        t: 0,
        msg: "draw",
        ms: 0,
        id: "draw",
        code: "frame 4711: now view · light rain · 11°C",
      },
    ],
  },
  oracle: {
    wait: [1, 6],
    lanes: [
      { id: "loop", name: "loop()" },
      { id: "worker" },
      { id: "gateway", name: "LiteLLM" },
      { id: "provider" },
    ],
    steps: [
      {
        f: 0,
        t: 1,
        msg: "oracle job",
        ms: 0,
        id: "job",
        code: '{"place":"Hamburg, Germany","local_time":"Sunday 12 October, 14:20",\n "weather":{"now":"light rain","temp_c":11.2,…},\n "bench":{"chip_temp_c":41.5,"wifi_signal_dbm":-54}}',
      },
      {
        f: 1,
        t: 2,
        msg: "POST /v1/chat/completions",
        ms: 40,
        net: true,
        id: "request",
        code: 'POST http://<your Mac>:4000/v1/chat/completions\nAuthorization: Bearer sk-bench-…\n{"model":"oracle","messages":[…],\n "tools":[{"type":"function","function":{"name":"show_on_bench",\n   "parameters":{title, lines, color, scene}}}],\n "tool_choice":{"type":"function","function":{"name":"show_on_bench"}}}',
      },
      {
        f: 2,
        t: 2,
        msg: "name → model",
        ms: 2,
        id: "route",
        code: "model_name: oracle\n  model: anthropic/claude-opus-5-5\n  api_key: os.environ/ANTHROPIC_API_KEY",
      },
      {
        f: 2,
        t: 3,
        msg: "provider's own API",
        ms: 60,
        net: true,
        id: "translate",
        code: 'POST https://api.anthropic.com/v1/messages\n{…, "tool_choice":{"type":"tool","name":"show_on_bench"}}',
      },
      {
        f: 3,
        t: 3,
        msg: "writing…",
        ms: 2400,
        net: true,
        live: true,
        id: "writing",
        code: "",
      },
      {
        f: 3,
        t: 2,
        msg: "function call",
        ms: 60,
        net: true,
        id: "call",
        code: '{"title":"Drizzle hum","color":"#5fa8ff","scene":"rain",\n "lines":["Rain taps the window","the chip hums at forty-two",\n          "solder waits for sun"]}',
      },
      {
        f: 2,
        t: 1,
        msg: "OpenAI-style answer",
        ms: 30,
        net: true,
        id: "standard",
        code: 'choices[0].message.tool_calls[0].function.arguments =\n  "{\\"title\\":\\"Drizzle hum\\",\\"color\\":\\"#5fa8ff\\",…}"\nusage: prompt_tokens 612 · completion_tokens 94',
      },
      {
        f: 1,
        t: 1,
        msg: "parse twice + clean",
        ms: 3,
        id: "parse",
        code: "parse answer → arguments (a string)\nparse arguments → title, lines[3], color, scene\n#5fa8ff → r 95, g 168, b 255",
      },
      {
        f: 1,
        t: 0,
        msg: "OracleAnswer",
        ms: 0,
        id: "show",
        code: "OracleAnswer{ title: Drizzle hum, lines[3], led #5fa8ff,\n              scene: rain, 612 > 94 tokens, 2.6 s }",
      },
    ],
  },
};

export const HTTPS_LEGEND: readonly LegendKind[] = ["msg", "wait", "loop"];

function localizeFlow(data: FlowData, text: FlowText): SeqFlow {
  return {
    label: text.label,
    ...(data.wait ? { wait: data.wait } : {}),
    lanes: data.lanes.map((l) => {
      const lane = text.lanes[l.id];
      return [l.name ?? lane?.name ?? l.id, lane?.sub ?? ""] as const;
    }),
    steps: data.steps.map(({ id, ...step }) => {
      const t = text.steps[id];
      return { ...step, title: t?.title ?? id, text: t?.text ?? "" };
    }),
  };
}

/** The flows with their explanations in the reader's language. */
export function httpsFlows(text: Readonly<Record<HttpsFlowKey, FlowText>>): SeqFlows {
  return {
    weather: localizeFlow(FLOWS.weather, text.weather),
    oracle: localizeFlow(FLOWS.oracle, text.oracle),
  };
}

/** The payload while the model writes: the worker waits, loop() keeps drawing. */
export const httpsLive = (frame: number, seconds: string) =>
  `worker task  waiting on the network … ${seconds} s\nloop()       frame ${frame} drawn, the sky still animating`;
