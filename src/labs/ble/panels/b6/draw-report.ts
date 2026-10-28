import type { BleT } from "../../i18n";
import { hx } from "../../protocol/hex";
import { LAYOUTS } from "../../protocol/keyboard-layout";
import type { SvgPainter } from "../svg";
import type { KeyTrip } from "./key-trip";

const MODS = ["LCtl", "LShf", "LAlt", "LGui", "RCtl", "RShf", "RAlt", "RGui"];

/** One frame of the key's trip: board → 8-byte report → computer, and the two text lines. */
export function drawReport(
  p: SvgPainter,
  trip: KeyTrip,
  k: number,
  text: string,
  now: number,
  t: BleT,
): void {
  const T = (
    x: number,
    y: number,
    s: string,
    fill: string,
    size = 13,
    anchor = "start",
    weight = 400,
  ) =>
    p.add(
      "text",
      {
        x,
        y,
        fill,
        "font-size": size,
        "text-anchor": anchor,
        "font-family": "var(--font-mono)",
        "font-weight": weight,
      },
      s,
    );
  p.clear();
  const box = (x: number, w: number, title: string, sub: string) => {
    p.add("rect", {
      x,
      y: 18,
      width: w,
      height: 110,
      rx: 8,
      fill: "var(--surface)",
      stroke: "var(--line)",
    });
    T(x + 10, 40, title, "var(--ink)", 17, "start", 600);
    T(x + 10, 60, sub, "var(--muted)", 14);
  };
  box(8, 150, t("report.draw.board"), `layout ${trip.board}`);
  box(258, 170, t("report.draw.report"), t("report.draw.overLe"));
  box(
    520,
    152,
    t("report.draw.computer"),
    trip.host === "us" ? t("report.draw.setUs") : t("report.draw.setDe"),
  );
  const cur = trip.cur;
  if (cur) {
    T(83, 100, cur.ch === " " ? "␣" : cur.ch, "var(--copper)", 34, "middle", 700);
    [cur.mod, 0, cur.key, 0, 0, 0, 0, 0].forEach((b, i) => {
      const on = k > 0.25 && b;
      p.add("rect", {
        x: 268 + i * 19.5,
        y: 72,
        width: 17,
        height: 24,
        rx: 3,
        fill: on ? "var(--scope-blue)" : "var(--bg)",
        stroke: "var(--line)",
      });
      T(276.5 + i * 19.5, 89, hx(b), on ? "var(--scope-paper)" : "var(--muted)", 10, "middle");
    });
    const mods = MODS.filter((_, i) => (cur.mod >> i) & 1).join("+");
    T(268, 112, cur.mod ? `mod ${hx(cur.mod)} = ${mods}` : t("report.draw.noShift"), "var(--muted)", 12);
    // The packet flying across.
    const fly = (x0: number, x1: number, a: number, b: number) => {
      const f = Math.min(1, Math.max(0, (k - a) / (b - a)));
      if (f > 0 && f < 1)
        p.add("circle", { cx: x0 + (x1 - x0) * f, cy: 84, r: 6, fill: "var(--scope-blue)" });
    };
    fly(160, 258, 0.05, 0.25);
    fly(430, 520, 0.45, 0.7);
    if (k > 0.7)
      T(596, 104, cur.out, cur.out === cur.ch ? "var(--ok)" : "var(--danger)", 34, "middle", 700);
    T(
      596,
      122,
      k > 0.7 ? `key ${hx(cur.key)}${cur.mod & 2 ? " + Shift" : ""}` : "",
      "var(--muted)",
      13,
      "middle",
    );
  }
  // The two lines: what we meant, what appeared.
  T(8, 160, t("report.draw.typed"), "var(--muted)", 14);
  T(8, 184, text, "var(--ink)", 22);
  const meant = [...text]
    .filter((c) => LAYOUTS.char[trip.board][c])
    .join("")
    .slice(0, trip.typed.length);
  T(8, 210, t("report.draw.shows"), "var(--muted)", 14);
  T(
    8,
    236,
    trip.typed + (Math.floor(now / 500) % 2 ? "▏" : ""),
    trip.typed === meant ? "var(--ink)" : "var(--danger)",
    22,
  );
}
