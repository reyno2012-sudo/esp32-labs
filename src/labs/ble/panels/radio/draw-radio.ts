import { drawText, MONO_FONT, type ScopePalette } from "@/lib/canvas";
import { annotationDirection, type BleT } from "../../i18n";
import { type AdvChannel, channelMHz, listening, type RadioSim, SCAN_EVERY } from "./radio-sim";

export const RADIO_W = 680;
export const RADIO_H = 330;

/** The 2.4 GHz band on top, the last 600 simulated ms of packets and listening windows below. */
export function drawRadio(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  sim: RadioSim,
  windowPct: number,
  active: boolean,
  t: BleT,
): void {
  const font = `11px ${MONO_FONT}`;
  const small = `9px ${MONO_FONT}`;
  const T = (
    x: number,
    y: number,
    s: string,
    col: string,
    f = font,
    align: CanvasTextAlign = "left",
  ) => drawText(g, x, y, s, col, f, align);
  const CH_COL: Readonly<Record<AdvChannel, string>> = { 37: C.blue, 38: C.teal, 39: C.amber };
  const { simMs } = sim;
  g.direction = annotationDirection();
  g.fillStyle = C.paper;
  g.fillRect(0, 0, RADIO_W, RADIO_H);
  // Spectrum: 2400-2483.5 MHz.
  const fx = (f: number) => 20 + ((f - 2400) / 83.5) * 640;
  T(20, 18, t("radio.draw.band"), C.muted);
  for (const [n, f] of [
    [1, 2412],
    [6, 2437],
    [11, 2462],
  ] as const) {
    g.fillStyle = C.dim;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(fx(f - 11), 110);
    g.quadraticCurveTo(fx(f), 30, fx(f + 11), 110);
    g.fill();
    g.globalAlpha = 1;
    T(fx(f), 58, `Wi-Fi ${n}`, C.muted, font, "center");
  }
  const now = listening(simMs, windowPct);
  for (let ch = 0; ch < 40; ch++) {
    const f = channelMHz(ch);
    const x = fx(f - 1);
    const adv = ch === 37 || ch === 38 || ch === 39 ? ch : null;
    g.fillStyle = adv ? CH_COL[adv] : C.dim;
    const h = adv ? (now.on && now.ch === adv ? 46 : 30) : 14;
    g.fillRect(x + 1, 110 - h, fx(f + 1) - x - 2, h);
    if (adv) T(fx(f), 124, String(ch), CH_COL[adv], `bold ${font}`, "center");
  }
  T(fx(2402), 138, "2402 MHz", C.muted, small);
  T(fx(2480), 138, "2480 MHz", C.muted, small, "right");
  // Timeline: the last 600 ms of (slowed-down) time.
  const tx = (t: number) => 110 + ((t - (simMs - 600)) / 600) * 560;
  T(20, 160, t("radio.draw.listening"), C.ink);
  for (let t0 = Math.floor((simMs - 600) / SCAN_EVERY) * SCAN_EVERY; t0 < simMs; t0 += SCAN_EVERY) {
    const l = listening(t0, windowPct);
    const w = (SCAN_EVERY * windowPct) / 100;
    const a = Math.max(tx(t0), 110);
    const b = Math.min(tx(t0 + w), tx(simMs));
    if (b > a) {
      g.fillStyle = CH_COL[l.ch];
      g.globalAlpha = 0.28;
      g.fillRect(a, 146, b - a, 22);
      g.globalAlpha = 1;
      T(a + 3, 161, t("radio.draw.channel", { ch: l.ch }), CH_COL[l.ch]);
    }
  }
  g.fillStyle = C.ink;
  g.fillRect(tx(simMs), 140, 1, 160);
  sim.devices.forEach((d) => T(20, d.y + 4, t(`radio.devices.${d.name}`), C.ink));
  for (const p of sim.packets) {
    if (p.at > simMs) continue;
    const x = tx(p.at);
    const y = p.d.y - 8 + (p.ch - 37) * 6;
    g.fillStyle = CH_COL[p.ch];
    g.globalAlpha = p.ok ? 1 : 0.3;
    g.fillRect(x, y, 4, 5);
    g.globalAlpha = 1;
    if (p.ok) {
      g.strokeStyle = C.ink;
      g.beginPath();
      g.arc(x + 2, y + 2, 6, 0, 7);
      g.stroke();
      if (active) {
        g.strokeStyle = C.violet;
        g.beginPath();
        g.moveTo(x + 2, y);
        g.lineTo(x + 2, 170);
        g.stroke();
        T(x + 5, 182, "SCAN_REQ/RSP", C.violet, small);
      }
    }
  }
  const total = sim.heard + sim.missed;
  T(
    20,
    318,
    t("radio.draw.tally", {
      heard: sim.heard,
      missed: sim.missed,
      caught: total ? Math.round((sim.heard * 100) / total) : 0,
    }),
    C.ink,
  );
  T(660, 318, t("radio.draw.slowed"), C.muted, font, "right");
}
