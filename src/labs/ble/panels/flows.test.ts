import { describe, expect, it } from "vitest";
import { extractOverlay } from "@/i18n/overlay";
import catalogue from "@/locales/en/labs-ble.json";
import { B3_FLOWS } from "./b3/b3-flows";
import { B4_FLOWS } from "./b4/b4-flows";
import { B5_FLOWS } from "./b5/b5-flows";
import { B8_FLOWS } from "./b8/b8-flows";
import { FLOW_TEXT } from "./use-flows";

// The English catalogue carries the flows' text for translators: it must match the source.
describe("BLE sequence flows catalogue", () => {
  it.each([
    ["b3", B3_FLOWS],
    ["b4", B4_FLOWS],
    ["b5", B5_FLOWS],
    ["b8", B8_FLOWS],
  ] as const)("flows.%s matches the TypeScript source", (set, flows) => {
    expect(catalogue.flows[set]).toEqual(extractOverlay(flows, FLOW_TEXT));
  });
});
