import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleInfo } from "@/i18n/use-locale";
import { useFrameLoop } from "@/lib/animation";
import { context2d } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { ScopeCaption } from "./parts";
import {
  type AnalyzerLabels,
  analyzerPalette,
  type CaptionLine,
  drawAnalyzer,
  MS_PER_SLOT,
  SLOTS,
  type SlotCaption,
  slotCaption,
  STILL_SLOT,
} from "./spi-analyzer";
import styles from "./wiring.module.css";


/** The two caption lines for a slot, worded in the reader's language. */
function captionLines(c: SlotCaption, t: TFunction<"labs-display">): readonly CaptionLine[] {
  switch (c.kind) {
    case "bit":
      return [
        [
          c.byte.dc
            ? t("analyzer.bitData", { bit: c.k })
            : t("analyzer.bitCommand", { bit: c.k }),
          ` ${c.bit}`,
        ],
        [`${c.byte.label}:`, ` ${t(`analyzer.notes.${c.byte.note}`)}`],
      ];
    case "ignored":
      return [
        [t("analyzer.csHigh"), ` ${t("analyzer.ignored")}`],
        [t("analyzer.still"), ""],
      ];
    case "listening":
      return [
        [t("analyzer.csLow"), ` ${t("analyzer.listening")}`],
        [t("analyzer.switching"), ""],
      ];
  }
}

/** Lesson 03 "Signals": a logic analyzer replaying one SPI transfer, bit by bit. */
export function LogicAnalyzer() {
  const { t } = useTranslation("labs-display");
  const { dir } = useLocaleInfo();
  const labels: AnalyzerLabels = { data: t("analyzer.data"), cmd: t("analyzer.cmd"), dir };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const t0 = useRef(0);
  const [slot, setSlot] = useState(STILL_SLOT);

  useEffect(() => {
    t0.current = performance.now();
  }, []);

  useFrameLoop(canvasRef, ({ now }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = reduce ? STILL_SLOT : ((now - t0.current) / MS_PER_SLOT) % SLOTS.length;
    drawAnalyzer(context2d(canvas), analyzerPalette(), pos, labels);
    setSlot(Math.min(SLOTS.length - 1, Math.floor(pos)));
  });

  return (
    <div className={styles.la}>
      <canvas
        ref={canvasRef}
        width="680"
        height="200"
        role="img"
        aria-label={t("analyzer.aria")}
        dir="ltr"
      />
      <ScopeCaption lines={captionLines(slotCaption(SLOTS[slot]), t)} />
    </div>
  );
}
