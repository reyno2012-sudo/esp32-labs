import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WidgetProps } from "@/widgets/types";
import { Fft } from "../../model/fft";
import { gauss } from "../../model/random";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range, Select } from "../controls";
import { drawFftExplainer, FFT_RATE } from "./fft-draw";

type Size = "256" | "512" | "1024";
const SIZES: readonly (readonly [Size, string])[] = [
  ["256", "256"],
  ["512", "512"],
  ["1024", "1024"],
];
const AMPS: readonly number[] = [12000, 7000, 4000];

/** S5 panel: build a sound, see its spectrum. */
export function SoundFftExplainer(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [tones, setTones] = useState<readonly number[]>([1000, 0, 0]);
  const [noise, setNoise] = useState(5);
  const [size, setSize] = useState<Size>("512");
  const [windowed, setWindowed] = useState(true);
  const fftRef = useRef<Fft | null>(null);
  const phases = useRef([0, 0, 0]);

  const setTone = (i: number, hz: number) =>
    setTones((prev) => prev.map((f, k) => (k === i ? hz : f)));

  return (
    <CanvasPanel
      h={330}
      label={tr("fft.label")}
      controls={
        <>
          {tones.map((f, i) => (
            <Range
              key={i}
              label={tr("fft.tone", { n: i + 1 })}
              ariaLabel={tr("fft.toneLabel", { n: i + 1 })}
              min={0}
              max={7900}
              step={10}
              value={f}
              onChange={(v) => setTone(i, v)}
              output={f ? `${f} Hz` : tr("fft.off")}
            />
          ))}
          <Range
            label={tr("fft.noise")}
            ariaLabel={tr("fft.noiseLabel")}
            min={0}
            max={100}
            value={noise}
            onChange={setNoise}
          />
          <Select ariaLabel={tr("fft.size")} value={size} options={SIZES} onChange={setSize} />
          <label>
            <input
              type="checkbox"
              checked={windowed}
              onChange={(e) => setWindowed(e.target.checked)}
            />{" "}
            {tr("fft.hann")}
          </label>
        </>
      }
      caption={
        windowed ? tr("fft.caption.windowed") : tr("fft.caption.raw")
      }
      onFrame={({ g, C, dt, reduce }) => {
        const n = Number(size);
        if (fftRef.current?.n !== n) fftRef.current = new Fft(n);
        const fft = fftRef.current;
        const ph = phases.current;
        const s = new Float32Array(n);
        const amount = noise / 100;
        for (let i = 0; i < n; i++) {
          let v = gauss() * 2000 * amount;
          tones.forEach((f, k) => {
            if (f) v += (AMPS[k] ?? 0) * Math.sin((ph[k] ?? 0) + (2 * Math.PI * f * i) / FFT_RATE);
          });
          s[i] = v;
        }
        if (!reduce)
          phases.current = ph.map((p, k) => p + 2 * Math.PI * (tones[k] ?? 0) * dt * 0.02);
        fft.run(s, windowed);
        drawFftExplainer(g, C, fft, s, windowed, tones.some(Boolean), tr);
      }}
    />
  );
}
