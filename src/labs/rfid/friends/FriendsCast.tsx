import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { context2d, scopePalette } from "@/lib/canvas";
import { useReducedMotion } from "@/lib/media";
import { RichText } from "@/ui/RichText";
import type { WidgetProps } from "@/widgets/types";
import { CAST_COLORS, drawFriend2d, type Friend, FRIEND_CAST } from "./cast";
import styles from "./friends.module.css";

const W = 120;
const H = 104;

function drawCard(
  g: CanvasRenderingContext2D,
  f: Friend,
  t: number,
  jumpAt: number,
  reduce: boolean,
  ink: string,
) {
  const k = t - jumpAt;
  const hop =
    k < 1 ? Math.sin(Math.PI * k) * 34 : reduce ? 0 : Math.abs(Math.sin(t * 2 + f.name.length)) * 3;
  g.clearRect(0, 0, W, H);
  if (k < 1)
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63;
      const r = k * 50;
      g.fillStyle = i % 2 ? f.accent : CAST_COLORS.star;
      g.beginPath();
      g.arc(60 + Math.cos(a) * r, 60 - Math.sin(a) * r * 0.8 + k * k * 30, 3, 0, 7);
      g.fill();
    }
  drawFriend2d(g, f, 60, 92 - hop, 24, t, k > 0.85 && k < 1.1 ? 1.15 : 1, ink);
}

/** R8 panel: the eight friends, drawn the way the board draws them. Press one to see what it does. */
export function FriendsCast(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const [chosen, setChosen] = useState<Friend | null>(null);
  const reduce = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const jumps = useRef<number[]>(FRIEND_CAST.map(() => -9));

  useFrameLoop(gridRef, ({ now }) => {
    const t = now / 1000;
    const ink = scopePalette().paper;
    FRIEND_CAST.forEach((f, i) => {
      const canvas = canvases.current[i];
      if (canvas) drawCard(context2d(canvas), f, t, jumps.current[i] ?? -9, reduce, ink);
    });
  });

  return (
    <div>
      <div ref={gridRef} className={styles.grid}>
        {FRIEND_CAST.map((f, i) => (
          <button
            key={f.id}
            type="button"
            className={styles.card}
            aria-pressed={chosen?.id === f.id}
            onClick={() => {
              jumps.current[i] = performance.now() / 1000;
              setChosen(f);
            }}
          >
            <canvas
              dir="ltr"
              ref={(el) => {
                canvases.current[i] = el;
              }}
              width={W}
              height={H}
              aria-hidden="true"
            />
            <b>{f.name}</b>
            <small>{t(`friends.cast.${f.id}.what`)}</small>
          </button>
        ))}
      </div>
      <p className={styles.out} aria-live="polite">
        {chosen ? (
          <RichText
            text={t("friends.chosen", {
              name: chosen.name,
              id: chosen.id,
              move: t(`friends.cast.${chosen.id}.move`),
              fx: t(`friends.cast.${chosen.id}.fx`),
              sky: t(`friends.cast.${chosen.id}.sky`),
            })}
          />
        ) : (
          t("friends.pick")
        )}
      </p>
    </div>
  );
}
