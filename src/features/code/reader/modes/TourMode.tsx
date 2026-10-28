import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { explainLine } from "@/domain/code/explain";
import { settingsStore } from "@/features/settings/settings-store";
import { createLogger } from "@/lib/logger";
import { RichText } from "@/ui/RichText";
import { codeProgress, useEnvProgress, useMetWords } from "../../code-progress";
import { explainContext, stopsFor, understood } from "../../lab-code";
import panel from "../../panels.module.css";
import { freshWords } from "../../reader-logic";
import { StopCard } from "../../StopCard";
import { UnderstandingRing } from "../../UnderstandingRing";
import { LinePlayerControls } from "../LinePlayerControls";
import { ReaderFrame } from "../ReaderFrame";
import { useReader } from "../reader-context";
import styles from "../reader.module.css";
import { StepBar } from "../StepBar";
import { useArrowKeys } from "../use-arrow-keys";
import { useLinePlayer } from "../use-line-player";

const log = createLogger("code");

/** File by file, a few lines at a time: the band walks the code, each stop explained. */
export function TourMode() {
  const { t } = useTranslation("code");
  const reader = useReader();
  const { lab, settings, simple } = reader;
  const met = useMetWords();
  const progress = useEnvProgress(lab.env);
  const file = reader.file(reader.params.get("file"));
  const stops = stopsFor(file, settings.level);
  const index = Math.min(
    Math.max(0, Number(reader.params.get("stop") ?? "1") - 1 || 0),
    Math.max(0, stops.length - 1),
  );
  const [finished, setFinished] = useState(false);
  const stop = finished ? undefined : stops[index];
  const player = useLinePlayer(lab.env, file, stop ?? null);
  const [popGone, setPopGone] = useState<string | null>(null);

  // The words a stop introduces are fixed when you arrive, so they stay "new" while you read.
  const [fresh, setFresh] = useState<{ id: string; words: string[] } | null>(null);
  if (stop && fresh?.id !== stop.id)
    setFresh({ id: stop.id, words: freshWords(file, lab.glossary, stop, met) });
  const freshIds = stop && fresh?.id === stop.id ? fresh.words : [];

  useEffect(() => {
    if (stop) codeProgress.visitStop(lab.env, stop.id);
  }, [lab.env, stop]);

  const leave = () => {
    if (freshIds.length) codeProgress.meetWords(freshIds);
    reader.clearLine();
  };
  const go = (i: number) => {
    leave();
    setFinished(false);
    reader.update((p) => p.set("stop", String(i + 1)));
  };
  const next = () => {
    if (index < stops.length - 1) go(index + 1);
    else if (!finished) {
      leave();
      setFinished(true);
      log.info("tour finished", { env: lab.env, file: file.path, level: settings.level });
    }
  };
  const prev = () => (finished ? setFinished(false) : index > 0 ? go(index - 1) : undefined);
  useArrowKeys(prev, next);

  const visited = new Set(progress.stops);
  const entries = lab.glossary.byId;
  const ctx = explainContext(lab, file);
  const reading = understood(lab, progress);
  const nextFile = lab.files
    .slice(lab.files.indexOf(file) + 1)
    .find((f) => f.role === "lab" && stopsFor(f, settings.level).length);
  const firstShared = lab.files.find((f) => f.role === "shared" && f.stops.length);

  const guide = stop ? (
    <StopCard
      key={stop.id}
      stop={stop}
      index={index}
      count={stops.length}
      level={settings.level}
      guessFirst={settings.guessFirst}
      freshIds={freshIds}
      entries={entries}
      onTerm={reader.pickWord}
      simple={simple}
    >
      <LinePlayerControls
        player={player}
        explanation={player.cursor !== null ? explainLine(ctx, player.cursor).text : null}
      />
    </StopCard>
  ) : finished ? (
    <article className={panel.card}>
      <p className={panel.eyebrow}>{t("tour.doneEyebrow")}</p>
      <h3 className={panel.title}>{t("tour.doneTitle", { name: file.name })}</h3>
      <div className={styles.done}>
        <UnderstandingRing ratio={reading.ratio} size={72} label={t("toolbar.progress")} />
        <p>
          <Trans
            t={t}
            i18nKey="tour.doneRead"
            values={{ read: reading.read, total: reading.total }}
            components={{ b: <b /> }}
          />
        </p>
      </div>
      <div className={styles.doneActions}>
        {nextFile ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => reader.openFile(nextFile.path)}
          >
            {t("tour.nextFile", { name: nextFile.name })}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            onClick={() => reader.switchMode("story")}
          >
            {t("tour.followStory")}
          </button>
        )}
        {!simple && !nextFile && firstShared && file.role === "lab" ? (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => reader.openFile(firstShared.path)}
          >
            {t("tour.behind", { name: firstShared.name })}
          </button>
        ) : null}
        {settings.level === "beginner" && file.stops.length > stops.length ? (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              settingsStore.change("level", "explorer");
              go(0);
            }}
          >
            {t("tour.seeAll", { count: file.stops.length })}
          </button>
        ) : null}
        <Link className={styles.secondary} to={reader.lessonHref}>
          {t("tour.backToLab")}
        </Link>
      </div>
    </article>
  ) : (
    <article className={panel.card}>
      <p className={panel.eyebrow}>{t("tour.emptyEyebrow")}</p>
      <h3 className={panel.title}>{t("tour.emptyTitle")}</h3>
      <p className={panel.say}>
        <RichText text={lab.bigPicture} />
      </p>
    </article>
  );

  const popWord =
    settings.hints === "pop" &&
    !simple &&
    stop &&
    freshIds[0] &&
    popGone !== stop.id &&
    !reader.selected
      ? entries.get(freshIds[0])
      : undefined;
  const pop = popWord ? (
    <div className={styles.pop} role="status">
      <p>
        <span className={panel.badge}>{t("tour.newWord")}</span> <code>{popWord.term}</code>
      </p>
      <p className={styles.popText}>
        <RichText text={popWord.short} />
      </p>
      <div className={styles.popActions}>
        <button type="button" onClick={() => setPopGone(stop?.id ?? null)}>
          {t("tour.gotIt")}
        </button>
        <button
          type="button"
          onClick={() => {
            setPopGone(stop?.id ?? null);
            reader.pickWord(popWord.id);
          }}
        >
          {t("tour.tellMore")}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <ReaderFrame
      file={file}
      spotlight={stop ?? null}
      cursor={player.cursor}
      fresh={freshIds}
      guide={guide}
      pop={pop}
      bar={
        stops.length ? (
          <StepBar
            index={index}
            noun="stop"
            simple={simple}
            done={finished}
            marks={stops.map((s, i) => ({
              id: s.id,
              label: s.title,
              seen: visited.has(s.id),
              opens: i > 0 && s.chapter !== stops[i - 1]?.chapter,
            }))}
            onGo={go}
            onPrev={prev}
            onNext={next}
          />
        ) : null
      }
    />
  );
}
