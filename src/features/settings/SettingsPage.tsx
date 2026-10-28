import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/use-locale";
import { analyze } from "@/domain/code/analyze";
import { codeProgress, useAllProgress, useMetWords } from "@/features/code/code-progress";
import { CodeView } from "@/features/code/CodeView";
import { codeContentQuery } from "@/features/code/content-query";
import type { CodeFile } from "@/features/code/lab-code";
import { ThemeSwitch } from "@/features/theme/ThemeSwitch";
import { createLogger } from "@/lib/logger";
import { MOTION_CHOICES, motionStore, useMotionChoice } from "@/lib/motion";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import { Switch } from "@/ui/Switch";
import { LEVELS, type Settings, VIEWS } from "./settings";
import { settingsStore, useSettings } from "./settings-store";
import styles from "./SettingsPage.module.css";

const log = createLogger("settings");

// A tiny program to preview the code settings on: the shape every lab starts from.
const SAMPLE = `// Blink: the hello world of boards.
#include <Arduino.h>

constexpr uint8_t kLed = 4;  // the LED's pin

void setup() {
  pinMode(kLed, OUTPUT);  // this pin drives
}

void loop() {
  digitalWrite(kLed, HIGH);  // on
  delay(500);
  digitalWrite(kLed, LOW);   // off
  delay(500);
}
`;
const sampleAnalysis = analyze(SAMPLE);
const SAMPLE_FILE: CodeFile = {
  path: "sample/blink.cpp",
  name: "blink.cpp",
  role: "lab",
  group: "sample",
  analysis: sampleAnalysis,
  stops: [],
  codeLineCount: 9,
};

// The choices in order; their labels are in settings.json.
const HINTS = ["pop", "underline", "off"] as const satisfies readonly Settings["hints"][];
const SIZES = ["s", "m", "l"] as const satisfies readonly Settings["codeSize"][];
const PACES = ["slow", "normal", "fast"] as const satisfies readonly Settings["pace"][];

/** Everything you can tune, grouped by what it changes, with a live preview of the code view. */
export function SettingsPage() {
  const { t } = useTranslation("settings");
  const settings = useSettings();
  const motion = useMotionChoice();
  const { data: content } = useSuspenseQuery(codeContentQuery(useLocale()));
  const met = useMetWords();
  const progress = useAllProgress();
  const set =
    <K extends keyof Settings>(key: K) =>
    (value: Settings[K]) =>
      settingsStore.change(key, value);
  const [preview, setPreview] = useState<number | null>(null);
  const metCount = Object.keys(met).length;
  const labsRead = Object.values(progress).filter((p) => p.stops.length > 0).length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("page.eyebrow")}</p>
        <h2 className={styles.title}>{t("page.heading")}</h2>
        <p className={styles.lead}>{t("page.lead")}</p>
      </header>

      <section className={styles.section} aria-labelledby="set-level">
        <h3 id="set-level" className={styles.h}>
          {t("levels.heading")}
        </h3>
        <div className={styles.levels} role="radiogroup" aria-labelledby="set-level">
          {LEVELS.map((level, i) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={settings.level === level}
              className={styles.level}
              onClick={() => set("level")(level)}
            >
              <span className={styles.steps} aria-hidden="true">
                {LEVELS.map((l, k) => (
                  <span key={l} data-on={k <= i || undefined} />
                ))}
              </span>
              <span className={styles.levelName}>{t(`levels.${level}.label`)}</span>
              <span className={styles.levelBlurb}>{t(`levels.${level}.blurb`)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="set-view">
        <h3 id="set-view" className={styles.h}>
          {t("views.heading")}
        </h3>
        <div className={styles.views} role="radiogroup" aria-labelledby="set-view">
          {VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              role="radio"
              aria-checked={settings.view === view}
              className={styles.level}
              onClick={() => set("view")(view)}
            >
              <span className={styles.sketch} data-view={view} aria-hidden="true">
                <span className={styles.sketchBar} />
                <span className={styles.sketchCode} />
                <span className={styles.sketchSide} />
                <span className={styles.sketchFoot} />
              </span>
              <span className={styles.levelName}>{t(`views.${view}.label`)}</span>
              <span className={styles.levelBlurb}>{t(`views.${view}.blurb`)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.columns}>
        <div className={styles.stack}>
          <section className={styles.section} aria-labelledby="set-learn">
            <h3 id="set-learn" className={styles.h}>
              {t("learning.heading")}
            </h3>
            <Switch
              label={t("learning.guessFirst")}
              hint={t("learning.guessFirstHint")}
              checked={settings.guessFirst}
              onChange={set("guessFirst")}
            />
            <div className={styles.field}>
              <span className={styles.fieldLabel} id="hints-label">
                {t("learning.hints")}
              </span>
              <span className={styles.fieldHint}>{t("learning.hintsHint")}</span>
              <ChoiceGroup
                label={t("learning.hints")}
                value={settings.hints}
                onChange={set("hints")}
                choices={HINTS.map((key) => ({ key, label: t(`learning.hintChoices.${key}`) }))}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t("learning.pace")}</span>
              <span className={styles.fieldHint}>{t("learning.paceHint")}</span>
              <ChoiceGroup
                label={t("learning.pace")}
                value={settings.pace}
                onChange={set("pace")}
                choices={PACES.map((key) => ({ key, label: t(`learning.paces.${key}`) }))}
              />
            </div>
          </section>

          <section className={styles.section} aria-labelledby="set-code">
            <h3 id="set-code" className={styles.h}>
              {t("code.heading")}
            </h3>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t("code.size")}</span>
              <ChoiceGroup
                label={t("code.sizeLabel")}
                value={settings.codeSize}
                onChange={set("codeSize")}
                choices={SIZES.map((key) => ({ key, label: t(`code.sizes.${key}`) }))}
              />
            </div>
            <Switch
              label={t("code.lineNumbers")}
              checked={settings.lineNumbers}
              onChange={set("lineNumbers")}
            />
            <Switch
              label={t("code.wrap")}
              hint={t("code.wrapHint")}
              checked={settings.wrap}
              onChange={set("wrap")}
            />
            <Switch
              label={t("code.comments")}
              hint={t("code.commentsHint")}
              checked={settings.comments === "dim"}
              onChange={(on) => set("comments")(on ? "dim" : "show")}
            />
            <Switch
              label={t("code.fold")}
              hint={t("code.foldHint")}
              checked={settings.fold}
              onChange={set("fold")}
            />
          </section>

          <section className={styles.section} aria-labelledby="set-look">
            <h3 id="set-look" className={styles.h}>
              {t("look.heading")}
            </h3>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t("look.theme")}</span>
              <ThemeSwitch />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t("look.motion")}</span>
              <span className={styles.fieldHint}>{t("look.motionHint")}</span>
              <ChoiceGroup
                label={t("look.motion")}
                value={motion}
                onChange={(m) => motionStore.set(m)}
                choices={MOTION_CHOICES.map((m) => ({ key: m, label: t(`look.motions.${m}`) }))}
              />
            </div>
          </section>
        </div>

        <aside className={styles.preview} aria-label={t("preview.label")}>
          <p className={styles.previewLabel}>{t("preview.label")}</p>
          <div className={styles.previewCode}>
            <CodeView
              file={SAMPLE_FILE}
              glossary={content.glossary}
              settings={settings}
              selected={preview}
              onLine={setPreview}
              onTerm={(_, line) => setPreview(line)}
              label={t("preview.code")}
            />
          </div>
        </aside>
      </div>

      <section className={styles.section} aria-labelledby="set-progress">
        <h3 id="set-progress" className={styles.h}>
          {t("progress.heading")}
        </h3>
        <p className={styles.stats}>
          <span>
            <Trans
              t={t}
              i18nKey="progress.words"
              values={{ met: metCount, count: content.glossary.entries.length }}
              components={{ b: <b /> }}
            />
          </span>
          <span>
            <Trans t={t} i18nKey="progress.labs" count={labsRead} components={{ b: <b /> }} />
          </span>
        </p>
        <div className={styles.resets}>
          <ConfirmButton
            label={t("progress.forgetReading.label")}
            confirm={t("progress.forgetReading.confirm")}
            onConfirm={() => codeProgress.resetReading()} />
          <ConfirmButton
            label={t("progress.forgetWords.label")}
            confirm={t("progress.forgetWords.confirm")}
            onConfirm={() => codeProgress.resetWords()} />
          <ConfirmButton
            label={t("progress.reset.label")}
            confirm={t("progress.reset.confirm")}
            onConfirm={() => {
              settingsStore.reset();
              motionStore.set("system");
              log.info("all settings reset");
            }}
          />
        </div>
      </section>
    </div>
  );
}

/** A destructive action that asks once more before it runs. */
function ConfirmButton({
  label,
  confirm,
  onConfirm,
}: {
  label: string;
  /** The button that runs it, e.g. "Yes, reset these settings". */
  confirm: string;
  onConfirm: () => void;
}) {
  const { t } = useTranslation("settings");
  const [asking, setAsking] = useState(false);
  return asking ? (
    <span className={styles.confirm} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.danger}
        onClick={() => {
          onConfirm();
          setAsking(false);
        }}
      >
        {confirm}
      </button>
      <button type="button" className={styles.cancel} onClick={() => setAsking(false)}>
        {t("progress.keep")}
      </button>
    </span>
  ) : (
    <button type="button" className={styles.cancel} onClick={() => setAsking(true)}>
      {label}
    </button>
  );
}
