import { lazy } from "react";
import type { WidgetComponent } from "./types";

/**
 * Code-splits one widget: its module is only downloaded when a lesson shows it.
 * `lazyWidget(() => import("./UsbPreview"), "UsbPreview")` keeps named exports everywhere.
 */
export function lazyWidget<K extends string, M extends Record<K, WidgetComponent>>(
  load: () => Promise<M>,
  name: K,
) {
  return lazy(async () => ({ default: (await load())[name] }));
}

export type WidgetMap = Readonly<Record<string, ReturnType<typeof lazyWidget>>>;
