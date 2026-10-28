// Small labelled controls for the panels' control bars.
import { type ReactNode, type RefObject, useRef } from "react";
import styles from "./panel.module.css";

interface RangeProps {
  label: ReactNode;
  ariaLabel: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** The value as text, shown after the slider. */
  output?: string;
}

export function Range({
  label,
  ariaLabel,
  min,
  max,
  step = 1,
  value,
  onChange,
  output,
}: RangeProps) {
  return (
    <>
      <label>
        {label}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
      {output !== undefined ? <span className={styles.mono}>{output}</span> : null}
    </>
  );
}

interface SelectProps<K extends string> {
  ariaLabel: string;
  value: K;
  options: readonly (readonly [K, string])[];
  onChange: (value: K) => void;
}

export function Select<K extends string>({ ariaLabel, value, options, onChange }: SelectProps<K>) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(options.find(([k]) => k === e.target.value)?.[0] ?? value)}
    >
      {options.map(([k, text]) => (
        <option key={k} value={k}>
          {text}
        </option>
      ))}
    </select>
  );
}

/** A value the frame loop writes (rule 3: React leaves the span empty). */
export function LiveText({ spanRef }: { spanRef: RefObject<HTMLSpanElement | null> }) {
  return <span ref={spanRef} className={styles.mono} aria-live="polite" />;
}

/** A ref to a span the frame loop fills, and a writer that only touches the DOM on change. */
export function useLiveText() {
  const ref = useRef<HTMLSpanElement>(null);
  const write = (text: string) => {
    const node = ref.current;
    if (node && node.textContent !== text) node.textContent = text;
  };
  return [ref, write] as const;
}

export const Spacer = () => <span className={styles.spacer} />;
