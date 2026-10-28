import { useTranslation } from "react-i18next";
import type { Rich } from "@/domain/lesson";
import { RichText } from "@/ui/RichText";
import panel from "../panels.module.css";
import type { LinePlayer } from "./use-line-player";

/** "Line by line": play, pause, step, and what the current line does. */
export function LinePlayerControls({
  player,
  explanation,
}: {
  player: LinePlayer;
  explanation: Rich | null;
}) {
  const { t } = useTranslation("code");
  if (player.count === 0) return null;
  return (
    <div className={panel.player}>
      {player.cursor === null ? (
        <button type="button" className={panel.play} onClick={player.play}>
          <span aria-hidden="true">▶</span>{" "}
          {player.count > 1
            ? t("player.startCount", { lines: player.count })
            : t("player.start")}
        </button>
      ) : (
        <>
          <div className={panel.playerBar} role="group" aria-label={t("player.label")}>
            <button type="button" onClick={() => player.step(-1)} aria-label={t("player.previous")}>
              ↑
            </button>
            <button type="button" onClick={player.playing ? player.pause : player.play}>
              {player.playing ? t("player.pause") : t("player.play")}
            </button>
            <button type="button" onClick={() => player.step(1)} aria-label={t("player.next")}>
              ↓
            </button>
            <span className={panel.lineNo}>{t("player.line", { line: player.cursor + 1 })}</span>
          </div>
          {explanation ? (
            <p className={panel.lineSay} aria-live="polite" key={player.cursor}>
              <RichText text={explanation} />
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
