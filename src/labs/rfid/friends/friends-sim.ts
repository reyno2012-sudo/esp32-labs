// R8's board as the preview runs it: the friend list (UID → friend id) and the friends screen.
import { DISPLAY_FONT, MONO_FONT, SCREEN_H, SCREEN_W, type ScopePalette } from "@/lib/canvas";
import type { Tone } from "@/ui/terminal/terminal-log";
import { hxs, RF } from "../protocol/bytes";
import { drawFriend2d, friendOf } from "./cast";

export interface FriendCard {
  readonly uid: string;
  readonly number: number;
  character: string;
  taps: number;
}

export interface Show extends FriendCard {
  readonly isNew: boolean;
  readonly fromApp: boolean;
}

export interface FriendsState {
  /** 0 stage, 1 cards. */
  view: number;
  cards: FriendCard[];
  show: Show | null;
  /** performance.now() of the last show. */
  showAt: number;
}

export const FRIENDS_VIEWS = ["stage", "cards"] as const;
export const MAX_CARDS = 12;
type Line = readonly [string, Tone];

export const initialFriends = (): FriendsState => ({
  view: 0,
  cards: [
    { uid: hxs(RF.card.uid).replace(/ /g, ""), number: 1, character: "fox", taps: 4 },
    { uid: hxs(RF.tag.uid).replace(/ /g, ""), number: 2, character: "", taps: 0 },
  ],
  show: null,
  showAt: -1e9,
});

/** The board shows a card's friend (or asks for one) and tells the apps. */
export function announce(
  st: FriendsState,
  c: FriendCard,
  isNew: boolean,
  fromApp: boolean,
  now: number,
): Line {
  st.show = { ...c, isNew, fromApp };
  st.showAt = now;
  st.view = 0;
  const f = friendOf(c.character);
  return [
    `[I][tap_reader.h] announce(): ${fromApp ? "show" : "tap"} card ${c.number} (${c.uid}): ${f ? f.name : "nobody yet"}${isNew ? ", new card" : ""}`,
    "info",
  ];
}

/** A tap of a known card (by index) or of a new one; `randomByte` makes a new card's UID. */
export function tapCard(
  st: FriendsState,
  which: number | "new",
  now: number,
  randomByte: () => number,
): Line {
  let c = which === "new" ? undefined : st.cards[which];
  if (!c) {
    if (st.cards.length >= MAX_CARDS)
      return [
        `[W][tap_reader.h] onTap(): the list is full (${MAX_CARDS} cards), forget one in the app`,
        "warn",
      ];
    c = {
      uid: Array.from({ length: 4 }, () =>
        randomByte().toString(16).padStart(2, "0").toUpperCase(),
      ).join(""),
      number: st.cards.length + 1,
      character: "",
      taps: 0,
    };
    // A new array, not a push: the preview's card menu re-renders from it.
    st.cards = [...st.cards, c];
    c.taps++;
    return announce(st, c, true, false, now);
  }
  c.taps++;
  return announce(st, c, c.taps === 1, false, now);
}

/** The LED colour while a friend shows (its body colour), or green for a card with nobody yet. */
export const showColor = (c: FriendCard) => friendOf(c.character)?.body ?? "var(--ok)";

/** The friends screen (labs/rfid-lab-r8/src/friends_views.h). */
export function drawFriendsScreen(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  st: FriendsState,
  now: number,
  reduce: boolean,
): void {
  const W = SCREEN_W;
  const H = SCREEN_H;
  const t = now / 1000;
  const T = (
    x: number,
    y: number,
    s: string,
    col: string,
    font = `11px ${DISPLAY_FONT}`,
    align: CanvasTextAlign = "left",
  ) => {
    g.font = font;
    g.fillStyle = col;
    g.textAlign = align;
    g.fillText(s, x, y);
    g.textAlign = "left";
  };
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  const since = (now - st.showAt) / 1000;
  const show = st.show;
  if (st.view === 0 && show && since < 6) {
    const f = friendOf(show.character);
    g.fillStyle = f ? f.body : C.teal;
    g.globalAlpha = 0.18;
    g.beginPath();
    g.arc(84, 100, 66, 0, 7);
    g.fill();
    g.globalAlpha = 1;
    for (let i = 0; i < 14; i++) {
      const a = i * 0.449 + 0.3;
      const k = since * (0.9 + (i % 4) * 0.15);
      if (k > 1.6) continue;
      g.fillStyle = i % 2 ? (f ? f.accent : C.amber) : C.ink;
      g.beginPath();
      g.arc(
        84 + Math.cos(a) * k * 110,
        100 - (Math.sin(a) * k * 90 - k * k * 40),
        2 + (i % 3),
        0,
        7,
      );
      g.fill();
    }
    if (!f) {
      const wob = reduce ? 0 : Math.sin(t * 6) * 4;
      g.fillStyle = C.ink;
      g.beginPath();
      g.roundRect(52, 68 + wob, 64, 44, 6);
      g.fill();
      T(84, 102 + wob, "?", C.paper, `bold 26px ${DISPLAY_FONT}`, "center");
      T(228, 66, `card ${show.number}`, C.muted, undefined, "center");
      T(
        228,
        94,
        show.isNew ? "New card!" : "Who lives here?",
        C.ink,
        `bold 14px ${DISPLAY_FONT}`,
        "center",
      );
      T(228, 116, "Give it a friend", C.ink, undefined, "center");
      T(228, 140, "drag one in the app", C.muted, undefined, "center");
    } else {
      const pop = Math.min(1, since / 0.6);
      const over = pop < 1 ? 1 + 2.7 * (pop - 1) ** 3 + 1.7 * (pop - 1) ** 2 : 1;
      const hop = since > 0.6 && !reduce ? Math.abs(Math.sin((since - 0.6) * 6)) : 0;
      drawFriend2d(
        g,
        f,
        84,
        146 - hop * 14,
        Math.max(4, 34 * over),
        t,
        since > 0.6 ? 1 + (1 - hop) * 0.15 : 1,
        C.paper,
      );
      T(
        228,
        72,
        show.taps > 1 && !show.fromApp ? "Hi again!" : "Hello!",
        C.muted,
        undefined,
        "center",
      );
      T(228, 104, f.name, C.ink, `bold 22px ${DISPLAY_FONT}`, "center");
      T(
        228,
        130,
        show.fromApp
          ? `card ${show.number}`
          : `card ${show.number}  -  ${show.taps} visit${show.taps === 1 ? "" : "s"}`,
        C.muted,
        undefined,
        "center",
      );
    }
  } else if (st.view === 0) {
    const k = 0.5 + 0.5 * Math.sin(t * 2.4);
    g.strokeStyle = k > 0.5 ? C.teal : C.dim;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(118, 40, 84, 54, 8);
    g.stroke();
    g.lineWidth = 1;
    T(160, 116, "Tap a card!", C.ink, `bold 14px ${DISPLAY_FONT}`, "center");
    const walkers = st.cards.flatMap((c) => friendOf(c.character) ?? []);
    walkers.forEach((f, i) => {
      const x = ((t * 26 + i * (360 / walkers.length)) % 360) - 20;
      const hop = reduce ? 0 : Math.abs(Math.sin(t * 5 + i));
      drawFriend2d(g, f, x, 152 - hop * 6, 12, t, 1 + (1 - hop) * 0.12, C.paper);
    });
    if (!walkers.length) T(160, 140, "a friend will pop out of it", C.muted, undefined, "center");
  } else {
    st.cards.forEach((c, i) => {
      const x = 8 + (i % 6) * 51;
      const y = 34 + Math.floor(i / 6) * 62;
      const f = friendOf(c.character);
      g.strokeStyle = C.dim;
      g.beginPath();
      g.roundRect(x + 0.5, y + 0.5, 47, 58, 6);
      g.stroke();
      T(x + 4, y + 12, String(c.number), C.muted, `9px ${MONO_FONT}`);
      if (f) {
        drawFriend2d(g, f, x + 23, y + 40, 11, t + i, 1, C.paper);
        T(x + 23, y + 53, f.name, C.ink, `9px ${DISPLAY_FONT}`, "center");
      } else T(x + 23, y + 34, "?", C.muted, `bold 14px ${DISPLAY_FONT}`, "center");
    });
  }
  T(8, 18, "FRIENDS", C.ink, `bold 12px ${DISPLAY_FONT}`);
  T(70, 18, FRIENDS_VIEWS[st.view] ?? "", C.muted);
  g.fillStyle = C.paper;
  g.fillRect(0, H - 11, W, 11);
  T(6, H - 3, "http://bench.local", C.muted, `8px ${MONO_FONT}`);
  T(W - 70, H - 3, `${st.cards.length} cards  1 app`, C.teal, `8px ${MONO_FONT}`);
}
