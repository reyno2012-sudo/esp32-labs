import { type BleLab, bleLab } from "../kit/kit";
import { b1Screen } from "./b1";
import { b2Screen } from "./b2";
import { b3Screen } from "./b3";
import { b4Screen } from "./b4";
import { b5Screen } from "./b5";
import { b6Screen } from "./b6";
import { b7Screen } from "./b7";
import { b8Screen } from "./b8";

/** Every BLE lab's screen, by lesson id. */
export const BLE_LABS: Readonly<Record<string, BleLab | undefined>> = {
  B1: bleLab(b1Screen),
  B2: bleLab(b2Screen),
  B3: bleLab(b3Screen),
  B4: bleLab(b4Screen),
  B5: bleLab(b5Screen),
  B6: bleLab(b6Screen),
  B7: bleLab(b7Screen),
  B8: bleLab(b8Screen),
};
