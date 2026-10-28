import { bindLab, type BoundLab } from "@/labs/shared/lab-screen/bind";
import type { LabKit, ScreenSpec } from "@/labs/shared/lab-screen/types";
import { drawBleChrome } from "./chrome";
import type { BleState } from "./state";

/**
 * The Bluetooth track's LabKit: the status bar every BLE lab draws, and the clean-up of
 * simulated delays (a reply "600 ms later") when the preview unmounts. Typed per lab so each
 * lab keeps its own state type.
 */
export function bleKit<S extends BleState>(): LabKit<S> {
  return {
    firmware: "ble-lab",
    ns: "labs-ble",
    previewCaption: (t) => t("labs-ble:kit.previewCaption"),
    chrome: (g, C, lesson, spec, view, st, t) =>
      drawBleChrome(g, C, lesson.id, spec.views, view, st, t),
    start: (st) => () => {
      st.timers.forEach(clearTimeout);
      st.timers = [];
    },
  };
}

export type BleLab = BoundLab;

/** One lab's screen bound to the BLE kit (each lab keeps its own state type). */
export const bleLab = <S extends BleState>(spec: ScreenSpec<S>): BleLab =>
  bindLab(bleKit<S>(), spec);
