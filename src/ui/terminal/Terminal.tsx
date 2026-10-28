import {
  type FormEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import styles from "./Terminal.module.css";
import { TerminalLog } from "./terminal-log";

/** One serial monitor per simulator instance, stable for the component's life. */
export function useTerminalLog(): TerminalLog {
  const [log] = useState(() => new TerminalLog());
  return log;
}

interface TerminalProps {
  log: TerminalLog;
  /** The command that opened this monitor, shown in the title bar. */
  title: string;
  /** When set, the monitor has an input line; each submitted line is passed here. */
  onCommand?: (line: string) => void;
  /** Visible height in lines (default 230 px worth). */
  height?: number;
}

/** A simulated serial monitor: time-stamped, colour-coded lines and an optional input. */
export function Terminal({ log, title, onCommand, height }: TerminalProps) {
  const lines = useSyncExternalStore(log.subscribe, log.getSnapshot, log.getSnapshot);
  const outRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const { t } = useTranslation();

  // Follow the newest line, like a real monitor.
  useLayoutEffect(() => {
    const out = outRef.current;
    if (out) out.scrollTop = out.scrollHeight;
  }, [lines]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const line = draft.trim();
    setDraft("");
    if (line) onCommand?.(line);
  }

  return (
    <div className={styles.term} dir="ltr">
      <div className={styles.bar}>
        <span>{title}</span>
        <span>115200 baud</span>
      </div>
      {/* Scrollable region: focusable so keyboard users can scroll it. */}
      <div
        ref={outRef}
        className={styles.out}
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- focusable so keyboard users can reach it
        tabIndex={0}
        role="log"
        aria-label={t("ui.terminal.label")}
        style={height ? { height } : undefined}
      >
        {lines.map((l) => (
          <div key={l.id}>
            <span className={styles.ts}>{l.stamp} &gt; </span>
            <span className={styles[l.tone]}>{l.text}</span>
          </div>
        ))}
      </div>
      {onCommand ? (
        <form className={styles.input} onSubmit={submit}>
          <label htmlFor={inputId} aria-hidden="true">
            &gt;
          </label>
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            placeholder={t("ui.terminal.placeholder")}
            aria-label={t("ui.terminal.command")}
          />
        </form>
      ) : null}
    </div>
  );
}
