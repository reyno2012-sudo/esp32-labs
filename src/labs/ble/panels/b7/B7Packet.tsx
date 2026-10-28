import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { type MidiByte, midiPacket, type PendingNote } from "../../protocol/midi";
import styles from "../panels.module.css";
import { SvgPainter } from "../svg";
import { Beeper } from "./beeper";
import { drawPacket } from "./draw-packet";
import own from "./B7Packet.module.css";

type NoteName = "C" | "D" | "E" | "F" | "G" | "A" | "B";

// Note names are shown through the catalogue (packet.notes.<name>): do, ré, mi... in some languages.
const KEYS: readonly (readonly [name: NoteName, note: number, key: string])[] = [
  ["C", 60, "a"],
  ["D", 62, "s"],
  ["E", 64, "d"],
  ["F", 65, "f"],
  ["G", 67, "g"],
  ["A", 69, "h"],
  ["B", 71, "j"],
  ["C", 72, "k"],
];

/** B7: BLE-MIDI packet anatomy, built live from a mini keyboard. */
export function B7Packet(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const reduce = useReducedMotion();
  const [running, setRunning] = useState(true);
  const [collect, setCollect] = useState(15);
  const [sound, setSound] = useState(false);
  const [packet, setPacket] = useState<MidiByte[] | null>(null);
  // The last packet's summary for the caption (null until a note is played).
  const [cap, setCap] = useState<{ n: number; real: number; saved: number } | null>(null);
  const [beeper] = useState(() => new Beeper());
  const svgRef = useRef<SVGSVGElement>(null);
  const pending = useRef<PendingNote[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(0);
  const t0 = useRef(0);
  const rsId = useId();
  const soundId = useId();

  useEffect(() => {
    t0.current = performance.now();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      beeper.close();
    };
  }, [beeper]);

  // Notes pressed within one connection event share one packet.
  function build() {
    timer.current = null;
    const msgs = pending.current.splice(0);
    const bytes = midiPacket(msgs, running);
    setPacket(bytes);
    shownAt.current = performance.now();
    const real = bytes.filter((x) => x.b !== null).length;
    const n = msgs.length;
    setCap({ n, real, saved: running && n > 1 ? n - 1 : 0 });
  }

  function press(note: number) {
    pending.current.push({ note, ts: Math.round(performance.now() - t0.current) & 0x1fff });
    if (sound) beeper.beep(note);
    timer.current ??= setTimeout(build, collect);
  }

  // The computer's keys A to K play too, unless you are typing somewhere.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || (e.target instanceof Element && e.target.closest("input,select,textarea")))
      return;
    const hit = KEYS.find(([, , k]) => k === e.key.toLowerCase());
    if (hit) press(hit[1]);
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    addEventListener("keydown", listener);
    return () => removeEventListener("keydown", listener);
  }, []);

  useFrameLoop(svgRef, ({ now }) => {
    if (!svgRef.current) return;
    drawPacket(
      new SvgPainter(svgRef.current),
      packet,
      reduce ? 1 : Math.min(1, (now - shownAt.current) / 900),
      t,
    );
  });

  return (
    <div className={styles.wd}>
      <div className={styles.ctl} role="group" aria-label={t("packet.options")}>
        <label htmlFor={rsId}>
          <input
            id={rsId}
            type="checkbox"
            checked={running}
            onChange={(e) => setRunning(e.target.checked)}
          />{" "}
          {t("packet.running")}
        </label>
        <label>
          {t("packet.collect")}
          <select
            className={styles.select}
            aria-label={t("packet.interval")}
            value={collect}
            onChange={(e) => setCollect(Number(e.target.value))}
          >
            <option value={15}>{t("packet.ms", { value: 15 })}</option>
            <option value={60}>{t("packet.ms", { value: 60 })}</option>
            <option value={300}>{t("packet.slow")}</option>
          </select>
        </label>
        <label htmlFor={soundId}>
          <input
            id={soundId}
            type="checkbox"
            checked={sound}
            onChange={(e) => setSound(e.target.checked)}
          />{" "}
          {t("packet.hear")}
        </label>
      </div>
      <ButtonRow role="group" aria-label={t("packet.keyboard")}>
        {KEYS.map(([name, note, key]) => (
          <Button
            key={note}
            className={own.key}
            aria-label={t("packet.keyAria", { name: t(`packet.notes.${name}`), key })}
            onPointerDown={() => press(note)}
            // Keyboard activation (Enter/Space) arrives as a click without a pointer.
            onClick={(e) => {
              if (e.detail === 0) press(note);
            }}
          >
            {t(`packet.notes.${name}`)}
            <small className={own.hint}> {key}</small>
          </Button>
        ))}
      </ButtonRow>
      <div className={styles.scroll}>
        <svg
          ref={svgRef}
          viewBox="0 0 680 210"
          className={styles.full}
          direction="ltr"
          role="img"
          aria-label={t("packet.aria")}
        />
      </div>
      <Caption live>
        {cap === null
          ? t("packet.start")
          : `${
              cap.saved
                ? t("packet.builtSaved", { count: cap.n, real: cap.real, saved: cap.saved })
                : t("packet.built", { count: cap.n, real: cap.real })
            } ${t("packet.timestamps")}`}
      </Caption>
    </div>
  );
}
