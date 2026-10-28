// The B8 preview's story: connect, explore, pair and host, told with the same lines the
// firmware writes with BLE_NOTE, spaced out in time like the real thing.
import type { TerminalPrinter, Tone } from "@/ui/terminal/terminal-log";
import { later, MARK_TINT, type Mark } from "../../kit/state";
import { hx } from "../../protocol/hex";
import type { B8State, TreeNode } from "./state";

const TONE: Readonly<Record<Mark, Tone>> = {
  "+": "info",
  "!": "warn",
  x: "error",
  "<": "plain",
  ">": "plain",
  "-": "plain",
};

export function b8Note(
  st: B8State,
  term: TerminalPrinter,
  mark: Mark,
  text: string,
  delay = 0,
): void {
  later(st, delay, () => {
    st.log.push({ time: (performance.now() / 1000).toFixed(1).padStart(7), mark, text });
    st.footer = text;
    st.footerCol = MARK_TINT[mark];
    term.line(`  ${mark} ${text}`, TONE[mark]);
  });
}

function exploreTree(st: B8State, n: number): TreeNode[] {
  const d = st.devices[n];
  if (!d) return [];
  const lock = d.bonded ? "" : "locked until paired";
  if (d.hid)
    return [
      { l: 0, t: "1800 Generic Access" },
      { l: 1, t: "2A00 Device Name", p: "R", v: d.name },
      { l: 0, t: "180A Device Information" },
      { l: 1, t: "2A29 Manufacturer", p: "R", v: "Bench Labs" },
      { l: 0, t: "180F Battery" },
      { l: 1, t: "2A19 Battery Level", p: "RN", v: lock || "87 %" },
      { l: 0, t: "1812 HID (keyboard/mouse)" },
      { l: 1, t: "2A4B Report Map", p: "R" },
      { l: 1, t: "2A4D Report", p: "RN" },
      { l: 2, t: "2902 CCCD (subscribe)" },
      { l: 2, t: "2908 Report Reference" },
    ];
  if (n === 2)
    return [
      { l: 0, t: "1800 Generic Access" },
      { l: 1, t: "2A00 Device Name", p: "R", v: "JBL speaker" },
      { l: 0, t: "1801 Generic Attribute" },
      { l: 1, t: "2A05 Service Changed", p: "I" },
      { l: 0, t: "vendor service", v: "65786365-6c70-6f69-..." },
      { l: 1, t: "vendor value", p: "WN" },
      { l: 1, t: "vendor value", p: "RW" },
    ];
  return [
    { l: 0, t: "1800 Generic Access" },
    { l: 1, t: "2A00 Device Name", p: "R", v: d.name },
    { l: 0, t: "vendor service", v: "ba5e0000-b1e5-4ab1-9e5c..." },
  ];
}

export function b8Connect(st: B8State, term: TerminalPrinter, n: number, autoHost: boolean): void {
  if (st.radio === "connected") b8Disconnect(st, term);
  const d = st.devices[n];
  if (!d) return;
  st.pick = n;
  st.target = d.name;
  st.phase = "connecting";
  st.radio = "connecting";
  st.view = 0;
  b8Note(st, term, ">", `CONNECT_IND to ${d.name}`);
  later(st, 700, () => {
    st.radio = "connected";
    st.rssi = d.rssi;
    st.phase = "discovering";
    st.encrypted = d.bonded;
    st.bonded = d.bonded;
  });
  b8Note(st, term, "+", "connected: we are the central", 700);
  b8Note(st, term, "-", "MTU 65 agreed", 800);
  later(st, 1500, () => {
    st.phase = "";
    st.tree = exploreTree(st, n);
    st.treeNote = d.hid
      ? "A keyboard or mouse (HID 1812): long press = host"
      : n === 2
        ? "This is the JBL app's own service. The audio\ngoes over Classic Bluetooth: this chip has none."
        : "Only the maker's own services: its app speaks them.";
    st.view = 1;
    if (autoHost && d.hid) b8Host(st, term);
  });
  b8Note(
    st,
    term,
    "+",
    `${d.hid ? 5 : 3} services, ${d.hid ? 19 : 6} characteristics in 820 ms`,
    1500,
  );
  if (d.hid) b8Note(st, term, "-", "it is a keyboard/mouse (1812): type host", 1520);
  else if (n === 2)
    b8Note(st, term, "-", "JBL app's own service only: audio uses Classic BT", 1520);
}

export function b8Host(st: B8State, term: TerminalPrinter): void {
  const d = st.devices[st.pick];
  if (!d) return;
  const kbd = d.name === "Bench Keys";
  let at = 300;
  if (!st.encrypted) {
    later(st, at, () => {
      st.phase = "pairing";
      if (kbd) {
        st.passkey = 482915;
        st.compare = false;
      }
    });
    b8Note(st, term, ">", "pairing request (bond, MITM, Secure Connections)", at);
    if (kbd) b8Note(st, term, "!", "type 482915 on the keyboard, then Enter", at + 100);
    at += kbd ? 3600 : 900;
    later(st, at, () => {
      st.passkey = 0;
      st.encrypted = true;
      st.bonded = true;
      d.bonded = true;
    });
    b8Note(st, term, "+", `secured: ${kbd ? "passkey" : "Just Works"}, bonded, key 16 B`, at);
  }
  at += 400;
  later(st, at - 300, () => {
    st.phase = "reading the Report Map";
  });
  b8Note(
    st,
    term,
    "<",
    st.boot
      ? "boot protocol: no Report Map needed"
      : `Report Map: ${kbd ? 72 : 66} bytes, ${kbd ? 11 : 9} input fields`,
    at,
  );
  b8Note(
    st,
    term,
    ">",
    `CCCD 01 00: report ${st.boot ? 0 : kbd ? 1 : 2} (${st.boot ? "boot " : ""}${kbd ? "keyboard" : "mouse"})`,
    at + 100,
  );
  if (kbd && !st.boot) b8Note(st, term, ">", "CCCD 01 00: report 3 (media)", at + 150);
  later(st, at + 200, () => {
    st.phase = "";
    st.hosting = kbd ? "keyboard" : "mouse";
    st.view = kbd ? 2 : 3;
    if (!kbd) scribble(st);
  });
  b8Note(
    st,
    term,
    "+",
    `hosting: ${kbd ? "keyboard media keys" : "mouse"}${st.boot ? " (boot)" : ""}`,
    at + 200,
  );
}

export function b8Type(st: B8State, term: TerminalPrinter, text: string): void {
  if (st.hosting !== "keyboard")
    return term.line("[W] host the keyboard first (first quick button)", "warn");
  st.view = 2;
  const codeOf = (ch: string) => {
    const c = ch.toLowerCase();
    if (c === " ") return 0x2c;
    if (st.de && c === "y") return 0x1d;
    if (st.de && c === "z") return 0x1c;
    return c.charCodeAt(0) - 97 + 4;
  };
  [...text].forEach((ch, i) => {
    later(st, 160 * i, () => {
      const shift = ch !== ch.toLowerCase();
      const code = codeOf(ch);
      st.mods = shift ? 0x02 : 0;
      st.held = [code];
      st.text += ch;
      st.keys++;
      st.reports.push({
        id: st.boot ? 0 : 1,
        kind: "kbd",
        bytes: [st.mods, 0, code, 0, 0, 0, 0, 0],
        decoded: `mods ${hx(st.mods)} ${hx(code)}`,
      });
    });
    later(st, 160 * i + 110, () => {
      st.mods = 0;
      st.held = [];
    });
  });
}

export function b8Media(st: B8State, term: TerminalPrinter): void {
  if (st.hosting !== "keyboard")
    return term.line("[W] host the keyboard first (first quick button)", "warn");
  st.view = 2;
  st.media = "volume up";
  st.mediaAt = performance.now();
  st.reports.push({ id: 3, kind: "media", bytes: [0xe9, 0x00], decoded: "media volume up" });
  b8Note(st, term, "<", "media key: volume up (usage E9)");
}

// The mouse sim: a loop drawn by "moving" the mouse with the left button held.
function scribble(st: B8State) {
  st.strokes = [];
  st.trail = [];
  for (let i = 0; i <= 60; i++) {
    later(st, 50 * i, () => {
      const a = (i / 60) * Math.PI * 2;
      const x = Math.round(160 + Math.cos(a) * 70 + Math.cos(a * 3) * 14);
      const y = Math.round(92 + Math.sin(a) * 38);
      const dx = (x - st.mx) * 2;
      const dy = (y - st.my) * 2;
      st.mx = x;
      st.my = y;
      st.trail = [...st.trail.slice(-9), [x, y]];
      if (i === 30) {
        st.colour = (st.colour + 1) % 6;
        st.clickAt = performance.now();
      }
      st.strokes.push({ x, y, down: i > 0, colour: st.colour, size: st.brush });
      const b = i > 0 ? 1 : 0;
      st.reports.push({
        id: 2,
        kind: "mouse",
        bytes: [b, dx & 0xff, ((dx >> 8) & 0x0f) | ((dy & 0x0f) << 4), (dy >> 4) & 0xff, 0],
        decoded: `buttons ${hx(b)} x ${dx >= 0 ? "+" : ""}${dx} y ${dy >= 0 ? "+" : ""}${dy} wheel +0`,
      });
    });
  }
}

export function b8Disconnect(st: B8State, term: TerminalPrinter): void {
  st.timers.forEach(clearTimeout);
  st.timers = [];
  if (st.radio !== "connected") return term.line("[W] nothing connected", "warn");
  st.radio = "scanning";
  st.encrypted = false;
  st.hosting = "";
  st.phase = "";
  st.passkey = 0;
  st.tree = [];
  st.treeNote = "";
  b8Note(st, term, "!", "disconnected 0x16: we hung up");
}
