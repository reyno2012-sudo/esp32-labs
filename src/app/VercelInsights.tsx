import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { env } from "@/config/env";
import { hashRouteUrl } from "@/lib/insights-url";

const withRoutePath = (event: BeforeSendEvent): BeforeSendEvent => ({
  ...event,
  url: hashRouteUrl(event.url),
});

/**
 * Vercel Web Analytics (visits, per lesson) and Speed Insights (Core Web Vitals). Both scripts are
 * served by Vercel itself, so they only exist on a Vercel deployment: in development and in a plain
 * local build nothing is loaded.
 */
export function VercelInsights() {
  if (!env.onVercel) return null;
  return (
    <>
      <Analytics beforeSend={withRoutePath} />
      <SpeedInsights beforeSend={(data) => ({ ...data, url: hashRouteUrl(data.url) })} />
    </>
  );
}
