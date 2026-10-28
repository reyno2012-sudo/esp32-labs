// R8's cast, drawn like the board does (labs/rfid-lab-r8/src/characters.h): circles, ovals and
// triangles, no pictures in flash. The colours are the characters' own data, as in characters.h.

export interface Friend {
  /** What it is and what the app does with it: friends.cast.<id> in the labs-rfid catalogue. */
  readonly id: FriendId;
  readonly name: string;
  readonly body: string;
  readonly accent: string;
  readonly belly: string;
}

export type FriendId =
  | "fox"
  | "robot"
  | "dragon"
  | "penguin"
  | "alien"
  | "cat"
  | "frog"
  | "unicorn";

export const FRIEND_CAST: readonly Friend[] = [
  {
    id: "fox",
    name: "Foxy",
    body: "rgb(250,130,40)",
    accent: "rgb(60,36,28)",
    belly: "rgb(255,240,225)",
  },
  {
    id: "robot",
    name: "Bolt",
    body: "rgb(120,200,220)",
    accent: "rgb(255,210,60)",
    belly: "rgb(225,240,245)",
  },
  {
    id: "dragon",
    name: "Ember",
    body: "rgb(90,200,110)",
    accent: "rgb(255,90,70)",
    belly: "rgb(240,230,150)",
  },
  {
    id: "penguin",
    name: "Pip",
    body: "rgb(50,70,120)",
    accent: "rgb(255,160,40)",
    belly: "rgb(245,248,255)",
  },
  {
    id: "alien",
    name: "Zib",
    body: "rgb(170,240,80)",
    accent: "rgb(150,90,230)",
    belly: "rgb(220,255,190)",
  },
  {
    id: "cat",
    name: "Mochi",
    body: "rgb(255,160,200)",
    accent: "rgb(120,60,90)",
    belly: "rgb(255,235,245)",
  },
  {
    id: "frog",
    name: "Hopper",
    body: "rgb(60,180,90)",
    accent: "rgb(255,110,140)",
    belly: "rgb(200,240,150)",
  },
  {
    id: "unicorn",
    name: "Luna",
    body: "rgb(245,235,255)",
    accent: "rgb(255,200,70)",
    belly: "rgb(190,150,255)",
  },
];

export const friendOf = (id: string) => FRIEND_CAST.find((f) => f.id === id);

/** Fixed colours of characters.h shared by every friend. */
export const CAST_COLORS = {
  shadow: "rgba(0,0,0,0.25)",
  eyeWhite: "rgb(240,244,250)",
  cheek: "rgba(255,110,120,0.75)",
  robotLed: "rgb(255,96,84)",
  star: "rgb(255,214,90)",
} as const;

type Pt = readonly [number, number];

/** One friend standing on (cx, ground): s = head radius, t = seconds (blink), squash > 1 = wide. */
export function drawFriend2d(
  g: CanvasRenderingContext2D,
  f: Friend,
  cx: number,
  ground: number,
  s: number,
  t: number,
  squash: number,
  ink: string,
): void {
  const rx = s * squash;
  const ry = s / squash;
  const cy = ground - ry;
  const blink = (t + cx * 0.013) % 3.2 < 0.12;
  const fill = (c: string) => {
    g.fillStyle = c;
  };
  const circle = (x: number, y: number, r: number, c: string) => {
    fill(c);
    g.beginPath();
    g.arc(x, y, Math.max(1, r), 0, 7);
    g.fill();
  };
  const oval = (x: number, y: number, a: number, b: number, c: string) => {
    fill(c);
    g.beginPath();
    g.ellipse(x, y, Math.max(1, a), Math.max(1, b), 0, 0, 7);
    g.fill();
  };
  const tri = (a: Pt, b: Pt, c: Pt, col: string) => {
    fill(col);
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(c[0], c[1]);
    g.fill();
  };
  oval(cx, ground + 2, rx, Math.max(2, s / 6), CAST_COLORS.shadow);
  if (f.id === "fox" || f.id === "cat")
    for (const side of [-1, 1]) {
      const ex = cx + side * rx * 0.6;
      tri(
        [ex - s / 3, cy - ry * 0.6],
        [ex + s / 3, cy - ry * 0.6],
        [ex + (side * s) / 8, cy - ry - s / 2],
        f.body,
      );
      tri(
        [ex - s / 7, cy - ry * 0.7],
        [ex + s / 7, cy - ry * 0.7],
        [ex + (side * s) / 12, cy - ry - s / 5],
        f.id === "fox" ? f.accent : f.belly,
      );
    }
  if (f.id === "fox") oval(cx + rx + s / 4, cy + ry / 3, s / 2, s / 4, f.body);
  if (f.id === "robot") {
    g.strokeStyle = f.accent;
    g.beginPath();
    g.moveTo(cx, cy - ry);
    g.lineTo(cx, cy - ry - s / 2);
    g.stroke();
    circle(cx, cy - ry - s / 2, s / 7, Math.floor(t * 3) % 2 ? f.accent : CAST_COLORS.robotLed);
  }
  if (f.id === "dragon")
    for (const side of [-1, 1]) {
      const flap = Math.sin(t * 6) * s * 0.25;
      tri(
        [cx + side * rx * 0.7, cy],
        [cx + side * (rx + s * 0.9), cy - s * 0.7 - flap],
        [cx + side * (rx + s / 3), cy + s / 3],
        f.accent,
      );
      tri(
        [cx + (side * s) / 3, cy - ry * 0.8],
        [cx + (side * s) / 6, cy - ry * 0.8],
        [cx + (side * s) / 2, cy - ry - s / 3],
        f.belly,
      );
    }
  if (f.id === "alien")
    for (const side of [-1, 1]) {
      const tx = cx + (side * s) / 2 + (Math.sin(t * 4 + side) * s) / 8;
      g.strokeStyle = f.body;
      g.beginPath();
      g.moveTo(cx + (side * s) / 4, cy - ry * 0.8);
      g.lineTo(tx, cy - ry - s / 2);
      g.stroke();
      circle(tx, cy - ry - s / 2, s / 7, f.accent);
    }
  if (f.id === "unicorn") {
    for (let i = 0; i < 4; i++)
      circle(
        cx - rx * 0.7 - (i * s) / 8,
        cy - ry / 2 + (i * s) / 4,
        s / 4,
        `hsl(${280 + i * 35}, 85%, 75%)`,
      );
    tri(
      [cx - s / 7, cy - ry * 0.8],
      [cx + s / 7, cy - ry * 0.8],
      [cx, cy - ry - s * 0.75],
      f.accent,
    );
  }
  if (f.id === "frog")
    for (const side of [-1, 1]) circle(cx + (side * s) / 2, cy - ry * 0.8, s / 3, f.body);
  if (f.id === "robot") {
    fill(f.body);
    g.beginPath();
    g.roundRect(cx - rx, cy - ry, rx * 2, ry * 2, s / 3);
    g.fill();
    fill(f.belly);
    g.beginPath();
    g.roundRect(cx - rx * 0.7, cy - ry / 2, rx * 1.4, ry * 1.1, s / 5);
    g.fill();
  } else {
    oval(cx, cy, rx, ry, f.body);
    oval(cx, cy + ry / 4, rx * 0.7, ry * 0.6, f.belly);
  }
  const eyeY = f.id === "frog" ? cy - ry * 0.8 : cy - ry / 6;
  const eyeR = Math.max(2, s / 6);
  if (f.id === "alien") {
    circle(cx, eyeY, eyeR * 2, CAST_COLORS.eyeWhite);
    if (!blink) circle(cx + s / 12, eyeY, eyeR, ink);
  } else
    for (const side of [-1, 1]) {
      const ex = cx + side * s * (f.id === "frog" ? 0.5 : 0.3);
      if (blink) {
        fill(ink);
        g.fillRect(ex - eyeR, eyeY, eyeR * 2, Math.max(1, s / 16));
        continue;
      }
      if (f.id === "robot") {
        fill(ink);
        g.fillRect(ex - eyeR, eyeY - eyeR, eyeR * 2, eyeR * 2);
      } else circle(ex, eyeY, eyeR, ink);
      circle(ex + eyeR / 3, eyeY - eyeR / 3, eyeR / 3, CAST_COLORS.eyeWhite);
    }
  const my = cy + ry / 4;
  if (f.id === "penguin")
    tri([cx - s / 6, my - s / 12], [cx + s / 6, my - s / 12], [cx, my + s / 6], f.accent);
  else if (f.id === "fox") circle(cx, my - s / 12, s / 10, f.accent);
  else if (f.id === "robot") {
    fill(f.accent);
    g.fillRect(cx - s / 4, my, s / 2, Math.max(2, s / 10));
  } else {
    g.strokeStyle = ink;
    g.lineWidth = Math.max(1, s / 14);
    g.beginPath();
    g.arc(cx, my - s / 8, s / 4, 0.3, Math.PI - 0.3);
    g.stroke();
    g.lineWidth = 1;
  }
  if (f.id !== "robot" && f.id !== "alien")
    for (const side of [-1, 1]) circle(cx + side * rx * 0.6, my, s / 9, CAST_COLORS.cheek);
}
