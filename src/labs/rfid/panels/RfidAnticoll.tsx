import { type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ButtonRow } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { hxs, parseHexBytes, RF } from "../protocol/bytes";
import {
  heardBit,
  isSilent,
  walkModel,
  walkSteps,
  type WalkModel,
} from "../protocol/anticollision";
import styles from "./panels.module.css";
import { StepCaption } from "./StepCaption";
import { useStepper } from "./use-stepper";

const CELL_CLASS = {
  got: styles.got,
  coll: styles.coll,
  sent: styles.sent,
  pick: styles.pick,
  "": "",
} as const;
const randomUid = () => hxs(Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)));

function Cell({ kind, text, i }: { kind: keyof typeof CELL_CLASS; text: string; i: number }) {
  return <i className={`${CELL_CLASS[kind]} ${i % 8 === 0 && i ? styles.byte : ""}`}>{text}</i>;
}

function BitRow({
  name,
  silent,
  children,
}: {
  name: string;
  silent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.acRow} ${silent ? styles.silent : ""}`}>
      <span className={styles.acName}>{name}</span>
      <div className={styles.acBits}>{children}</div>
    </div>
  );
}

/** The binary tree the walk follows: shared bits, then a branch at the first collision. */
function WalkTree({ m, step }: { m: WalkModel; step: number }) {
  const { t } = useTranslation("labs-rfid");
  const p = m.p;
  const yTop = 18;
  const yFork = 70;
  const leafY = 128;
  const one = m.winner;
  const zero = m.winner === "A" ? "B" : "A";
  const onPath1 = step >= 2 && step <= 4;
  const onPath0 = step >= 5;
  return (
    <div className={styles.treeScroll} dir="ltr">
      <svg
        className={styles.tree}
        viewBox="0 0 680 150"
        role="img"
        aria-label={t("anticoll.tree.label")}
      >
        {p ? (
          <>
            <line
              x1={340}
              y1={yTop}
              x2={340}
              y2={yFork}
              className={`${styles.edge} ${step >= 1 ? styles.on : ""}`}
            />
            <text
              x={350}
              y={(yTop + yFork) / 2 + 4}
              className={styles.tk}
            >
              {t("anticoll.tree.shared", { last: p - 1, count: p - 1 })}
            </text>
            <path
              d={`M340 ${yFork} Q 260 ${yFork + 10} 200 ${leafY - 14}`}
              className={`${styles.edge} ${onPath0 ? styles.on : ""}`}
            />
            <path
              d={`M340 ${yFork} Q 420 ${yFork + 10} 480 ${leafY - 14}`}
              className={`${styles.edge} ${onPath1 ? styles.on : ""}`}
            />
            <circle cx={340} cy={yFork} r={7} className={styles.node} />
            <text x={352} y={yFork + 4} className={styles.tk}>{t("anticoll.tree.collision", { p })}</text>
            <text x={236} y={yFork + 6} className={styles.tk} textAnchor="end">
              {t("anticoll.tree.zero")}
            </text>
            <text x={444} y={yFork + 6} className={styles.tk}>
              {t("anticoll.tree.one")}
            </text>
            <text
              x={200}
              y={leafY + 4}
              className={styles.leaf}
              textAnchor="middle"
            >
              {t(onPath0 && step === 6 ? "anticoll.tree.foundSecond" : "anticoll.tree.card", {
                name: zero,
              })}
            </text>
            <text
              x={480}
              y={leafY + 4}
              className={styles.leaf}
              textAnchor="middle"
            >
              {t(step >= 4 ? "anticoll.tree.foundFirst" : "anticoll.tree.card", { name: one })}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}

/** R3 panel: anticollision as a walk down the UID bits of two cards. */
export function RfidAnticoll(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const [textA, setTextA] = useState(hxs(RF.card.uid));
  const [textB, setTextB] = useState(hxs(RF.tag.uid));
  const ids = useId();
  const m = walkModel(
    parseHexBytes(textA, 4) ?? RF.card.uid,
    parseHexBytes(textB, 4) ?? RF.tag.uid,
  );
  const list = walkSteps(m);
  const { step, playing, togglePlay, back, next, jump } = useStepper(list.length, 3200);
  const s = list[step] ?? list[0];
  const bitsRow = (bits: readonly number[]) =>
    bits.map((x, i) => (
      <Cell key={i} kind={i === m.p - 1 && step >= 1 ? "coll" : ""} text={String(x)} i={i} />
    ));
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    jump((st) => Math.max(st, 1));
  };

  return (
    <div className={styles.wd}>
      <div className={styles.inputs}>
        <label htmlFor={`${ids}a`}>
          {t("anticoll.uidA")}
          <input
            id={`${ids}a`}
            className={styles.field}
            value={textA}
            onChange={(e) => edit(setTextA)(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            aria-label={t("anticoll.uidAHint")}
          />
        </label>
        <label htmlFor={`${ids}b`}>
          {t("anticoll.uidB")}
          <input
            id={`${ids}b`}
            className={styles.field}
            value={textB}
            onChange={(e) => edit(setTextB)(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            aria-label={t("anticoll.uidBHint")}
          />
        </label>
        <Button
          onClick={() => {
            setTextA(randomUid());
            setTextB(randomUid());
            jump(1);
          }}
        >
          {t("anticoll.random")}
        </Button>
        <span className={styles.count}>{t("controls.stepOf", { step: step + 1, count: list.length })}</span>
      </div>
      <ButtonRow aria-label={t("controls.playback")}>
        <Button onClick={back}>{t("controls.back")}</Button>
        <Button onClick={togglePlay}>{playing ? t("controls.pause") : t("controls.play")}</Button>
        <Button onClick={next}>{t("controls.next")}</Button>
      </ButtonRow>
      <div
        className={styles.grid}
        role="img"
        aria-label={t("anticoll.grid")}
        dir="ltr"
      >
        <BitRow name={t("anticoll.rowCard", { name: "A", uid: hxs(m.a) })} silent={isSilent(m, step, "A")}>
          {bitsRow(m.A)}
        </BitRow>
        <BitRow name={t("anticoll.rowCard", { name: "B", uid: hxs(m.b) })} silent={isSilent(m, step, "B")}>
          {bitsRow(m.B)}
        </BitRow>
        <BitRow name={t("anticoll.rowHears")}>
          {Array.from({ length: 32 }, (_, i) => {
            const h = heardBit(m, step, i);
            return <Cell key={i} kind={h ? h[0] : ""} text={h ? h[1] : "·"} i={i} />;
          })}
        </BitRow>
        <BitRow name={t("anticoll.rowBit")}>
          {Array.from({ length: 32 }, (_, i) => (
            <Cell
              key={i}
              kind=""
              text={(i + 1) % 8 === 1 || i + 1 === m.p ? String(i + 1) : ""}
              i={i}
            />
          ))}
        </BitRow>
      </div>
      <WalkTree m={m} step={step} />
      {s ? (
        <StepCaption
          title={t(`anticoll.steps.${s.id}.title`, s.values)}
          text={t(`anticoll.steps.${s.id}.text`, s.values)}
        />
      ) : null}
    </div>
  );
}
