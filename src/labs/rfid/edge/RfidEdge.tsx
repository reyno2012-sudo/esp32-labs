import { useId, useState } from "react";
import { createPersistentStore, useStore } from "@/lib/storage";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import { CopyCommand } from "@/ui/CopyCommand";
import type { WidgetProps } from "@/widgets/types";
import { overEnglish } from "../text/over-english";
import { TREE, useRfidText } from "../text/use-rfid-text";
import { BarChart } from "./BarChart";
import type { EdgeWords } from "./edge-words";
import { cleanMonitor, EDGE } from "./edge-data";
import styles from "./edge.module.css";

// Your pasted tables, per experiment (same key as the original guide, so they carry over).
const pastes = createPersistentStore<Readonly<Record<string, string>>>("esp-rfid-edge", {});

/** R6 panel: one tab per experiment, the example result, and your own pasted table. */
export function RfidEdge(_: WidgetProps) {
  const { t, en } = useRfidText();
  const words: Readonly<Record<string, EdgeWords>> = overEnglish(
    en("edge.experiments", TREE),
    t("edge.experiments", TREE),
  );
  const [i, setI] = useState(0);
  const saved = useStore(pastes);
  const pasteId = useId();
  const e = EDGE[i] ?? EDGE[0];
  if (!e) return null;
  const text = saved[e.key] ?? "";
  const mine = text.trim() ? e.parse(cleanMonitor(text)) : [];
  const w = words[e.key];
  if (!w) return null;
  const source = mine.length
    ? t("edge.solid", { count: mine.length })
    : text.trim()
      ? t("edge.noRows")
      : t("edge.example");

  return (
    <div>
      <ChoiceGroup
        className={styles.tabs}
        label={t("edge.tabs")}
        value={i}
        onChange={setI}
        choices={EDGE.map((x, k) => ({ key: k, label: words[x.key]?.label ?? x.label }))}
      />
      <div className={styles.body}>
        <h4>{w.label}</h4>
        <p>{w.what}</p>
        <CopyCommand command={e.cmd} />
        <BarChart e={e} words={w} mine={mine} />
        <p className={styles.src} aria-live="polite">
          {source}
        </p>
        <p>{w.look}</p>
        <div className={styles.paste}>
          <label className={styles.src} htmlFor={pasteId}>
            {t("edge.paste")}
          </label>
          <textarea
            id={pasteId}
            spellCheck={false}
            placeholder={t("edge.placeholder")}
            value={text}
            onChange={(ev) => {
              const value = ev.target.value;
              pastes.set((prev) => ({ ...prev, [e.key]: value }));
            }}
          />
        </div>
      </div>
    </div>
  );
}
