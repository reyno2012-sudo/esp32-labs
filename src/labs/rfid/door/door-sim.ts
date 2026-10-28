// R7's board as the preview runs it: the card list, taps, the app's actions and the door screen.
import { DISPLAY_FONT, MONO_FONT, SCREEN_H, SCREEN_W, type ScopePalette } from "@/lib/canvas";
import type { Tone } from "@/ui/terminal/terminal-log";
import { hxs, RF } from "../protocol/bytes";
import { type DoorCard, doorDecide } from "./door-rules";

export type DoorKey = "white" | "tag" | "stranger";
export interface DoorEntry extends DoorCard {
  readonly name: string;
  readonly uid: string;
  blocked: boolean;
  uses: number;
}
export interface DoorEvent {
  readonly t: string;
  readonly who: string;
  readonly d: string;
}
export interface DoorSimState {
  mode: "locked" | "open" | "denied";
  /** performance.now() when OPEN / DENIED ends. */
  until: number;
  name: string;
  why: string;
  lockdown: boolean;
  /** 0 door, 1 cards, 2 log. */
  view: number;
  log: DoorEvent[];
  /** performance.now() until which the board waits for the copy's second card. */
  copyUntil: number;
  cards: Record<DoorKey, DoorEntry>;
}

export const DOOR_VIEWS = ["door", "cards", "log"] as const;
type Line = readonly [string, Tone];

const compact = (u: readonly number[]) => hxs(u).replace(/ /g, "");
const entry = (
  name: string,
  uid: string,
  role: DoorCard["role"],
  uses: number,
  listed = true,
): DoorEntry => ({ name, uid, listed, role, blocked: false, until: "none", from: 0, to: 0, uses });

export const initialDoor = (): DoorSimState => ({
  mode: "locked",
  until: 0,
  name: "",
  why: "",
  lockdown: false,
  view: 0,
  log: [],
  copyUntil: 0,
  cards: {
    white: entry("White card", compact(RF.card.uid), "resident", -1),
    tag: entry("Key tag", compact(RF.tag.uid), "guest", 2),
    stranger: entry("", "04A1B2C3", "resident", -1, false),
  },
});

/** What a tap of this card would get right now. */
export function decide(st: DoorSimState, c: DoorCard, hour: number): string {
  const r = doorDecide(c, { lockdown: st.lockdown, synced: true, hour });
  return r ? r.says : "granted";
}

/** A tap: the board decides, opens or denies, logs it. */
export function tap(
  st: DoorSimState,
  key: DoorKey,
  now: number,
  clock: string,
  hour: number,
): Line {
  const c = st.cards[key];
  const d = decide(st, c, hour);
  if (d === "granted" && c.uses > 0) c.uses--;
  st.mode = d === "granted" ? "open" : "denied";
  st.until = now + (d === "granted" ? 5000 : 2000);
  st.name = c.name || c.uid;
  st.why = d;
  st.log.push({ t: clock, who: c.name || c.uid, d });
  return [
    `[I][door.h] event(): tap ${c.name || c.uid} ${d}${key === "tag" && d === "granted" ? ` (uses left ${c.uses})` : ""}`,
    d === "granted" ? "info" : "warn",
  ];
}

/** The door relocks once OPEN or DENIED has run out. */
export function stepDoor(st: DoorSimState, now: number): void {
  if (st.mode !== "locked" && now > st.until) st.mode = "locked";
}

export function ledColor(st: DoorSimState): string | null {
  if (st.mode === "open") return "var(--ok)";
  if (st.mode === "denied") return "var(--danger)";
  return st.lockdown ? "var(--warn)" : null;
}

const MONO = `8px ${MONO_FONT}`;

/** The door screen (labs/rfid-lab-r7/src/door_views.h). */
export function drawDoorScreen(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  st: DoorSimState,
  now: number,
  reduce: boolean,
  hour: number,
): void {
  const W = SCREEN_W;
  const H = SCREEN_H;
  const T = (x: number, y: number, s: string, col: string, font = MONO) => {
    g.font = font;
    g.fillStyle = col;
    g.fillText(s, x, y);
  };
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  T(8, 18, "DOOR", C.ink, `bold 12px ${DISPLAY_FONT}`);
  T(48, 18, DOOR_VIEWS[st.view] ?? "", C.muted, `11px ${DISPLAY_FONT}`);
  if (st.lockdown) {
    g.fillStyle = C.amber;
    g.fillRect(150, 6, 76, 16);
    T(158, 17, "LOCKDOWN", C.paper);
  }
  g.fillStyle = C.dim;
  g.fillRect(0, 28, W, 1);
  if (st.view === 0 && now < st.copyUntil) {
    for (let i = 0; i < 3; i++) {
      const k = reduce ? 0.3 * i : (now / 1250 + i / 3) % 1;
      g.strokeStyle = C.dim;
      g.globalAlpha = 1 - k;
      g.beginPath();
      g.arc(64, 96, 14 + k * 40, 0, 7);
      g.stroke();
      g.globalAlpha = 1;
    }
    g.strokeStyle = C.muted;
    g.strokeRect(36.5, 74.5, 36, 26);
    g.fillStyle = C.ink;
    g.fillRect(46, 82, 36, 26);
    T(128, 64, "COPY: 2ND CARD", C.amber, `bold 12px ${DISPLAY_FONT}`);
    T(128, 84, "Lift the first card, lay", C.ink);
    T(128, 96, "the card to copy onto", C.ink);
    T(128, 114, "from White card", C.muted);
    T(128, 126, `${Math.ceil((st.copyUntil - now) / 1000)} s left`, C.muted);
  } else if (st.view === 0) {
    const blink = st.mode === "denied" && !reduce && Math.floor(now / 120) % 2;
    const col =
      st.mode === "open" ? C.teal : st.mode === "denied" ? (blink ? C.dim : C.coral) : C.muted;
    drawLock(g, C, 62, 104, st.mode === "open" ? 1 : 0, col);
    T(
      120,
      80,
      st.mode === "open" ? "OPEN" : st.mode === "denied" ? "DENIED" : "LOCKED",
      col,
      `bold 26px ${DISPLAY_FONT}`,
    );
    if (st.mode === "open") {
      T(122, 100, `welcome, ${st.name}`, C.ink, `11px ${DISPLAY_FONT}`);
      g.strokeStyle = C.dim;
      g.strokeRect(122.5, 112.5, 180, 6);
      g.fillStyle = C.teal;
      g.fillRect(123, 113, (178 * Math.max(0, st.until - now)) / 5000, 5);
    } else if (st.mode === "denied") {
      T(122, 100, st.why, C.ink, `11px ${DISPLAY_FONT}`);
      T(122, 114, st.name, C.muted);
    } else
      T(
        122,
        100,
        `${Object.values(st.cards).filter((c) => c.listed).length} cards in the list`,
        C.muted,
      );
  } else if (st.view === 1) {
    Object.values(st.cards)
      .filter((c) => c.listed)
      .forEach((c, i) => {
        const d = decide(st, c, hour);
        const col = d === "granted" ? C.teal : d === "blocked" ? C.coral : C.amber;
        g.fillStyle = col;
        g.beginPath();
        g.arc(12, 39 + i * 13, 3, 0, 7);
        g.fill();
        T(22, 42 + i * 13, c.name, C.ink);
        T(160, 42 + i * 13, c.role, C.muted);
        T(240, 42 + i * 13, d, col);
      });
  } else {
    st.log.slice(-9).forEach((e, i) => {
      T(6, 42 + i * 13, e.t, C.muted);
      T(44, 42 + i * 13, e.who, C.ink);
      T(
        180,
        42 + i * 13,
        e.d,
        e.d === "granted" ? C.teal : e.d === "data copied here" ? C.amber : C.coral,
      );
    });
    if (!st.log.length) T(8, 46, "No events yet: tap a card.", C.muted);
  }
  g.fillStyle = C.paper;
  g.fillRect(0, H - 11, W, 11);
  T(6, H - 3, "http://bench.local", C.muted);
  T(W - 40, H - 3, "1 app", C.teal);
}

function drawLock(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  cx: number,
  cy: number,
  open: number,
  col: string,
) {
  g.strokeStyle = col;
  g.lineWidth = 5;
  g.beginPath();
  g.arc(cx + open * 12, cy - 18 - open * 8, 11, Math.PI, 0);
  g.stroke();
  g.fillStyle = col;
  g.fillRect(cx + 8 + open * 12, cy - 18 - open * 8, 5, 8 + open * 8);
  if (!open) g.fillRect(cx - 13, cy - 18, 5, 8);
  g.fillRect(cx - 20, cy - 10, 40, 32);
  g.fillStyle = C.paper;
  g.beginPath();
  g.arc(cx, cy + 2, 4, 0, 7);
  g.fill();
  g.fillRect(cx - 1, cy + 4, 3, 9);
  g.lineWidth = 1;
}
