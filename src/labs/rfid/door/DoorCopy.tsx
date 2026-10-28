import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import { RichText } from "@/ui/RichText";
import type { WidgetProps } from "@/widgets/types";
import { hxs, RF } from "../protocol/bytes";
import styles from "./door.module.css";

/** The lab blocks a snapshot saves and a copy writes: sectors 1 and 2, trailers excluded. */
const LAB = [4, 5, 6, 8, 9, 10] as const;
type CardKey = "white" | "tag";
/** What a block holds: text written on the card (data, never translated), zeros or a value. */
type Cell =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "zeros" }
  | { readonly kind: "value"; readonly n: number };
type Data = Readonly<Record<number, Cell>>;
const text = (s: string): Cell => ({ kind: "text", text: s });
const ZEROS: Cell = { kind: "zeros" };
interface CopyCard {
  readonly name: string;
  readonly uid: string;
  readonly data: Data;
}
type Mark = "go" | "ok" | "skip";
type Outcome =
  | { kind: "none" }
  | { kind: "read" }
  | { kind: "saved" }
  | { kind: "copied"; done: number; skipped: number };

const fresh = (): Record<CardKey, CopyCard> => ({
  white: {
    name: "White card",
    uid: hxs(RF.card.uid),
    data: {
      4: text("White card"),
      5: text("R7 resident"),
      6: ZEROS,
      8: { kind: "value", n: 10 },
      9: { kind: "value", n: 10 },
      10: ZEROS,
    },
  },
  tag: {
    name: "Key tag",
    uid: hxs(RF.tag.uid),
    data: { 4: text("Key tag"), 5: text("R7 guest"), 6: ZEROS, 8: ZEROS, 9: ZEROS, 10: ZEROS },
  },
});

const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, prefersReducedMotion() ? 0 : ms));

function CardBlocks({
  who,
  card,
  closed,
  marks,
}: {
  who: CardKey;
  card: CopyCard;
  closed: boolean;
  marks: Readonly<Record<string, Mark>>;
}) {
  const { t } = useTranslation("labs-rfid");
  const cellText = (c: Cell | undefined) =>
    !c
      ? ""
      : c.kind === "text"
        ? t("copy.quoted", { text: c.text })
        : c.kind === "value"
          ? t("copy.value", { n: c.n })
          : t("copy.zeros");
  return (
    <div className={styles.cpCard}>
      <h4>
        {card.name} <small>UID {card.uid}</small>
      </h4>
      {[0, 1, 2].map((sec) => (
        <div key={sec} className={styles.cpRow}>
          <span>S{sec}</span>
          {[0, 1, 2, 3].map((i) => {
            const b = sec * 4 + i;
            let cls = "";
            let txt: string;
            if (b === 0) [cls, txt] = [styles.uid ?? "", card.uid];
            else if (i === 3) [cls, txt] = [styles.trailer ?? "", t("copy.keys")];
            else if (sec === 0) txt = "–";
            else if (who === "tag" && sec === 2 && closed)
              [cls, txt] = [`${styles.lab} ${styles.closed}`, t("copy.closed")];
            else [cls, txt] = [styles.lab ?? "", cellText(card.data[b])];
            const mark = marks[`${who}-${b}`];
            return (
              <span
                key={b}
                className={`${styles.cpCell} ${cls} ${mark ? styles[mark] : ""}`}
                title={t("copy.cell", { n: b, text: txt })}
              >
                <b>{b}</b>
                {txt}
              </span>
            );
          })}
        </div>
      ))}
      <div className={styles.cpMore}>{t("copy.rest")}</div>
    </div>
  );
}

/** R7 panel: save the white card's data, copy it onto the key tag, and see what moves. */
export function DoorCopy(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const [cards, setCards] = useState(fresh);
  const [saved, setSaved] = useState<Data | null>(null);
  const [closed, setClosed] = useState(false);
  const [running, setRunning] = useState(false);
  const [marks, setMarks] = useState<Readonly<Record<string, Mark>>>({});
  const [out, setOut] = useState<Outcome>({ kind: "none" });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function copy() {
    if (running) return;
    setRunning(true);
    let snapshot = saved;
    if (!snapshot) {
      snapshot = { ...cards.white.data };
      setSaved(snapshot);
      setOut({ kind: "read" });
    }
    let done = 0;
    let skipped = 0;
    const tagMarks: Record<string, Mark> = {};
    for (const b of LAB) {
      setMarks({ ...tagMarks, [`white-${b}`]: "go" });
      await sleep(260);
      if (!alive.current) return;
      const ok = !(closed && b >= 8);
      if (ok) {
        const value = snapshot[b] ?? ZEROS;
        setCards((c) => ({ ...c, tag: { ...c.tag, data: { ...c.tag.data, [b]: value } } }));
        done++;
      } else skipped++;
      tagMarks[`tag-${b}`] = ok ? "ok" : "skip";
      setMarks({ ...tagMarks });
      await sleep(140);
      if (!alive.current) return;
    }
    setOut({ kind: "copied", done, skipped });
    setRunning(false);
  }

  function restart(nextClosed = closed) {
    if (running) return;
    setClosed(nextClosed);
    setCards(fresh());
    setSaved(null);
    setMarks({});
    setOut({ kind: "none" });
  }

  return (
    <div className={styles.cpUi}>
      <div className={styles.cpCtl}>
        <ButtonRow>
          <Button
            onClick={() => {
              setSaved({ ...cards.white.data });
              setMarks(Object.fromEntries(LAB.map((b) => [`white-${b}`, "ok"])));
              setOut({ kind: "saved" });
            }}
          >
            {t("copy.save")}
          </Button>
          <Button onClick={copy} disabled={running}>
            {t("copy.copy")}
          </Button>
          <Button onClick={() => restart()}>{t("copy.again")}</Button>
        </ButtonRow>
        <label>
          <input
            type="checkbox"
            checked={closed}
            disabled={running}
            onChange={(e) => restart(e.target.checked)}
          />{" "}
          {t("copy.otherKey")}
        </label>
      </div>
      <div className={styles.cpLegend}>
        <span>
          <i className={styles.uid} />
          {t("copy.legend.uid")}
        </span>
        <span>
          <i className={styles.lab} />
          {t("copy.legend.lab")}
        </span>
        <span>
          <i className={styles.trailer} />
          {t("copy.legend.trailer")}
        </span>
        <span>
          <i />
          {t("copy.legend.sector0")}
        </span>
      </div>
      <div className={styles.cpCards}>
        <CardBlocks who="white" card={cards.white} closed={closed} marks={marks} />
        <span className={styles.cpArrow} aria-hidden="true">
          →
        </span>
        <CardBlocks who="tag" card={cards.tag} closed={closed} marks={marks} />
      </div>
      <p className={styles.cpOut} aria-live="polite">
        {out.kind === "read" ? t("copy.read") : null}
        {out.kind === "saved" ? (
          <span>
            <Trans
              t={t}
              i18nKey="copy.saved"
              components={{ now: <span className={styles.now} /> }}
            />
          </span>
        ) : null}
        {out.kind === "copied" ? (
          <>
            <span>
              <span className={`${styles.now} ${out.skipped ? styles.warn : ""}`}>
                {t("copy.copied", { done: out.done })}
              </span>
              {out.skipped ? t("copy.skipped") : t("copy.allCopied")}
            </span>
            <span>
              <RichText text={t("copy.uidStays", { uid: cards.tag.uid })} />
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
