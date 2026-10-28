import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "@/features/settings/settings";
import styles from "./FilePicker.module.css";
import type { CodeFile } from "./lab-code";

/**
 * The lab's files: its own first, then the shared library code "behind the scenes" (folded away
 * for beginners, so the first view is never more than a few files).
 */
export function FilePicker({
  files,
  current,
  level,
  readStops,
  onPick,
}: {
  files: readonly CodeFile[];
  current: string;
  level: Level;
  readStops: ReadonlySet<string>;
  onPick: (path: string) => void;
}) {
  const { t } = useTranslation("code");
  const [open, setOpen] = useState(false);
  const [showShared, setShowShared] = useState(level !== "beginner");
  const own = files.filter((f) => f.role === "lab");
  const shared = files.filter((f) => f.role === "shared");
  const index = Math.max(
    0,
    files.findIndex((f) => f.path === current),
  );
  const file = files[index];
  const pick = (path: string) => {
    onPick(path);
    setOpen(false);
  };
  const row = (f: CodeFile) => {
    const done = f.stops.filter((s) => readStops.has(s.id)).length;
    return (
      <li key={f.path}>
        <button
          type="button"
          aria-current={f.path === current ? "true" : undefined}
          onClick={() => pick(f.path)}
        >
          <span className={styles.name}>{f.name}</span>
          <span className={styles.meta}>
            {f.stops.length
              ? t("files.linesAndStops", { lines: f.codeLineCount, done, count: f.stops.length })
              : t("files.lines", { count: f.codeLineCount })}
          </span>
          <span className={styles.bar} aria-hidden="true">
            <span style={{ width: `${f.stops.length ? (done / f.stops.length) * 100 : 0}%` }} />
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="file-list"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.icon} aria-hidden="true">
          ▤
        </span>
        <span className={styles.current}>{file?.name ?? t("files.toggle")}</span>
        <span className={styles.count}>
          {t("files.position", { index: index + 1, count: files.length })}
        </span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div id="file-list" className={styles.list}>
          <p className={styles.group}>{t("files.thisLab")}</p>
          <ul>{own.map(row)}</ul>
          {shared.length ? (
            <>
              <button
                type="button"
                className={styles.groupToggle}
                aria-expanded={showShared}
                onClick={() => setShowShared((s) => !s)}
              >
                {t("files.shared", { count: shared.length })}{" "}
                {showShared ? "▴" : "▾"}
              </button>
              {showShared ? (
                <>
                  <p className={styles.groupNote}>{t("files.sharedNote")}</p>
                  <ul>{shared.map(row)}</ul>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
