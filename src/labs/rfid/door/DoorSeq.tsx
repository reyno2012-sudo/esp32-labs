import { SequenceDiagram } from "@/ui/sequence/SequenceDiagram";
import type { WidgetProps } from "@/widgets/types";
import { localizeFlows } from "../seq/flow-text";
import { overEnglish } from "../text/over-english";
import { TREE, useRfidText } from "../text/use-rfid-text";
import { DOOR_FLOWS, doorLive } from "./door-flows";
import { useAppLegend } from "./use-app-legend";

/** R7 panel: a tap, a block, a copy and a new card, message by message. */
export function DoorSeq(_: WidgetProps) {
  const { t, en } = useRfidText();
  const legend = useAppLegend();
  const flows = localizeFlows(DOOR_FLOWS, overEnglish(en("doorSeq", TREE), t("doorSeq", TREE)));
  return <SequenceDiagram flows={flows} legend={legend} waitLane={0} live={doorLive} />;
}
