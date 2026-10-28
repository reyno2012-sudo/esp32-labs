import { useTranslation } from "react-i18next";
import { SequenceDiagram } from "@/ui/sequence/SequenceDiagram";
import type { WidgetProps } from "@/widgets/types";
import { pickFlows } from "../flows";
import { useBleFlows } from "../use-flows";
import { B5_FLOWS } from "./b5-flows";

/** B5: one colour change, from JavaScript to the LED, and a notification back. */
export function B5Seq({ panel }: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const flows = useBleFlows("b5", B5_FLOWS);
  return (
    <SequenceDiagram
      flows={pickFlows(flows, panel?.flows)}
      legend={[{ kind: "msg", label: t("legend.b5") }]}
      waitLane={1}
    />
  );
}
