import { hx } from "../../protocol/hex";
import type { MidiByte, MidiRole } from "../../protocol/midi";
import type { BleT } from "../../i18n";
import type { SvgPainter } from "../svg";

const COL: Readonly<Record<MidiRole, string>> = {
  header: "var(--copper)",
  ts: "var(--scope-amber)",
  status: "var(--scope-blue)",
  note: "var(--ok)",
  vel: "var(--w-cs)",
  skip: "var(--line)",
};
// Legend rows, labels in the catalogue (packet.legend.<role>).
const LEGEND: readonly Exclude<MidiRole, "skip">[] = ["header", "ts", "status", "note", "vel"];

/** The last BLE-MIDI packet's bytes, revealed left to right (`k` 0..1), and the colour legend. */
export function drawPacket(
  p: SvgPainter,
  bytes: readonly MidiByte[] | null,
  k: number,
  t: BleT,
): void {
  p.clear();
  if (!bytes) {
    p.add(
      "text",
      {
        x: 340,
        y: 100,
        fill: "var(--muted)",
        "text-anchor": "middle",
        "font-size": 18,
        "font-family": "var(--font-body)",
      },
      t("packet.empty"),
    );
    return;
  }
  const w = Math.min(54, 660 / bytes.length);
  bytes.forEach((x, i) => {
    if (i / bytes.length > k) return;
    const bx = 10 + i * w;
    const skip = x.b === null;
    p.add("rect", {
      x: bx,
      y: 30,
      width: w - 4,
      height: 40,
      rx: 5,
      fill: skip ? "none" : COL[x.role],
      stroke: COL[x.role],
      "stroke-dasharray": skip ? "4 3" : "",
    });
    p.add(
      "text",
      {
        x: bx + (w - 4) / 2,
        y: 55,
        fill: skip ? "var(--muted)" : "var(--scope-paper)",
        "text-anchor": "middle",
        "font-size": Math.min(18, w / 2.6),
        "font-family": "var(--font-mono)",
      },
      x.b === null ? "-" : hx(x.b),
    );
  });
  LEGEND.forEach((r, i) => {
    p.add("rect", { x: 10, y: 88 + i * 24, width: 16, height: 16, rx: 3, fill: COL[r] });
    p.add(
      "text",
      {
        x: 34,
        y: 102 + i * 24,
        fill: "var(--ink)",
        "font-size": 16,
        "font-family": "var(--font-body)",
      },
      t(`packet.legend.${r}`),
    );
  });
}
