import { useTranslation } from "react-i18next";
import { SequenceDiagram } from "@/ui/sequence/SequenceDiagram";
import type { WidgetProps } from "@/widgets/types";
import { pickFlows } from "../flows";
import { useBleFlows } from "../use-flows";
import { B4_FLOWS } from "./b4-flows";

/** B4: one pairing, packet by packet. */
export function B4Seq({ panel }: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const flows = useBleFlows("b4", B4_FLOWS);
  return (
    <SequenceDiagram
      flows={pickFlows(flows, panel?.flows)}
      legend={[
        { kind: "msg", label: t("legend.b4") },
        { kind: "wait", label: t("legend.b4Wait") },
      ]}
      waitLane={2}
    />
  );
}
