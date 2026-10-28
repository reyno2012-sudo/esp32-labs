import { bleWidgets } from "@/labs/ble/widgets";
import { displayWidgets } from "@/labs/display/widgets";
import { introWidgets } from "@/labs/intro/widgets";
import { rfidWidgets } from "@/labs/rfid/widgets";
import { soundWidgets } from "@/labs/sound/widgets";
import { wifiWidgets } from "@/labs/wifi/widgets";

// Content names widgets by id; this table resolves an id to its (lazy) component. Each track
// owns its own map, so adding a simulator never touches another track. Ids must be unique
// across tracks (registry.test.ts checks it), or one would silently shadow another.
export const WIDGETS = {
  ...introWidgets,
  ...displayWidgets,
  ...wifiWidgets,
  ...rfidWidgets,
  ...bleWidgets,
  ...soundWidgets,
} as const;

export type WidgetId = keyof typeof WIDGETS;
