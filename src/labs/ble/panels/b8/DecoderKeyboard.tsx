/* eslint-disable i18next/no-literal-string -- literal text here is HID key names, not interface text. */
import { useTranslation } from "react-i18next";
import { Button, ButtonRow } from "@/ui/Button";
import { hx } from "../../protocol/hex";
import { b8Char } from "../../protocol/hid";
import own from "./B8Decoder.module.css";

// Key codes in keyboard order: digits, QWERTY, ASDF, ZXCV rows.
const ROWS: readonly (readonly number[])[] = [
  [0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2d],
  [0x14, 0x1a, 0x08, 0x15, 0x17, 0x1c, 0x18, 0x0c, 0x12, 0x13, 0x2f],
  [0x04, 0x16, 0x07, 0x09, 0x0a, 0x0b, 0x0d, 0x0e, 0x0f, 0x33, 0x34],
  [0x1d, 0x1b, 0x06, 0x19, 0x05, 0x11, 0x10, 0x36, 0x37, 0x38],
];

// Consumer usages; labels in the catalogue (decoder.mediaKey.<name>).
const MEDIA: readonly [number, "down" | "up" | "play"][] = [
  [0xea, "down"],
  [0xe9, "up"],
  [0xcd, "play"],
];

interface Props {
  mods: number;
  de: boolean;
  media: boolean;
  onKey(code: number): void;
  onMod(bit: number): void;
  onMedia(usage: number): void;
}

/** A little keyboard whose keys show what each code types with the chosen layout. */
export function DecoderKeyboard({ mods, de, media, onKey, onMod, onMedia }: Props) {
  const { t } = useTranslation("labs-ble");
  return (
    <div className={own.kbd} role="group" aria-label={t("decoder.keyboard")}>
      {ROWS.map((row, r) => (
        <ButtonRow key={r}>
          {row.map((code) => {
            const c = b8Char(code, mods & 0x42, de);
            return (
              <Button
                key={code}
                className={own.key}
                aria-label={t("decoder.keyAria", { code: hx(code), c: c || t("decoder.nothing") })}
                onClick={() => onKey(code)}
              >
                <b>{c === " " ? "␣" : c || "·"}</b>
                <br />
                <small className={own.code}>{hx(code)}</small>
              </Button>
            );
          })}
        </ButtonRow>
      ))}
      <ButtonRow>
        <Button pressed={Boolean(mods & 0x02)} onClick={() => onMod(0x02)}>
          Shift (E1)
        </Button>
        {de ? (
          <Button pressed={Boolean(mods & 0x40)} onClick={() => onMod(0x40)}>
            AltGr (E6)
          </Button>
        ) : null}
        <Button onClick={() => onKey(0x2c)}>{t("decoder.space")}</Button>
        <Button onClick={() => onKey(0x2a)}>⌫ (2A)</Button>
        <Button onClick={() => onKey(0x28)}>⏎ (28)</Button>
        {media
          ? MEDIA.map(([usage, label]) => (
              <Button key={usage} onClick={() => onMedia(usage)}>
                {t(`decoder.mediaKey.${label}`)}
              </Button>
            ))
          : null}
      </ButtonRow>
    </div>
  );
}
