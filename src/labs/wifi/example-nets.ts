// Example networks shared by the W1 preview and "How a scan works". Made up on purpose: the
// guide never shows your neighbours' real network names.

export type Auth = "WPA2" | "WPA2/WPA3" | "WPA3" | "open";

export interface WifiNet {
  readonly ssid: string;
  /** dBm */
  readonly rssi: number;
  readonly ch: number;
  readonly auth: Auth;
  readonly bssid: string;
}

export const EXAMPLE_NETS: readonly WifiNet[] = [
  { ssid: "example-home", rssi: -42, ch: 6, auth: "WPA2", bssid: "02:00:00:00:00:01" },
  { ssid: "example-home-guest", rssi: -45, ch: 6, auth: "WPA2", bssid: "02:00:00:00:00:02" },
  { ssid: "neighbour-a", rssi: -63, ch: 1, auth: "WPA2/WPA3", bssid: "02:00:00:00:00:03" },
  { ssid: "neighbour-b", rssi: -68, ch: 11, auth: "WPA2", bssid: "02:00:00:00:00:04" },
  { ssid: "printer-direct", rssi: -71, ch: 6, auth: "WPA2", bssid: "02:00:00:00:00:05" },
  { ssid: "", rssi: -77, ch: 11, auth: "WPA2", bssid: "02:00:00:00:00:06" },
  { ssid: "cafe-free", rssi: -83, ch: 1, auth: "open", bssid: "02:00:00:00:00:07" },
  { ssid: "neighbour-c", rssi: -86, ch: 3, auth: "WPA3", bssid: "02:00:00:00:00:08" },
  { ssid: "tv-setup", rssi: -89, ch: 13, auth: "WPA2", bssid: "02:00:00:00:00:09" },
];

/** The three 2.4 GHz channels that don't overlap. */
export const CLEAN_CHANNELS: readonly number[] = [1, 6, 11];

export const netName = (n: WifiNet) => n.ssid || "(hidden)";

/** Signal bars 1..4, as the firmware draws them. */
export const signalBars = (rssi: number) =>
  rssi >= -55 ? 4 : rssi >= -67 ? 3 : rssi >= -78 ? 2 : 1;

export type Strength = "good" | "fair" | "poor";
export const strength = (rssi: number): Strength =>
  rssi >= -60 ? "good" : rssi >= -75 ? "fair" : "poor";

/** A stable colour per access point (FNV-1a of the BSSID), like the firmware's channel view. */
export function bssidHue(bssid: string): string {
  let h = 2166136261;
  for (const c of bssid) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return `hsl(${((h & 255) / 255) * 360}, 70%, 62%)`;
}

/** A stable angle on the radar per access point. */
export function bssidAngle(bssid: string): number {
  let h = 0;
  for (const c of bssid) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return (h % 628) / 100;
}
