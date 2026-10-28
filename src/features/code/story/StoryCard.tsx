import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Scene, Story } from "@/domain/code/story";
import type { FunctionSymbol } from "@/domain/code/symbols";
import { RichText } from "@/ui/RichText";
import panel from "../panels.module.css";
import type { SceneText } from "./narrate";
import styles from "./story.module.css";

interface StoryCardProps {
  scene: Scene;
  text: SceneText;
  index: number;
  story: Story;
  /** Simple view: the extra layers fold away. */
  simple: boolean;
  deep: boolean;
  onScene: (sceneId: string) => void;
  /** The line-by-line player for this scene. */
  children?: ReactNode;
}

/**
 * One scene of the program's story: the call path that led here, where the code lives, why it
 * runs, what it does, and where the story can go next (into a callee, or back to an earlier scene).
 */
export function StoryCard({
  scene,
  text,
  index,
  story,
  simple,
  deep,
  onScene,
  children,
}: StoryCardProps) {
  const { t } = useTranslation("code");
  const sceneOf = (fn: FunctionSymbol) => story.scenes.find((s) => s.fn.id === fn.id);
  const lines = scene.fn.block.end - scene.fn.block.start + 1;
  return (
    <article className={panel.card} aria-labelledby={`scene-${index}`}>
      <p className={panel.eyebrow}>
        {t("story.scene.eyebrow", { index: index + 1, count: story.scenes.length })}
        <span className={panel.chapter}> · {t(`story.acts.${scene.act}.title`)}</span>
      </p>

      {scene.trail.length ? (
        <ol className={styles.trail} aria-label={t("story.scene.trail")} dir="ltr">
          {scene.trail.map((fn) => {
            const at = sceneOf(fn);
            return (
              <li key={fn.id}>
                {at ? (
                  <button type="button" onClick={() => onScene(at.id)}>
                    <code>{fn.qualified}()</code>
                  </button>
                ) : (
                  <code>{fn.qualified}()</code>
                )}
              </li>
            );
          })}
          <li aria-current="step">
            <code>{scene.fn.qualified}()</code>
          </li>
        </ol>
      ) : null}

      <h3 id={`scene-${index}`} className={panel.title}>
        {text.title}
      </h3>
      <p className={styles.where}>
        <span className={styles.fileChip} data-shared={scene.fn.role === "shared" || undefined}>
          {scene.fn.path.split("/").at(-1)}
        </span>
        <span>
          {t("story.scene.lines", {
            where: scene.fn.role === "shared" ? t("story.scene.shared") : t("story.scene.thisLab"),
            start: scene.fn.block.start + 1,
            end: scene.fn.block.end + 1,
            size: lines,
          })}
        </span>
      </p>

      <p className={styles.lead}>
        <RichText text={text.lead} />
      </p>
      <p className={panel.say}>
        <RichText text={text.say} />
      </p>

      {text.note ? (
        simple ? (
          <details className={panel.more}>
            <summary>{t("story.scene.note")}</summary>
            <p className={styles.noteText}>{text.note}</p>
          </details>
        ) : (
          <figure className={panel.note}>
            <figcaption>{t("story.scene.note")}</figcaption>
            <blockquote>{text.note}</blockquote>
          </figure>
        )
      ) : null}
      {text.deep && !simple ? (
        deep ? (
          <p className={panel.deep}>
            <RichText text={text.deep} />
          </p>
        ) : (
          <details className={panel.more}>
            <summary>{t("story.scene.precise")}</summary>
            <p>
              <RichText text={text.deep} />
            </p>
          </details>
        )
      ) : null}

      {scene.next.length ? (
        <div className={styles.next}>
          <p className={panel.freshLabel}>{t("story.scene.next")}</p>
          <ul>
            {scene.next.map((id) => {
              const s = story.byId.get(id);
              return s ? (
                <li key={id}>
                  <button type="button" onClick={() => onScene(id)}>
                    <code>{s.fn.qualified}()</code>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      ) : null}
      {scene.seen.length && !simple ? (
        <p className={styles.small}>
          {t("story.scene.seen")}{" "}
          {scene.seen.map((fn, i) => {
            const at = sceneOf(fn);
            return (
              <span key={fn.id}>
                {i ? ", " : ""}
                {at ? (
                  <button type="button" className={styles.inline} onClick={() => onScene(at.id)}>
                    {fn.qualified}()
                  </button>
                ) : (
                  <code>{fn.qualified}()</code>
                )}
              </span>
            );
          })}
        </p>
      ) : null}
      {scene.helpers.length && !simple ? (
        <p className={styles.small}>
          {t("story.scene.helpers")}{" "}
          {scene.helpers.slice(0, 6).map((fn, i) => (
            <span key={fn.id}>
              {i ? ", " : ""}
              <code>{fn.qualified}()</code>
            </span>
          ))}
          {scene.helpers.length > 6
            ? ` ${t("story.scene.helpersMore", { count: scene.helpers.length - 6 })}`
            : ""}
          .
        </p>
      ) : null}
      {children}
    </article>
  );
}
