// The signal path under the journey: a sound, a microphone, the ESP32-S3, the lab's output.
import type { ScopePalette } from "@/lib/canvas";
import { display, labelWriter, mono } from "../../kit/draw";
import type { JourneyLab } from "./journey-data";

/** The translated labels of the picked lab. */
export interface JourneyText {
  readonly title: string;
  readonly what: string;
  readonly out: string;
  readonly noMic: string;
  readonly adcOrI2s: string;
  readonly withSpeaker: string;
}

export function drawJourney(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  L: JourneyLab,
  text: JourneyText,
  tt: number,
): void {
  const W = labelWriter(g);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 680, 120);
  // Sound waves leaving a source on the left.
  for (let k = 0; k < 4; k++) {
    const r = ((tt * 40 + k * 22) % 88) + 6;
    g.strokeStyle = C.pink;
    g.globalAlpha = 1 - r / 94;
    g.beginPath();
    g.arc(30, 60, r, -0.6, 0.6);
    g.stroke();
  }
  g.globalAlpha = 1;
  const box = (x: number, w: number, label: string, sub: string, col: string) => {
    g.strokeStyle = col;
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(x, 34, w, 52, 8);
    g.stroke();
    W(x + w / 2, 56, label, C.ink, display(12), "center");
    W(x + w / 2, 74, sub, C.muted, mono(10), "center");
  };
  const needsInmp = L.need.includes("inmp");
  const usesSpk = L.need.includes("spk") || (L.opt ?? []).includes("spk");
  box(
    130,
    120,
    L.need.includes("spk") && !needsInmp ? text.noMic : needsInmp ? "INMP441" : "KY-037 / INMP441",
    needsInmp ? "I2S0" : text.adcOrI2s,
    C.pink,
  );
  box(300, 140, "ESP32-S3", usesSpk ? text.withSpeaker : "16 000/s", C.teal);
  box(500, 160, `${L.id} ${text.title}`, text.out, C.amber);
  g.lineWidth = 1;
  for (const [a, b] of [
    [250, 300],
    [440, 500],
  ] as const) {
    g.strokeStyle = C.dim;
    g.beginPath();
    g.moveTo(a, 60);
    g.lineTo(b, 60);
    g.stroke();
    const p = a + ((tt * 0.8) % 1) * (b - a);
    g.fillStyle = C.pink;
    g.beginPath();
    g.arc(p, 60, 3.5, 0, 7);
    g.fill();
  }
  W(680 - 8, 108, text.what, C.muted, mono(10), "right");
}
