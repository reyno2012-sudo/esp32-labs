// B4's own views: the pairing ceremony track and the bonds with the private-address trick.
import { DISPLAY_FONT, drawText, type ScopePalette } from "@/lib/canvas";
import { hx } from "../protocol/hex";
import { B4_METHOD_NAMES, type B4State } from "./b4-state";

export const B4_PHASES = [
  "connect",
  "features",
  "method",
  "ECDH keys",
  "check",
  "encrypted",
  "keys out",
  "bonded",
] as const;

const B4_EXPLAIN: readonly (readonly [string, string])[] = [
  [
    "Connected, nothing secret yet: anyone listening",
    "can read every byte. Touch the Vault or type secure.",
  ],
  ["Pairing Request / Response: what each side can", "do (screen? keys? yes/no?), bond?, MITM?"],
  [
    "The two answers pick the method (see the guide's",
    "matrix). This board asks for MITM protection.",
  ],
  [
    "Each side sends a P-256 public key. Both compute",
    "the same secret (ECDH); it never goes on air.",
  ],
  ["A person proves no one sits in between: type the", "6 digits, or confirm both screens match."],
  ["Encrypted with AES-CCM. From here an eavesdropper", "sees noise."],
  [
    "Keys to remember go over the encrypted link: LTK",
    "(the session key) and IRK (who you really are).",
  ],
  ["Bonded: saved in flash. Next connection skips", "straight to encrypted, no person needed."],
];

const T = (
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: string,
  col: string,
  font?: string,
) => drawText(g, x, y, s, col, font);

export function drawCeremony(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  t: number,
  st: B4State,
): void {
  const up = st.radio === "connected";
  const y = 70;
  const X = (i: number) => 22 + i * 39;
  let last = -1;
  st.at.forEach((v, i) => {
    if (v) last = i;
  });
  if (!up && !st.failed) last = -1;
  g.fillStyle = C.dim;
  g.fillRect(X(0), y, X(7) - X(0), 1);
  if (last > 0) {
    g.fillStyle = C.teal;
    g.fillRect(X(0), y, X(last) - X(0), 2);
  }
  const waiting = last + 1 < 8 ? last + 1 : -1;
  B4_PHASES.forEach((name, i) => {
    const x = X(i);
    const reached = up && Boolean(st.at[i]);
    g.beginPath();
    g.arc(x, y, 7, 0, 7);
    if (st.failed && i === waiting) {
      g.fillStyle = C.coral;
      g.fill();
      g.strokeStyle = C.paper;
      g.beginPath();
      g.moveTo(x - 4, y - 4);
      g.lineTo(x + 4, y + 4);
      g.moveTo(x - 4, y + 4);
      g.lineTo(x + 4, y - 4);
      g.stroke();
    } else if (reached && st.inferred[i]) {
      g.fillStyle = C.paper;
      g.fill();
      g.strokeStyle = C.teal;
      g.stroke();
      g.fillStyle = C.teal;
      g.beginPath();
      g.arc(x, y, 2, 0, 7);
      g.fill();
    } else if (reached) {
      g.fillStyle = i === 5 || i === 7 ? C.violet : C.teal;
      g.fill();
    } else if (up && i === waiting) {
      g.fillStyle = C.amber;
      g.globalAlpha = 0.5 + 0.45 * Math.sin(t * 5);
      g.fill();
      g.globalAlpha = 1;
    } else {
      g.fillStyle = C.dim;
      g.fill();
    }
    const w = name.length * 5;
    T(
      g,
      Math.max(0, Math.min(320 - w, x - w / 2)),
      y + (i % 2 ? 20 : -12),
      name,
      reached ? C.ink : C.muted,
    );
  });
  if (!up) {
    T(
      g,
      6,
      42,
      st.radio === "advertising" ? "Waiting for a phone to connect..." : "not advertising",
      C.muted,
    );
    if (st.failed) T(g, 6, 106, `last attempt failed: ${st.failed}`, C.coral);
    else if (st.how) T(g, 6, 106, `last time: ${st.how}`, C.muted);
  } else {
    const title = st.how
      ? `${st.how}${st.how === "stored keys" ? ": bonded before, no ceremony" : ""}`
      : "plain text";
    T(
      g,
      6,
      44,
      title,
      st.failed ? C.coral : st.how ? C.violet : C.muted,
      `bold 12px ${DISPLAY_FONT}`,
    );
    if (st.failed) {
      T(g, 6, 106, `failed: ${st.failed}`, C.coral);
      T(g, 6, 116, "the phone may need to forget the board first", C.muted);
    } else if (st.how === "Just Works" && waiting === 4) {
      T(g, 6, 106, "Just Works: no check. Stops eavesdroppers, but a", C.amber);
      T(g, 6, 116, "man in the middle could have done the same.", C.amber);
    } else {
      const [a, b] = B4_EXPLAIN[waiting >= 0 ? waiting : 7] ?? ["", ""];
      T(g, 6, 106, a, C.ink);
      T(g, 6, 116, b, C.muted);
    }
  }
  T(
    g,
    6,
    134,
    `board asks: ${B4_METHOD_NAMES[st.method]} · lock off · ${st.allow ? "bonded only" : "anyone"}`,
    C.muted,
  );
  T(g, 6, 146, "ring = inferred: NimBLE doesn't report that step", C.dim);
}

export function drawBonds(
  g: CanvasRenderingContext2D,
  C: ScopePalette,
  t: number,
  st: B4State,
): void {
  const here = st.radio === "connected";
  T(
    g,
    6,
    44,
    `${st.bonds.length} bonded`,
    st.bonds.length ? C.ink : C.muted,
    `bold 12px ${DISPLAY_FONT}`,
  );
  st.bonds.forEach((b, i) =>
    T(
      g,
      6,
      62 + i * 12,
      `${i + 1} ${b} static${here ? "  <- here" : ""}`,
      here ? C.violet : C.muted,
    ),
  );
  if (!st.bonds.length) T(g, 6, 62, "Nobody yet: pair a phone (touch the Vault).", C.muted);
  g.strokeStyle = C.muted;
  g.beginPath();
  g.roundRect(220, 58, 26, 52, 5);
  g.stroke();
  // A new private address every 3 s, as a phone rotates its RPA.
  const slot = Math.floor(t / 3);
  const h = Math.imul(slot, 2654435761) >>> 0;
  T(g, 254, 66, "on air:", C.amber);
  T(
    g,
    254,
    76,
    `${hx(0x40 | ((h >>> 24) & 0x3f))}:${hx((h >>> 16) & 255)}:${hx((h >>> 8) & 255)}`,
    C.amber,
  );
  g.fillStyle = C.amber;
  g.beginPath();
  g.arc(246 + ((t % 3) / 3) * 40, 88, 2, 0, 7);
  g.fill();
  T(g, 254, 96, st.bonds.length ? "IRK says:" : "no IRK:", C.teal);
  T(g, 254, 106, st.bonds.length ? "same phone" : "a stranger", C.teal);
  T(g, 6, 132, "Identity address + IRK come with bonding. The IRK turns", C.muted);
  T(g, 6, 142, "each private address back into the identity: allow bonded", C.muted);
  T(g, 6, 152, "uses that to let only your phone connect.", C.muted);
}
