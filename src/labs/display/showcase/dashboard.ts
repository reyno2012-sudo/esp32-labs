// Scene 4: the live dashboard. The preview uses placeholder numbers; the board shows its real
// chip temperature, memory and frame times.
import { DISPLAY_FONT, MONO_FONT } from "@/lib/canvas";
import { mix, rgb } from "../color";
import { H, type Scene, type ShowcaseColors, W } from "./scene-types";

const HISTORY = 120;
const SMALL = `9px ${MONO_FONT}`;

function gauge(g: CanvasRenderingContext2D, C: ShowcaseColors, level: number, temp: number) {
  const cx = 72;
  const cy = 96;
  for (let s = 0; s < 36; s++) {
    const a0 = 2.35 + (4.71 * s) / 36;
    const a1 = 2.35 + (4.71 * (s + 0.8)) / 36;
    const pos = s / 36;
    const lit = pos < 0.5 ? mix(C.teal, C.amber, pos * 2) : mix(C.amber, C.coral, (pos - 0.5) * 2);
    g.beginPath();
    g.arc(cx, cy, 54, a0, a1);
    g.arc(cx, cy, 42, a1, a0, true);
    g.closePath();
    g.fillStyle = rgb(pos < level ? lit : C.dim);
    g.fill();
  }
  g.textAlign = "center";
  g.fillStyle = rgb(C.ink);
  g.font = `700 20px ${DISPLAY_FONT}`;
  g.fillText(temp.toFixed(1), cx, cy + 6);
  g.font = SMALL;
  g.fillStyle = rgb(C.muted);
  g.fillText("CHIP TEMP °C", cx, cy + 20);
  g.fillText("20", cx - 40, cy + 44);
  g.fillText("80", cx + 40, cy + 44);
  g.textAlign = "left";
}

function memoryBar(
  g: CanvasRenderingContext2D,
  C: ShowcaseColors,
  y: number,
  label: string,
  used: number,
  total: number,
) {
  g.font = SMALL;
  g.fillStyle = rgb(C.muted);
  g.fillText(label, 150, y + 7);
  g.textAlign = "right";
  g.fillText(`${used} / ${total} KB`, 310, y + 7);
  g.textAlign = "left";
  g.fillStyle = rgb(C.dim);
  g.beginPath();
  g.roundRect(150, y + 10, 160, 8, 3);
  g.fill();
  g.fillStyle = rgb(C.teal);
  g.beginPath();
  g.roundRect(150, y + 10, Math.max(6, (160 * used) / total), 8, 3);
  g.fill();
}

export function createDashboard(random: () => number = Math.random): Scene {
  const hist = Array.from({ length: HISTORY }, () => 45);

  function frameTimes(g: CanvasRenderingContext2D, C: ShowcaseColors, t: number) {
    hist.push(44 + Math.sin(t * 3) * 3 + random() * 2);
    hist.shift();
    const x0 = 150;
    const y0 = 96;
    const w = 160;
    const h = 60;
    const mx = 80;
    g.fillStyle = rgb(C.muted);
    g.fillText(`FRAME TIME  ${(hist[HISTORY - 1] ?? 0).toFixed(0)} ms (preview)`, x0, y0 - 4);
    g.fillStyle = rgb(C.dim);
    [20, 40, 60].forEach((ms) => {
      const y = y0 + h - (h * ms) / mx;
      for (let x = x0; x < x0 + w; x += 4) g.fillRect(x, y, 1, 1);
    });
    g.beginPath();
    hist.forEach((v, i) => {
      const x = x0 + (i * w) / HISTORY;
      const y = y0 + h - (h * Math.min(v, mx)) / mx;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.strokeStyle = rgb(C.teal);
    g.lineWidth = 1.2;
    g.stroke();
    g.lineTo(x0 + w, y0 + h);
    g.lineTo(x0, y0 + h);
    g.closePath();
    g.fillStyle = rgb(mix(C.night, C.teal, 0.27));
    g.globalCompositeOperation = "destination-over";
    g.fill();
    g.globalCompositeOperation = "source-over";
    g.fillStyle = rgb(C.muted);
    g.fillText("last 120 frames, grid every 20 ms", x0, y0 + h + 12);
  }

  return {
    name: "Live dashboard",
    draw(g, C, t) {
      g.fillStyle = rgb(C.night);
      g.fillRect(0, 0, W, H);
      const temp = 41 + Math.sin(t * 0.4) * 0.6;
      const level = Math.min(1, Math.max(0, (temp - 20) / 60)) * Math.min(1, t * 1.5);
      gauge(g, C, level, temp);
      g.fillStyle = rgb(C.ink);
      g.font = `13px ${DISPLAY_FONT}`;
      g.fillText("ESP32-S3 N16R8", 150, 22);
      memoryBar(g, C, 34, "RAM", 212, 394);
      memoryBar(g, C, 58, "PSRAM", 108, 8192);
      frameTimes(g, C, t);
    },
  };
}
