import { SequenceDiagram } from "@/ui/sequence/SequenceDiagram";
import type { WidgetProps } from "@/widgets/types";
import { useAppLegend } from "../door/use-app-legend";
import { localizeFlows } from "../seq/flow-text";
import { overEnglish } from "../text/over-english";
import { TREE, useRfidText } from "../text/use-rfid-text";
import { FRIENDS_FLOWS, friendsLive } from "./friends-flows";

/** R8 panel: one tap, and a new card getting a friend. */
export function FriendsSeq(_: WidgetProps) {
  const { t, en } = useRfidText();
  const legend = useAppLegend();
  const flows = localizeFlows(
    FRIENDS_FLOWS,
    overEnglish(en("friendsSeq", TREE), t("friendsSeq", TREE)),
  );
  return <SequenceDiagram flows={flows} legend={legend} waitLane={0} live={friendsLive} />;
}
