// S4 panel: getting the audio out (phone, USB, the board's speaker), and what a WAV file is.
import type { ScopePalette } from "@/lib/canvas";
import { display, labelWriter, mono, textWriter } from "../../kit/draw";
import type { SoundT } from "../../kit/i18n";

export type PathKey = "phone" | "usb" | "board";
type Place = "phone" | "board" | "mac" | "speaker";

/** Each path has four steps; their title and rich text live in getOut.paths.<path>.<1-4>. */
export const STEP_NOS = ["1", "2", "3", "4"] as const;

export interface PathStep {
  readonly from: Place;
  readonly to: Place;
  /** What travels: code as it is, or a catalogue key (getOut.msg.<key>) when it is words. */
  readonly msg: string | { readonly key: "chunks" | "cone" };
}

export const PATHS: Readonly<Record<PathKey, readonly PathStep[]>> = {
  phone: [
    {
      from: "phone",
      to: "board",
      msg: "GET /",
    },
    {
      from: "phone",
      to: "board",
      msg: "GET /api/clips",
    },
    {
      from: "board",
      to: "phone",
      msg: { key: "chunks" },
    },
    {
      from: "phone",
      to: "phone",
      msg: "decodeAudioData",
    },
  ],
  board: [
    {
      from: "mac",
      to: "board",
      msg: "play 3 0.7",
    },
    {
      from: "board",
      to: "board",
      msg: "gain = min(16, 29000 / peak)",
    },
    {
      from: "board",
      to: "speaker",
      msg: { key: "cone" },
    },
    {
      from: "phone",
      to: "board",
      msg: "POST /api/play?n=3",
    },
  ],
  usb: [
    {
      from: "mac",
      to: "mac",
      msg: "",
    },
    {
      from: "mac",
      to: "board",
      msg: "send 3",
    },
    {
      from: "board",
      to: "mac",
      msg: "UklGRiyQAQBXQVZF…",
    },
    {
      from: "mac",
      to: "mac",
      msg: "CRC ok → clip-3.wav",
    },
  ],
};

type WavField =
  | "riff"
  | "size"
  | "wave"
  | "fmt"
  | "fmtLen"
  | "pcm"
  | "channels"
  | "rate"
  | "byteRate"
  | "align"
  | "bits"
  | "data"
  | "dataSize";

/** The 44-byte WAV header: [value, bytes, meaning (getOut.wav.<key>)]. */
export const WAV_HEADER: readonly (readonly [string, string, WavField])[] = [
  ["RIFF", "52 49 46 46", "riff"],
  ["size", "24 90 01 00", "size"],
  ["WAVE", "57 41 56 45", "wave"],
  ["fmt ", "66 6D 74 20", "fmt"],
  ["16", "10 00 00 00", "fmtLen"],
  ["1", "01 00", "pcm"],
  ["1", "01 00", "channels"],
  ["16000", "80 3E 00 00", "rate"],
  ["32000", "00 7D 00 00", "byteRate"],
  ["2", "02 00", "align"],
  ["16", "10 00", "bits"],
  ["data", "64 61 74 61", "data"],
  ["size", "00 90 01 00", "dataSize"],
];

const POS: Readonly<Record<Place, number>> = { board: 340, phone: 600, mac: 80, speaker: 600 };

export function drawGetOut(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  path: PathKey,
  s: PathStep,
  t: number,
  reduce: boolean,
  tr: SoundT,
): void {
  const T = textWriter(g);
  const W = labelWriter(g);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 150);
  const boxes: readonly (readonly [Place, string, string])[] = [
    ["board", "ESP32-S3", tr("getOut.boxes.clips")],
    ...(path === "board"
      ? ([
          ["mac", tr("getOut.boxes.you"), tr("getOut.boxes.serialOrButton")],
          ["speaker", "MAX98357A", tr("getOut.boxes.speaker")],
        ] as const)
      : path === "phone"
        ? ([["phone", tr("getOut.boxes.phone"), tr("getOut.boxes.browser")]] as const)
        : ([["mac", "Mac", "sound_pull.py"]] as const)),
  ];
  for (const [k, n, sub] of boxes) {
    const x = POS[k];
    const on = s.from === k || s.to === k;
    g.strokeStyle = on ? C.pink : C.dim;
    g.lineWidth = on ? 2 : 1;
    g.beginPath();
    g.roundRect(x - 60, 40, 120, 60, 9);
    g.stroke();
    g.lineWidth = 1;
    W(x, 66, n, C.ink, display(13), "center");
    W(x, 86, sub, C.muted, mono(10), "center");
  }
  const msg = typeof s.msg === "string" ? s.msg : tr(`getOut.msg.${s.msg.key}`);
  const M = typeof s.msg === "string" ? T : W;
  if (s.from !== s.to) {
    const a = POS[s.from];
    const b = POS[s.to];
    const k = reduce ? 0.5 : (t * 0.6) % 1;
    g.strokeStyle = C.dim;
    g.beginPath();
    g.moveTo(a, 120);
    g.lineTo(b, 120);
    g.stroke();
    g.fillStyle = C.pink;
    g.beginPath();
    g.arc(a + (b - a) * k, 120, 5, 0, 7);
    g.fill();
    M((a + b) / 2, 140, msg, C.ink, mono(11), "center");
  } else if (msg) M(POS[s.from], 130, msg, C.ink, mono(11), "center");
  W(10, 20, tr(`getOut.headline.${path}`), C.muted, mono(10));
}
