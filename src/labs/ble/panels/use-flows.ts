import { useTranslation } from "react-i18next";
import { applyOverlay, type TextPolicy } from "@/i18n/overlay";
import type { SeqFlows } from "@/ui/sequence/types";

/** The reader-facing fields of a sequence flow; payloads (`code`) and timing are structure. */
export const FLOW_TEXT: TextPolicy = {
  text: new Set(["label", "lanes", "msg", "title", "text"]),
  itemKey: [],
};

export type FlowSet = "b3" | "b4" | "b5" | "b8";

/**
 * A lab's flows in the reader's language: the English source with the catalogue's text laid over
 * it (flows.<lab>), so a partly translated flow still shows every step.
 */
export function useBleFlows(set: FlowSet, flows: SeqFlows): SeqFlows {
  const { t } = useTranslation("labs-ble");
  return applyOverlay(flows, t(`flows.${set}`, { returnObjects: true }), FLOW_TEXT);
}
