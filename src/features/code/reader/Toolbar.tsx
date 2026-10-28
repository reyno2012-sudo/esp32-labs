import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { settingsStore } from "@/features/settings/settings-store";
import { useEnvProgress } from "../code-progress";
import { FilePicker } from "../FilePicker";
import { type CodeFile, understood } from "../lab-code";
import { UnderstandingRing } from "../UnderstandingRing";
import { modesFor } from "./modes";
import { useReader } from "./reader-context";
import styles from "./reader.module.css";

/**
 * The reader's top row: the way back to the lab (always first), the file, how to read (Tour,
 * Story, Explore), and the view switch. The Full view adds progress, level and focus.
 */
export function Toolbar({
  file,
  onPickFile,
}: {
  file: CodeFile;
  onPickFile: (path: string) => void;
}) {
  const { t } = useTranslation("code");
  const { t: ts } = useTranslation("settings");
  const reader = useReader();
  const { lab, settings, simple } = reader;
  const progress = useEnvProgress(lab.env);
  const reading = understood(lab, progress);
  return (
    <div className={styles.toolbar}>
      <Link to={reader.lessonHref} className={styles.back}>
        <span aria-hidden="true">←</span>{" "}
        <Trans
          t={t}
          i18nKey="toolbar.back"
          components={{ wide: <span className={styles.wide} /> }}
        />
      </Link>
      {simple ? (
        <span className={styles.fileName} title={file.path}>
          {file.name}
        </span>
      ) : (
        <FilePicker
          files={lab.files}
          current={file.path}
          level={settings.level}
          readStops={new Set(progress.stops)}
          onPick={onPickFile}
        />
      )}
      <div className={styles.modes} role="group" aria-label={t("toolbar.howToRead")}>
        {modesFor(simple).map((m) => (
          <button
            key={m.id}
            type="button"
            title={t(`modes.${m.id}.hint`)}
            aria-pressed={reader.mode === m.id}
            onClick={() => reader.switchMode(m.id)}
          >
            {t(`modes.${m.id}.label`)}
          </button>
        ))}
      </div>
      <div className={styles.tools}>
        {!simple ? (
          <>
            <UnderstandingRing
              ratio={reading.ratio}
              size={34}
              label={t("toolbar.progress")}
            />
            <Link
              to="/settings"
              className={`${styles.level} ${styles.wide}`}
              title={t("toolbar.levelTitle")}
            >
              {ts(`levels.${settings.level}.label`)}
            </Link>
          </>
        ) : null}
        <button
          type="button"
          className={styles.icon}
          title={
simple ? t("toolbar.moreToolsTitle") : t("toolbar.simpleViewTitle")
          }
          onClick={() => settingsStore.change("view", simple ? "full" : "simple")}
        >
          {simple ? t("toolbar.moreTools") : t("toolbar.simpleView")}
        </button>
        <button
          type="button"
          className={styles.icon}
          aria-pressed={reader.focus}
          onClick={reader.toggleFocus}
          aria-label={reader.focus ? t("toolbar.exitFocus") : t("toolbar.focusLabel")}
          title={t("toolbar.focusTitle")}
        >
          <span aria-hidden="true">{reader.focus ? "✕" : "⤢"}</span>
          <span className={styles.wide}>
            {" "}
            {reader.focus ? t("toolbar.exitFocus") : t("toolbar.focus")}
          </span>
        </button>
      </div>
    </div>
  );
}
