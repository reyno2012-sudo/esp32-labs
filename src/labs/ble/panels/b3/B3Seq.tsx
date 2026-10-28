import { useTranslation } from "react-i18next";
import { SequenceDiagram } from "@/ui/sequence/SequenceDiagram";
import type { WidgetProps } from "@/widgets/types";
import { pickFlows } from "../flows";
import { useBleFlows } from "../use-flows";
import { B3_FLOWS } from "./b3-flows";

/** B3: from advert to conversation, step by step. */
export function B3Seq({ panel }: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const flows = useBleFlows("b3", B3_FLOWS);
  return (
    <SequenceDiagram
      flows={pickFlows(flows, panel?.flows)}
      legend={[{ kind: "msg", label: t("legend.b3") }]}
      waitLane={1}
    />
  );
}
