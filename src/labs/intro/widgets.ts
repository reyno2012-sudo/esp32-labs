import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Every widget the intro lessons reference, each in its own chunk.
export const introWidgets = {
  usb: lazyWidget(() => import("./UsbPreview"), "UsbPreview"),
  hello: lazyWidget(() => import("./HelloPreview"), "HelloPreview"),
  led: lazyWidget(() => import("./LedPreview"), "LedPreview"),
} as const satisfies WidgetMap;
