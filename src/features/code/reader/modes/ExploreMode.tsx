import { useTranslation } from "react-i18next";
import { RichText } from "@/ui/RichText";
import panel from "../../panels.module.css";
import { stopsFor } from "../../lab-code";
import { ReaderFrame } from "../ReaderFrame";
import { useReader } from "../reader-context";
import styles from "../reader.module.css";

/** No path to follow: every line and word explains itself when tapped. */
export function ExploreMode() {
  const { t } = useTranslation("code");
  const reader = useReader();
  const file = reader.file(reader.params.get("file"));
  const stops = stopsFor(file, reader.settings.level);
  return (
    <ReaderFrame
      file={file}
      guide={
        <article className={panel.card}>
          <p className={panel.eyebrow}>{t("explore.eyebrow")}</p>
          <h3 className={panel.title}>{t("explore.title")}</h3>
          <p className={panel.say}>{t("explore.intro")}</p>
          <p className={panel.say}>
            <RichText text={reader.lab.bigPicture} />
          </p>
        </article>
      }
      bar={
        <div className={styles.stepBar}>
          <p className={styles.barHint}>{t("explore.hint")}</p>
          {stops.length ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => reader.switchMode("tour")}
            >
              {t("explore.takeTour", { count: stops.length })}
            </button>
          ) : null}
        </div>
      }
    />
  );
}
