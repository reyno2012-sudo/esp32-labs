import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Every widget the ble lessons reference, each in its own chunk.
export const bleWidgets = {
  ble: lazyWidget(() => import("./SimBle"), "SimBle"),
  bleJourney: lazyWidget(() => import("./panels/journey/BleJourney"), "BleJourney"),
  bleRadio: lazyWidget(() => import("./panels/radio/BleRadio"), "BleRadio"),
  bleAnatomy: lazyWidget(() => import("./panels/anatomy/BleAnatomy"), "BleAnatomy"),
  bleScreens: lazyWidget(() => import("./BleScreens"), "BleScreens"),
  b2Builder: lazyWidget(() => import("./panels/b2/B2Builder"), "B2Builder"),
  b2Timing: lazyWidget(() => import("./panels/b2/B2Timing"), "B2Timing"),
  b3Seq: lazyWidget(() => import("./panels/b3/B3Seq"), "B3Seq"),
  b3Table: lazyWidget(() => import("./panels/b3/B3Table"), "B3Table"),
  b4Matrix: lazyWidget(() => import("./panels/b4/B4Matrix"), "B4Matrix"),
  b4Seq: lazyWidget(() => import("./panels/b4/B4Seq"), "B4Seq"),
  b5Seq: lazyWidget(() => import("./panels/b5/B5Seq"), "B5Seq"),
  b5Throughput: lazyWidget(() => import("./panels/b5/B5Throughput"), "B5Throughput"),
  b6Report: lazyWidget(() => import("./panels/b6/B6Report"), "B6Report"),
  b6Sound: lazyWidget(() => import("./panels/b6/B6Sound"), "B6Sound"),
  b7Packet: lazyWidget(() => import("./panels/b7/B7Packet"), "B7Packet"),
  b7Latency: lazyWidget(() => import("./panels/b7/B7Latency"), "B7Latency"),
  b8Flow: lazyWidget(() => import("./panels/b8/B8Flow"), "B8Flow"),
  b8Decoder: lazyWidget(() => import("./panels/b8/B8Decoder"), "B8Decoder"),
} as const satisfies WidgetMap;
