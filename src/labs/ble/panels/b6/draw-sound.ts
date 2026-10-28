import type { BleT } from "../../i18n";
import type { SvgPainter } from "../svg";

export type MediaKey = "play" | "next" | "up" | "down";
export type Press = MediaKey | "direct";

/** HID consumer usages, named as in the HID usage tables (they stay in English). */
export const USAGE: Readonly<Record<MediaKey, string>> = {
  play: "0x00CD play/pause",
  next: "0x00B5 next track",
  up: "0x00E9 volume up",
  down: "0x00EA volume down",
};

/** What the phone is doing, and the last key press being animated. */
export class MediaScene {
  playing = true;
  volume = 6;
  track = 1;
  anim: Press | null = null;
  at = 0;

  press(key: Press, now = performance.now()): void {
    this.anim = key;
    this.at = now;
  }

  /** The phone reacts to a media key. */
  apply(key: MediaKey): void {
    if (key === "play") this.playing = !this.playing;
    if (key === "next") this.track++;
    if (key === "up") this.volume = Math.min(10, this.volume + 1);
    if (key === "down") this.volume = Math.max(0, this.volume - 1);
  }
}

/** Board → phone (BLE HID) → speaker (Classic A2DP), and the direct path that can't work. */
export function drawSound(
  p: SvgPainter,
  st: MediaScene,
  now: number,
  reduce: boolean,
  t: BleT,
): void {
  const T = (x: number, y: number, s: string, fill: string, size = 12, weight = 400) =>
    p.add(
      "text",
      {
        x,
        y,
        fill,
        "font-size": size * 1.25,
        "text-anchor": "middle",
        "font-family": "var(--font-body)",
        "font-weight": weight,
      },
      s,
    );
  p.clear();
  const k = st.anim ? Math.min(1, (now - st.at) / (reduce ? 1 : 1600)) : 1;
  // Devices.
  p.add("rect", {
    x: 20,
    y: 70,
    width: 110,
    height: 70,
    rx: 8,
    fill: "var(--pcb)",
    stroke: "var(--scope-blue)",
    "stroke-width": 2,
  });
  T(75, 100, "Bench B6", "var(--scope-ink)", 13, 600);
  T(75, 118, t("sound.draw.leOnly"), "var(--scope-muted)", 10);
  p.add("rect", {
    x: 280,
    y: 50,
    width: 90,
    height: 110,
    rx: 12,
    fill: "var(--surface)",
    stroke: "var(--ink)",
    "stroke-width": 2,
  });
  T(325, 82, t("sound.draw.phone"), "var(--ink)", 12, 600);
  T(325, 98, t("sound.draw.orMac"), "var(--muted)", 10);
  T(
    325,
    124,
    st.playing ? t("sound.draw.playing") : t("sound.draw.paused"),
    st.playing ? "var(--ok)" : "var(--muted)",
    11,
  );
  T(325, 140, t("sound.draw.volume", { value: st.volume }), "var(--muted)", 10);
  p.add("rect", {
    x: 540,
    y: 76,
    width: 120,
    height: 60,
    rx: 28,
    fill: "var(--surface)",
    stroke: "var(--copper)",
    "stroke-width": 2,
  });
  T(600, 104, t("sound.draw.speaker"), "var(--ink)", 12, 600);
  T(600, 120, t("sound.draw.classic"), "var(--muted)", 10);
  // Sound waves out of the speaker, size = volume.
  if (st.playing)
    for (let i = 0; i < 3; i++) {
      const phase = ((reduce ? 0 : now / 25) + i * 14) % 40;
      const r = 8 + phase * (st.volume / 10);
      p.add("path", {
        d: `M ${664 + r * 0.3} ${106 - r} A ${r} ${r} 0 0 1 ${664 + r * 0.3} ${106 + r}`,
        fill: "none",
        stroke: "var(--copper)",
        opacity: 1 - phase / 40,
      });
    }
  // Links.
  p.add("line", {
    x1: 130,
    y1: 105,
    x2: 280,
    y2: 105,
    stroke: "var(--scope-blue)",
    "stroke-width": 2,
  });
  T(210, 95, "Bluetooth LE · HID", "var(--scope-blue)", 11, 600);
  T(210, 124, t("sound.draw.reports"), "var(--muted)", 10);
  p.add("line", {
    x1: 370,
    y1: 105,
    x2: 540,
    y2: 105,
    stroke: "var(--copper)",
    "stroke-width": 3,
    "stroke-dasharray": st.playing ? "8 5" : "2 6",
    "stroke-dashoffset": st.playing && !reduce ? -now / 30 : 0,
  });
  T(450, 95, "Classic BT · A2DP audio", "var(--copper)", 11, 600);
  T(450, 124, t("sound.draw.rate"), "var(--muted)", 10);
  if (st.anim === "direct") {
    // A path that goes under the phone and stops dead.
    p.add("path", {
      d: "M 75 140 Q 330 230 590 140",
      fill: "none",
      stroke: "var(--danger)",
      "stroke-width": 2,
      "stroke-dasharray": "5 5",
    });
    const f = Math.min(k / 0.6, 1);
    const x = 75 + (590 - 75) * f * 0.55;
    const y = 140 + Math.sin(f * 0.55 * Math.PI) * 70;
    p.add("circle", { cx: x, cy: y, r: 6, fill: "var(--danger)" });
    if (k > 0.6)
      T(
        360,
        214,
        t("sound.draw.fail"),
        "var(--danger)",
        12,
        600,
      );
  } else if (st.anim) {
    const f = Math.min(1, k / 0.4);
    if (f < 1) p.add("circle", { cx: 130 + 160 * f, cy: 105, r: 7, fill: "var(--scope-blue)" });
    T(210, 150, USAGE[st.anim], "var(--scope-blue)", 11);
  }
}
