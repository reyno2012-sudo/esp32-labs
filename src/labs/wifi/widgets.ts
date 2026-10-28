import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Every widget the wifi lessons reference, each in its own chunk.
export const wifiWidgets = {
  wifi: lazyWidget(() => import("./WifiPreview"), "WifiPreview"),
  phone: lazyWidget(() => import("./PhonePreview"), "PhonePreview"),
  weather: lazyWidget(() => import("./WeatherPreview"), "WeatherPreview"),
  wifiScan: lazyWidget(() => import("./ScanConcepts"), "ScanConcepts"),
  webConcepts: lazyWidget(() => import("./WebConcepts"), "WebConcepts"),
  remoteConcepts: lazyWidget(() => import("./RemoteConcepts"), "RemoteConcepts"),
  httpsFlow: lazyWidget(() => import("./HttpsFlow"), "HttpsFlow"),
  wifiRoadmap: lazyWidget(() => import("./Roadmap"), "Roadmap"),
} as const satisfies WidgetMap;
