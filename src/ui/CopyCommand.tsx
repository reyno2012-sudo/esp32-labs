import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "@/lib/clipboard";
import styles from "./CopyCommand.module.css";

type CopyState = "idle" | "copied" | "selected";

/** A shell command with a copy button. Falls back to selecting the text. */
export function CopyCommand({ command, compact = false }: { command: string; compact?: boolean }) {
  const [state, setState] = useState<CopyState>("idle");
  const { t } = useTranslation();
  const codeRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    const result = await copyText(command, codeRef.current);
    setState(result);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1400);
  }

  return (
    <div className={`${styles.cmd} ${compact ? styles.compact : ""}`} dir="ltr">
      <code ref={codeRef}>{command}</code>
      <button type="button" onClick={copy} aria-label={t("ui.copy.label", { command })}>
        <span aria-live="polite">{t(`ui.copy.${state}`)}</span>
      </button>
    </div>
  );
}
