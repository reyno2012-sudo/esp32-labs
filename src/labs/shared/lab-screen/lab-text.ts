import { useTranslation } from "react-i18next";
import { LAB_NAMESPACES } from "@/i18n/namespaces";
import type { LabNamespace, LabT, LabText } from "./types";

/**
 * `t` for lab specs and kits: suspends until "labs-shared" and the track's catalogue are loaded
 * (inside the widget's Suspense), then resolves keys from any lab catalogue.
 */
export function useLabT(ns?: LabNamespace): LabT {
  const { i18n } = useTranslation(ns ? ["labs-shared", ns] : ["labs-shared"]);
  return i18n.getFixedT(null, [...LAB_NAMESPACES]);
}

/** Plain text as is; a function of `t` resolved now. */
export const labText = (text: LabText | undefined, t: LabT): string =>
  typeof text === "function" ? text(t) : (text ?? "");
