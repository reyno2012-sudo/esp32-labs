/* eslint-disable i18next/no-literal-string -- literal text here is register names, not interface text. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { hx } from "../protocol/bytes";
import { BIT_NAMES, bitCaption, type Fault, FAULTS, REGS, spiFrame } from "../protocol/spi";
import styles from "./panels.module.css";
import { useStepper } from "./use-stepper";

const X0 = 96;
const BW = (660 - X0) / 16;
const ROWS = { SDA: 40, SCK: 86, MOSI: 132, MISO: 178 } as const;
const INK = "var(--term-ink)";
const DIM = "var(--term-dim)";
const hi = (y: number) => y - 12;
const lo = (y: number) => y + 12;
const pts = (list: readonly (readonly [number, number])[]) =>
  list.map((p) => p.join(",")).join(" ");

/** A digital trace: one level per bit, `from` bits in. */
function dataLine(y: number, bits: readonly number[], from = 0) {
  return pts(
    bits.flatMap((b, i) => {
      const x = X0 + (i + from) * BW;
      const yy = b ? hi(y) : lo(y);
      return [
        [x, yy],
        [x + BW, yy],
      ] as const;
    }),
  );
}

// SCK: mode 0, idle low, rising edge in the middle of each bit.
const SCK = pts([
  [X0 - 30, lo(ROWS.SCK)],
  ...Array.from({ length: 16 }, (_, i) => {
    const x = X0 + i * BW;
    return [
      [x + BW * 0.25, lo(ROWS.SCK)],
      [x + BW * 0.25, hi(ROWS.SCK)],
      [x + BW * 0.75, hi(ROWS.SCK)],
      [x + BW * 0.75, lo(ROWS.SCK)],
    ] as const;
  }).flat(),
  [670, lo(ROWS.SCK)],
]);

/** R1 panel: one SPI register read or write, bit by bit, as a logic analyser shows it. */
export function RfidSpi(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-rfid");
  const [reg, setReg] = useState(0);
  const [read, setRead] = useState(true);
  const [fault, setFault] = useState<Fault>("none");
  const { step: bit, playing, togglePlay, back, next } = useStepper(16, 700);
  const r = REGS[reg] ?? REGS[0];
  if (!r) return null;
  const f = spiFrame(r, read, fault);
  const caption = bitCaption(f, bit);
  // SS: low during the 16 bits (unless its wire is loose).
  const ssY = f.fault !== "ss" ? lo(ROWS.SDA) : hi(ROWS.SDA);
  const end = X0 + 16 * BW + 8;
  const t = (x: number, y: number, s: string, fill: string, size: number, anchor?: "middle") => (
    <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} className={styles.laText}>
      {s}
    </text>
  );

  return (
    <div className={styles.wd}>
      <div className={styles.ctl}>
        <select
          className={styles.select}
          aria-label={tr("spi.register")}
          value={reg}
          onChange={(e) => setReg(Number(e.target.value))}
        >
          {REGS.map((x, i) => (
            <option key={x.name} value={i}>
              {x.name} ({hx(x.a)}h)
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label={tr("spi.readOrWrite")}
          value={read ? "r" : "w"}
          onChange={(e) => setRead(e.target.value === "r")}
        >
          <option value="r">{tr("spi.read")}</option>
          <option value="w">{tr("spi.write")}</option>
        </select>
        <select
          className={styles.select}
          aria-label={tr("spi.fault")}
          value={fault}
          onChange={(e) => setFault(e.target.value as Fault)}
        >
          {FAULTS.map((k) => (
            <option key={k} value={k}>
              {tr(`spi.faults.${k}`)}
            </option>
          ))}
        </select>
        <Button onClick={back} aria-label={tr("spi.prevBit")}>
          ◀
        </Button>
        <Button onClick={togglePlay} aria-label={playing ? tr("spi.pause") : tr("spi.play")}>
          {playing ? "❚❚" : tr("spi.playShort")}
        </Button>
        <Button onClick={next} aria-label={tr("spi.nextBit")}>
          ▶
        </Button>
      </div>
      <div className={styles.la}>
        <div className={styles.laScroll} dir="ltr">
          <svg
            viewBox="0 0 680 230"
            role="img"
            aria-label={tr("spi.diagram")}
          >
            {Object.entries(ROWS).map(([n, y]) => (
              <g key={n}>{t(8, y + 4, n === "SDA" ? "SDA (SS)" : n, DIM, 12)}</g>
            ))}
            <polyline
              points={pts([
                [X0 - 30, hi(ROWS.SDA)],
                [X0 - 8, hi(ROWS.SDA)],
                [X0 - 8, ssY],
                [end, ssY],
                [end, hi(ROWS.SDA)],
                [670, hi(ROWS.SDA)],
              ])}
              fill="none"
              stroke="var(--scope-amber)"
              strokeWidth={2}
            />
            <polyline points={SCK} fill="none" stroke="var(--scope-trace)" strokeWidth={2} />
            <polyline
              points={dataLine(ROWS.MOSI, f.mosi)}
              fill="none"
              stroke="var(--scope-coral)"
              strokeWidth={2}
            />
            {/* MISO: don't-care during the address byte, the answer during the second (read only). */}
            <rect
              x={X0}
              y={ROWS.MISO - 12}
              width={8 * BW}
              height={24}
              fill="var(--scope-dim)"
              opacity={0.7}
            />
            {t(X0 + 4 * BW, ROWS.MISO + 4, tr("spi.dontCare"), DIM, 11, "middle")}
            {f.read ? (
              <polyline
                points={dataLine(ROWS.MISO, f.miso, 8)}
                fill="none"
                stroke="var(--w-sda)"
                strokeWidth={2}
              />
            ) : (
              t(X0 + 12 * BW, ROWS.MISO + 4, tr("spi.dontCareWrite"), DIM, 11, "middle")
            )}
            {BIT_NAMES.map((n, i) => {
              const x = X0 + i * BW + BW / 2;
              return (
                <g key={n}>
                  {t(x, ROWS.MOSI - 18, n, i === bit ? "var(--scope-amber)" : DIM, 10, "middle")}
                  {t(x, ROWS.MOSI + 28, String(f.mosi[i]), INK, 10.5, "middle")}
                  {i >= 8 && f.read
                    ? t(x, ROWS.MISO + 28, String(f.miso[i - 8]), INK, 10.5, "middle")
                    : null}
                </g>
              );
            })}
            <rect
              x={X0 + bit * BW}
              y={22}
              width={BW}
              height={186}
              fill="var(--scope-amber)"
              opacity={0.14}
            />
            <line
              x1={X0 + 8 * BW}
              x2={X0 + 8 * BW}
              y1={22}
              y2={214}
              stroke={DIM}
              strokeDasharray="3 3"
            />
            {t(X0 + 4 * BW, 222, tr("spi.byte0", { hex: hx(f.addr) }), INK, 11, "middle")}
            {t(
              X0 + 12 * BW,
              222,
              f.read
                ? tr("spi.byte1Miso", { hex: hx(f.answer) })
                : tr("spi.byte1Mosi", { hex: hx(f.data) }),
              INK,
              11,
              "middle",
            )}
          </svg>
        </div>
        <p aria-live="polite">
          <span className={styles.k}>{tr(`spi.bits.${caption.id}.key`)}</span>{" "}
          {tr(`spi.bits.${caption.id}.text`, { ...caption.values, what: tr(`spi.regs.${r.name}`) })}
        </p>
      </div>
    </div>
  );
}
