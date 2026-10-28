import type { TFunction } from "i18next";

/** The Bluetooth track's translator: components get it from useTranslation("labs-ble"). */
export type BleT = TFunction<"labs-ble">;

/**
 * The page's writing direction, for translated labels drawn on a canvas. The canvas itself sits
 * in an LTR container (its layout is physical); only the label text follows the language.
 */
export function annotationDirection(): CanvasDirection {
  return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
}
