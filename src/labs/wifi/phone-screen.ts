// wifi-lab-w2's screen as the phone page drives it: the message view, the others as a pointer
// to W1, dimmed by the backlight setting. Plain drawing code, no React.
import {
  DISPLAY_FONT,
  drawText,
  MONO_FONT,
  SCREEN_H as H,
  SCREEN_W as W,
  type ScopePalette,
} from "@/lib/canvas";

export const PHONE_VIEWS = ["networks", "channels", "radar", "status", "message"] as const;
export const MESSAGE_VIEW = 4;
export const MAX_MESSAGE = 96;

export interface PhoneScreen {
  readonly view: number;
  readonly message: string;
  /** Backlight 20..255 */
  readonly backlight: number;
}

/** Greedy word wrap to `maxW` pixels, at most three lines (the firmware's limit). */
export function wrapText(measure: (text: string) => number, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) > maxW && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** "#rrggbb" → the body of PUT /api/led. */
export function ledBody(hex: string): string {
  const ch = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
  return `{"r":${ch(1)},"g":${ch(3)},"b":${ch(5)}}`;
}

const BODY = `13px ${DISPLAY_FONT}`;

export function drawPhoneScreen(g: CanvasRenderingContext2D, C: ScopePalette, s: PhoneScreen) {
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  drawText(g, 8, 19, "Wi-Fi", C.ink, `700 13px ${DISPLAY_FONT}`);
  drawText(g, 46, 19, PHONE_VIEWS[s.view] ?? "", C.muted, BODY);
  for (let i = 0; i < PHONE_VIEWS.length; i++) {
    g.beginPath();
    g.arc(266 + i * 10, 20, 3, 0, 7);
    g.fillStyle = i === s.view ? C.ink : C.dim;
    g.fill();
  }
  g.beginPath();
  g.arc(312, 20, 4, 0, 7);
  g.fillStyle = C.teal;
  g.fill();
  g.fillStyle = C.dim;
  g.fillRect(0, 28, W, 1);
  if (s.view === MESSAGE_VIEW) {
    if (!s.message) {
      drawText(g, 8, 70, "No message yet", C.muted, BODY);
      drawText(
        g,
        8,
        90,
        "Send one from http://bench.local or the dashboard",
        C.muted,
        `9px ${MONO_FONT}`,
      );
    } else {
      const big = s.message.length <= 30;
      g.font = big ? `700 26px ${DISPLAY_FONT}` : `14px ${DISPLAY_FONT}`;
      g.fillStyle = C.amber;
      wrapText((t) => g.measureText(t).width, s.message, W - 24).forEach((l, i) =>
        g.fillText(l, 12, (big ? 72 : 56) + i * (big ? 36 : 20)),
      );
    }
  } else drawText(g, 8, 92, `(${PHONE_VIEWS[s.view] ?? ""} view, see lesson W1)`, C.muted, BODY);
  // The backlight: a dimmer screen is a darker one.
  g.globalAlpha = (1 - s.backlight / 255) * 0.85;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
}
