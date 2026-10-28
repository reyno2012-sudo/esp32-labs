import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFrameLoop } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { hx } from "../../protocol/hex";
import { B8_MAPS, b8Char, b8ParseHid, MAP_KEYS, type MapKey } from "../../protocol/hid";
import styles from "../panels.module.css";
import { SvgPainter } from "../svg";
import { DecoderKeyboard } from "./DecoderKeyboard";
import {
  FIELD_MS,
  FLY_MS,
  fieldOrder,
  keyReport,
  mediaReport,
  mouseReport,
} from "./decoder-reports";
import { drawDecoder } from "./draw-decoder";
import { type MouseMove, MousePad } from "./MousePad";
import { ReportItems } from "./ReportItems";

interface Sent {
  readonly id: number;
  readonly data: number[];
  /** Shown under the diagram once every field has lit. */
  readonly summary: string;
  /** What the board's screen would show afterwards. */
  readonly screen: string;
  /** Field indexes, in the order they light up. */
  readonly order: number[];
  readonly start: number;
  /** Show it at once (mouse drags, releases). */
  readonly quick: boolean;
}

// HID consumer usages the media keys send; their names live in the catalogue.
const MEDIA_NAMES: Readonly<Record<number, "up" | "down" | "play">> = {
  0xe9: "up",
  0xea: "down",
  0xcd: "play",
};
const signed = (v: number) => `${v >= 0 ? "+" : ""}${v}`;
const asMap = (v: string): MapKey => MAP_KEYS.find((k) => k === v) ?? "combo";

/** B8: decode a report yourself, field by field, with the Report Map item that defined it. */
export function B8Decoder(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const keyboardScreen = (text: string) =>
    t("decoder.keyboardScreen", { text: text.replace(/\n/g, "⏎") || t("decoder.empty") });
  const reduce = useReducedMotion();
  const [map, setMap] = useState<MapKey>("combo");
  const [de, setDe] = useState(false);
  const [mods, setMods] = useState(0);
  const [report, setReport] = useState<Sent | null>(null);
  const [litItem, setLitItem] = useState<number | undefined>(undefined);
  const [what, setWhat] = useState(() => t("decoder.pressKey"));
  const [screen, setScreen] = useState(() => keyboardScreen(""));
  const svgRef = useRef<SVGSVGElement>(null);
  // What the board would hold: typed text, cursor, brush. Only shown through `screen`.
  const board = useRef({ text: "", mx: 160, my: 94, brush: 3 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shown = useRef<{ report: Sent | null; lit?: number; done: boolean }>({
    report: null,
    done: false,
  });
  const bytes = B8_MAPS[map].bytes;
  const parsed = b8ParseHid(bytes);
  const isMouse = map === "mouse";

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const mouseScreen = () =>
    t("decoder.mouseScreen", {
      x: board.current.mx,
      y: board.current.my,
      brush: board.current.brush,
    });

  // One report: the packet flies in, then each field of it lights up, one after the other.
  function send(
    id: number,
    data: number[],
    summary: string,
    screenText: string,
    quick: boolean,
    heldMods: number,
  ) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const fields = parsed.fields.filter((f) => f.id === id);
    setReport({
      id,
      data,
      summary,
      screen: screenText,
      order: fieldOrder(fields, heldMods),
      start: performance.now(),
      quick,
    });
  }

  useFrameLoop(svgRef, ({ now }) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = report;
    if (!r) {
      if (svg.firstChild) svg.replaceChildren();
      return;
    }
    const last = shown.current;
    if (last.report === r && last.done) return;
    const fields = parsed.fields.filter((f) => f.id === r.id);
    const elapsed = now - r.start;
    let lit: number | undefined;
    let flying: number | undefined;
    let done = false;
    if (r.quick || reduce) done = true;
    else if (elapsed < FLY_MS) flying = elapsed / FLY_MS;
    else {
      lit = r.order[Math.floor((elapsed - FLY_MS) / FIELD_MS)];
      done = lit === undefined;
    }
    drawDecoder(
      new SvgPainter(svg),
      {
      device: isMouse ? "mouse" : "keyboard",
      id: r.id,
      data: r.data,
      fields,
      lit,
      flying,
      },
      t,
    );
    const item = lit === undefined ? undefined : fields[lit]?.item;
    if (item !== undefined && item !== litItem) setLitItem(item);
    if (done) {
      setWhat(r.summary);
      setScreen(r.screen);
    }
    shown.current = { report: r, lit, done };
  });

  function pressKey(code: number) {
    const id = map === "combo" ? 1 : 0;
    const c = b8Char(code, mods, de);
    const b = board.current;
    b.text = code === 0x2a ? b.text.slice(0, -1) : code === 0x28 ? `${b.text}\n` : b.text + c;
    const typed =
      code === 0x2a
        ? t("decoder.backspace")
        : code === 0x28
          ? t("decoder.enter")
          : t("decoder.char", { c });
    const after = keyboardScreen(b.text);
    const up = keyReport(parsed, id, mods, []);
    send(
      id,
      keyReport(parsed, id, mods, [code]),
      t(de ? "decoder.keyDe" : "decoder.keyUs", { code: hx(code), mods: hx(mods), typed }),
      after,
      false,
      mods,
    );
    const held = mods;
    timers.current.push(
      setTimeout(
        () => send(id, up, t("decoder.releaseKey"), after, true, held),
        reduce ? 400 : 2600,
      ),
    );
    if (mods & 0x42) setMods(0);
  }

  function pressMedia(usage: number) {
    const after = keyboardScreen(board.current.text);
    send(
      3,
      mediaReport(parsed, usage),
      t("decoder.media", {
        usage: hx(usage),
        name: t(`decoder.mediaName.${MEDIA_NAMES[usage] ?? "play"}`),
      }),
      after,
      false,
      0,
    );
    timers.current.push(
      setTimeout(
        () => send(3, mediaReport(parsed, 0), t("decoder.releaseMedia"), after, true, 0),
        reduce ? 400 : 2200,
      ),
    );
  }

  function moveMouse({ dx, dy, buttons, wheel, animate = false }: MouseMove) {
    const b = board.current;
    b.mx = Math.max(0, Math.min(319, b.mx + Math.trunc(dx / 2)));
    b.my = Math.max(30, Math.min(157, b.my + Math.trunc(dy / 2)));
    if (wheel) b.brush = Math.max(1, Math.min(9, b.brush + Math.sign(wheel)));
    send(
      2,
      mouseReport(parsed, dx, dy, buttons, wheel),
      t("decoder.mouse", {
        buttons: hx(buttons),
        dx: signed(dx),
        dy: signed(dy),
        wheel: signed(wheel),
      }),
      mouseScreen(),
      !animate,
      0,
    );
  }

  function clickButton(buttons: number) {
    moveMouse({ dx: 0, dy: 0, buttons, wheel: 0, animate: true });
    timers.current.push(setTimeout(() => moveMouse({ dx: 0, dy: 0, buttons: 0, wheel: 0 }), 2600));
  }

  function chooseMap(k: MapKey) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMap(k);
    setReport(null);
    setLitItem(undefined);
    setWhat(k === "mouse" ? t("decoder.drag") : t("decoder.pressKey"));
    setScreen(k === "mouse" ? mouseScreen() : keyboardScreen(board.current.text));
  }

  return (
    <div className={styles.wd}>
      <div className={styles.ctl} role="group" aria-label={t("decoder.group")}>
        <label>
          {t("decoder.map")}
          <select
            className={styles.select}
            aria-label={t("decoder.map")}
            value={map}
            onChange={(e) => chooseMap(asMap(e.target.value))}
          >
            {MAP_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`decoder.maps.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("decoder.layout")}
          <select
            className={styles.select}
            aria-label={t("decoder.layoutAria")}
            value={de ? "de" : "us"}
            onChange={(e) => {
              const german = e.target.value === "de";
              setDe(german);
              setMods(0);
              setWhat(german ? t("decoder.german") : t("decoder.us"));
            }}
          >
            <option value="us">{t("decoder.usOption")}</option>
            <option value="de">{t("decoder.deOption")}</option>
          </select>
        </label>
      </div>
      {isMouse ? (
        <MousePad onMove={moveMouse} onClickButton={clickButton} />
      ) : (
        <DecoderKeyboard
          mods={mods}
          de={de}
          media={map === "combo"}
          onKey={pressKey}
          onMod={(bit) => setMods((m) => m ^ bit)}
          onMedia={pressMedia}
        />
      )}
      <div className={styles.scroll}>
        <svg
          ref={svgRef}
          viewBox="0 0 680 150"
          className={styles.full}
          direction="ltr"
          role="img"
          aria-label={t("decoder.aria")}
        />
      </div>
      <Caption live>{what}</Caption>
      <ReportItems
        bytes={bytes}
        items={parsed.items}
        fieldCount={parsed.fields.length}
        lit={litItem}
      />
      <Caption>{screen}</Caption>
    </div>
  );
}
