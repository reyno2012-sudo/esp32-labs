import { useTranslation } from "react-i18next";
import { SequenceDiagram } from "@/ui/sequence/SequenceDiagram";
import type { WidgetProps } from "@/widgets/types";
import { pickFlows } from "../flows";
import { useBleFlows } from "../use-flows";
import { B8_FLOWS } from "./b8-flows";

/** B8: from scan to keystroke, step by step. */
export function B8Flow({ panel }: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const flows = useBleFlows("b8", B8_FLOWS);
  return (
    <SequenceDiagram
      flows={pickFlows(flows, panel?.flows)}
      legend={[
        { kind: "msg", label: t("legend.b8") },
        { kind: "wait", label: t("legend.b8Wait") },
      ]}
      waitLane={0}
    />
  );
}
