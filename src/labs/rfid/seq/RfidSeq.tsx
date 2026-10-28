import { SequenceDiagram } from "@/ui/sequence/SequenceDiagram";
import type { WidgetProps } from "@/widgets/types";
import { overEnglish } from "../text/over-english";
import { TREE, useRfidText } from "../text/use-rfid-text";
import { localizeFlows } from "./flow-text";
import { pickFlows, RFID_FLOWS } from "./rfid-flows";

/** R2/R4/R5 panel: one exchange step by step; `panel.flows` picks which. */
export function RfidSeq({ panel }: WidgetProps) {
  const { t, en } = useRfidText();
  const text = overEnglish(en("rfidSeq", TREE), t("rfidSeq", TREE));
  return (
    <SequenceDiagram
      flows={localizeFlows(pickFlows(RFID_FLOWS, panel?.flows), text)}
      legend={[
        { kind: "msg", label: text.legend.msg },
        { kind: "wait", label: text.legend.wait },
      ]}
      waitLane={0}
    />
  );
}
