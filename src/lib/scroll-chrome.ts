// Page chrome that reacts to scrolling (the lesson dock, the back-to-top button): "away" once you
// have left its place at the top, and "hidden" while you scroll down, back as soon as you scroll up.
// The decision is a pure function, so it is tested without a browser; useScrollChrome feeds it
// the scroll position.

export interface ScrollChrome {
  /** Left the top: show the small form. */
  away: boolean;
  /** Scrolling down: get out of the way. */
  hidden: boolean;
}

/** What the chrome remembers between scroll events. */
export interface ScrollMemory extends ScrollChrome {
  y: number;
  /** Where the current run in one direction began. */
  turn: number;
  down: boolean;
}

export const INITIAL_SCROLL: ScrollMemory = {
  away: false,
  hidden: false,
  y: 0,
  turn: 0,
  down: true,
};

/**
 * @param y        the page's scroll position
 * @param away     whether that position is past the chrome's place at the top
 * @param travel   how far (px) you must scroll one way before it reacts: ignores jitter and
 *                 trackpad bounce
 */
export function nextScrollChrome(
  prev: ScrollMemory,
  y: number,
  away: boolean,
  travel: number,
): ScrollMemory {
  const next = { ...prev, y, away };
  if (y > prev.y) {
    if (!prev.down) next.turn = prev.y;
    next.down = true;
    if (away && y - next.turn > travel) next.hidden = true;
  } else if (y < prev.y) {
    if (prev.down) next.turn = prev.y;
    next.down = false;
    if (next.turn - y > travel) next.hidden = false;
  }
  if (!away) next.hidden = false;
  return next;
}
