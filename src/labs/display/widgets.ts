import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Every widget the display lessons reference, each in its own chunk.
export const displayWidgets = {
  display: lazyWidget(() => import("./preview/DisplayPreview"), "DisplayPreview"),
  showcase: lazyWidget(() => import("./showcase/ShowcasePreview"), "ShowcasePreview"),
  displayWiring: lazyWidget(() => import("./wiring/DisplayWiring"), "DisplayWiring"),
  fullWiring: lazyWidget(() => import("./wiring/FullWiring"), "FullWiring"),
  screenVsButton: lazyWidget(() => import("./wiring/ScreenVsButton"), "ScreenVsButton"),
  buttonWiring: lazyWidget(() => import("./button/ButtonWiring"), "ButtonWiring"),
} as const satisfies WidgetMap;
