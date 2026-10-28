import { type KeyboardEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import type { SoundT } from "../../kit/i18n";
import type { WidgetProps } from "@/widgets/types";
import { matchRhythm, type RhythmMatch } from "../../model/rhythm";
import { CanvasPanel } from "../canvas-panel/CanvasPanel";
import { Range } from "../controls";
import { drawKnocks } from "./knock-draw";

const PAUSE_MS = 1500;
/** Why a knock failed, as the model says it (in English, like the board), to its catalogue key. */
const WHY = {
  "no secret yet": "noSecret",
  "too few knocks": "tooFew",
  "too many knocks": "tooMany",
  "the rhythm is off": "off",
} as const;
const whyKey = (why: string) => (why in WHY ? WHY[why as keyof typeof WHY] : "off");

const INTRO = (tr: SoundT) => tr("knock.intro");

interface Knocks {
  secret: number[];
  attempt: number[];
  open: number[];
  lastTap: number;
  result: RhythmMatch | null;
  /** Resolved every frame, so it follows the language. */
  caption: (tr: SoundT) => string;
}

const fresh = (): Knocks => ({
  secret: [],
  attempt: [],
  open: [],
  lastTap: 0,
  result: null,
  caption: INTRO,
});

/** S6 panel: the knock lock's matcher, with your own taps. */
export function SoundKnockMatcher(_: WidgetProps) {
  const { t: tr } = useTranslation("labs-sound");
  const [setting, setSetting] = useState(true);
  const [tolPct, setTolPct] = useState(12);
  const knocks = useRef<Knocks | null>(null);

  const tap = () => {
    const k = (knocks.current ??= fresh());
    const now = performance.now();
    if (k.open.length < 12) k.open.push(now);
    k.lastTap = now;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    e.preventDefault();
    tap();
  };
  const clear = () => {
    knocks.current = fresh();
    setSetting(true);
  };

  return (
    <CanvasPanel
      h={250}
      label={tr("knock.label")}
      canvas={{ tabIndex: 0, onKeyDown, onPointerDown: tap, style: { cursor: "pointer" } }}
      controls={
        <>
          <Button pressed={setting} onClick={() => setSetting(!setting)}>
            {setting ? tr("knock.recording") : tr("knock.trying")}
          </Button>
          <Button onClick={tap}>{tr("knock.knock")}</Button>
          <Button onClick={clear}>{tr("knock.startOver")}</Button>
          <Range
            label={tr("knock.tolerance")}
            ariaLabel={tr("knock.toleranceLabel")}
            min={3}
            max={30}
            value={tolPct}
            onChange={setTolPct}
            output={`${tolPct}%`}
          />
        </>
      }
      onFrame={({ g, C, caption }) => {
        const k = (knocks.current ??= fresh());
        const tol = tolPct / 100;
        const now = performance.now();
        if (k.open.length && now - k.lastTap > PAUSE_MS) {
          if (setting) {
            if (k.open.length >= 2) {
              k.secret = k.open;
              setSetting(false);
              const count = k.secret.length;
              const s = ((k.secret.at(-1) ?? 0) - (k.secret[0] ?? 0)) / 1000;
              k.caption = (t) => t("knock.saved", { count, s });
            } else k.caption = (t) => t("knock.needTwo");
          } else {
            k.attempt = k.open;
            const r = matchRhythm(k.secret, k.attempt, tol);
            k.result = r;
            const pct = Math.round(tol * 100);
            const worst = Math.round(r.worst * 100);
            const why = whyKey(r.why);
            k.caption = (t) =>
              r.ok
                ? t("knock.open", { score: r.score, pct })
                : r.errs.length
                  ? t("knock.lockedWorst", { why: t(`knock.why.${why}`), worst })
                  : t("knock.locked", { why: t(`knock.why.${why}`) });
          }
          k.open = [];
        }
        if (k.result && k.attempt.length) k.result = matchRhythm(k.secret, k.attempt, tol);
        caption(k.caption(tr));
        drawKnocks(g, C, { ...k, setting, tol, quiet: Math.min(1, (now - k.lastTap) / PAUSE_MS) }, tr);
      }}
    />
  );
}
