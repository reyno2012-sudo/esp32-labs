import { useTranslation } from "react-i18next";
import { useLocaleInfo } from "@/i18n/use-locale";
import { classifyPin, HEADER, pinIndex, pinLabel, type PinClass } from "@/domain/board";
import type { PinSide, PinUse } from "@/domain/lesson";
import { useRgbState } from "./board-signals";
import { roleFill } from "./pin-colour";
import styles from "./BoardPinout.module.css";

// Geometry of the DevKitC drawing (viewBox 440×640): board body, pin rows, role tags.
const BX = 140;
const BW = 160;
const PY0 = 96;
const PSTEP = 22;
const TAG_W = 50;
const TAG_H = 18;
const LABEL_CHAR_W = 6.3; // IBM Plex Mono at 10.5px

const pinPos = (side: PinSide, i: number) => ({
  x: side === "L" ? BX + 12 : BX + BW - 12,
  y: PY0 + i * PSTEP,
});

const PAD_FILL: Record<PinClass, string> = {
  safe: "var(--pad)",
  avoid: "var(--danger)",
  power: "var(--power)",
  gnd: "var(--gnd)",
};

interface BoardPinoutProps {
  pins: readonly PinUse[];
  /** The COM port is in use (serial monitor). */
  usb: boolean;
  /** The BOOT button is part of the lesson. */
  boot: boolean;
}

/** The ESP32-S3 DevKitC as a live pinout: pins the lesson uses are tagged with their role. */
export function BoardPinout({ pins, usb, boot }: BoardPinoutProps) {
  const used = new Map(pins.map((u) => [`${u.side}${pinIndex(u)}`, u]));
  const { t } = useTranslation();
  const { tag } = useLocaleInfo();
  const uses = new Intl.ListFormat(tag, { type: "unit" }).format(
    pins.map((p) => t("board.pinout.use", { role: p.role, pin: p.pin })),
  );

  return (
    <svg
      className={styles.board}
      viewBox="0 0 440 640"
      // The board has a physical left and right: it never mirrors.
      direction="ltr"
      role="img"
      aria-labelledby="board-title board-desc"
    >
      <title id="board-title">{t("board.pinout.title")}</title>
      <desc id="board-desc">
        {pins.length ? t("board.pinout.uses", { uses }) : t("board.pinout.none")}
      </desc>
      <rect
        x={BX}
        y={20}
        width={BW}
        height={600}
        rx={10}
        fill="var(--pcb)"
        stroke="var(--pcb-edge)"
        strokeWidth={2}
      />
      {/* Module and antenna */}
      <rect x={BX + 32} y={30} width={BW - 64} height={150} rx={4} fill="var(--pcb-edge)" />
      <rect
        x={BX + 40}
        y={64}
        width={BW - 80}
        height={108}
        rx={3}
        fill="var(--silk-dim)"
        opacity={0.35}
      />
      <path
        d={`M${BX + 44} 52 h12 v-12 h12 v12 h12 v-12 h12 v12 h12 v-12 h8`}
        fill="none"
        stroke="var(--pad)"
        strokeWidth={2}
      />
      <text x={BX + BW / 2} y={112} textAnchor="middle" className={styles.silk}>
        ESP32-S3
      </text>
      <text x={BX + BW / 2} y={126} textAnchor="middle" className={styles.silk}>
        WROOM-1 N16R8
      </text>

      {/* BOOT and RST buttons */}
      {(["BOOT", "RST"] as const).map((name) => {
        const x = name === "BOOT" ? BX + 34 : BX + BW - 34;
        const lit = name === "BOOT" && boot;
        return (
          <g key={name}>
            <rect x={x - 12} y={548} width={24} height={16} rx={3} fill="var(--pcb-edge)" />
            <circle
              cx={x}
              cy={556}
              r={lit ? 7 : 5}
              fill={lit ? "var(--copper)" : "var(--silk-dim)"}
            />
            <text x={x} y={576} textAnchor="middle" className={styles.silk}>
              {name}
            </text>
          </g>
        );
      })}

      <RgbLed cx={BX + BW / 2 + 30} cy={470} />
      <text x={BX + BW / 2 + 30} y={492} textAnchor="middle" className={styles.silk}>
        RGB
      </text>

      {/* USB ports: COM lights up when the lesson talks over serial */}
      <rect x={BX + 28} y={596} width={40} height={28} rx={6} fill="var(--silk-dim)" />
      <rect
        x={BX + BW - 68}
        y={596}
        width={40}
        height={28}
        rx={6}
        fill={usb ? "var(--copper)" : "var(--silk-dim)"}
      />
      <text x={BX + 48} y={590} textAnchor="middle" className={styles.silk}>
        USB
      </text>
      <text x={BX + BW - 48} y={590} textAnchor="middle" className={styles.silk}>
        COM
      </text>

      {(["L", "R"] as const).map((side) =>
        HEADER[side].map((pin, i) => {
          const { x, y } = pinPos(side, i);
          const use = used.get(`${side}${i}`);
          const label = pinLabel(pin);
          const labelX = side === "L" ? BX - 8 : BX + BW + 8;
          return (
            <g key={`${side}${i}`}>
              <circle
                cx={x}
                cy={y}
                r={use ? 8 : 6}
                fill={PAD_FILL[classifyPin(pin)]}
                stroke={use ? "var(--copper)" : "var(--pcb)"}
                strokeWidth={use ? 3 : 2}
              />
              <text
                x={labelX}
                y={y + 3.5}
                textAnchor={side === "L" ? "end" : "start"}
                className={`${styles.pinLabel} ${use ? styles.used : ""}`}
              >
                {label}
              </text>
              {use ? <RoleTag side={side} y={y} label={label} use={use} /> : null}
            </g>
          );
        }),
      )}
    </svg>
  );
}

function RoleTag({
  side,
  y,
  label,
  use,
}: {
  side: PinSide;
  y: number;
  label: string;
  use: PinUse;
}) {
  const fill = roleFill(use.kind);
  const gx = side === "L" ? 8 : 440 - 8 - TAG_W;
  const labelW = label.length * LABEL_CHAR_W;
  const x1 = side === "L" ? gx + TAG_W : gx;
  const x2 = side === "L" ? BX - 8 - labelW - 6 : BX + BW + 8 + labelW + 6;
  return (
    <g>
      <rect x={gx} y={y - TAG_H / 2} width={TAG_W} height={TAG_H} rx={4} fill={fill} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={fill} strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={gx + TAG_W / 2} y={y + 3.8} textAnchor="middle" className={styles.role}>
        {use.role}
      </text>
    </g>
  );
}

/** The on-board WS2812: simulators drive it through board signals. */
function RgbLed({ cx, cy }: { cx: number; cy: number }) {
  const rgb = useRgbState();
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7 * (rgb?.scale ?? 1)}
      fill={rgb?.color ?? "var(--silk-dim)"}
      stroke="var(--pcb-edge)"
      strokeWidth={2}
      style={rgb?.glow ? { filter: `drop-shadow(0 0 6px ${rgb.color})` } : undefined}
    />
  );
}
