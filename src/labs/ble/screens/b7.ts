// B7 Music: keys · sequencer · roll · link · log.
import { DISPLAY_FONT, drawText, MONO_FONT, type ScopePalette } from "@/lib/canvas";
import type { ScreenSpec } from "@/labs/shared/lab-screen/types";
import type { BleState } from "../kit/state";

interface Note {
  n: number;
  /** Played by this board (violet) or by the synth (blue). */
  out: boolean;
  at: number;
}

export interface B7State extends BleState {
  listening: boolean;
  notes: Note[];
  seq: boolean;
  step: number;
  stepAt: number;
  /** One 16-bit pattern per drum: kick, snare, hat, clap. */
  beat: number[];
  walk: number;
}

const PENTA = [0, 2, 4, 7, 9];

export const b7Screen: ScreenSpec<B7State> = {
  views: ["keys", "sequencer", "roll", "link", "log"],
  captions: [
    (t) => t("labs-ble:screens.b7.captions.0"),
    (t) => t("labs-ble:screens.b7.captions.1"),
    (t) => t("labs-ble:screens.b7.captions.2"),
    (t) => t("labs-ble:screens.b7.captions.3"),
    (t) => t("labs-ble:screens.b7.captions.4"),
  ],
  boot: [
    "ble-lab-b7: NimBLE 2.5.1 up, address 2C:4F:52:1A:9B:07, TX power 9 dBm",
    '  - advertising as MIDI instrument "Bench B7"',
  ],
  init: () => ({
    view: 0,
    timers: [],
    radio: "advertising",
    listening: false,
    notes: [],
    seq: false,
    step: 0,
    stepAt: 0,
    beat: [0x1111, 0x0000, 0x4444, 0x1010],
    walk: 0,
    footer: "advertising as MIDI instrument",
  }),
  actions: [
    {
      label: (_, t) => t("labs-ble:screens.b7.actions.macConnectInAudioMidiSetup"),
      run(st, term) {
        st.radio = "connected";
        st.encrypted = true;
        st.bonded = true;
        st.rssi = -48;
        st.listening = true;
        term.line("  + connected: 6E:11:A0:42:9C:33", "info");
        term.line("  > asked for a 7.5-15 ms interval (low latency)");
        term.line("  + a synth is listening (subscribed)", "info");
        st.footer = "a synth is listening";
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b7.actions.buttonClickANote"),
      run(st, term) {
        const n = 60 + (PENTA[st.walk % 5] ?? 0) + 12 * Math.floor(st.walk / 5);
        st.walk = (st.walk + 1) % 10;
        st.notes.push({ n, out: true, at: performance.now() });
        if (!st.listening) term.line("[W] no synth listening: notes stay on the screen", "warn");
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b7.actions.synthPlayE4"),
      run(st, term) {
        st.notes.push({ n: 64, out: false, at: performance.now() });
        term.line("  < note E4 vel 96 ch 1");
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b7.actions.seqOnOff"),
      run(st, term) {
        st.seq = !st.seq;
        st.stepAt = performance.now();
        term.line(`  - drums ${st.seq ? "on" : "off"}: house at 100 bpm`);
      },
    },
  ],
  draw(g, C, view, t, st) {
    const now = performance.now();
    if (st.seq) st.step = Math.floor((now - st.stepAt) / 150) % 16;
    if (view === 0) drawKeys(g, C, st, now);
    else if (view === 1) drawSequencer(g, C, st);
    else if (view === 2) drawRoll(g, C, st, now);
    else if (view === 3) drawLatency(g, C, t, st);
    else T(g, 8, 50, st.footer ?? "", C.muted, `10px ${MONO_FONT}`);
  },
};

const T = (
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: string,
  col: string,
  font?: string,
) => drawText(g, x, y, s, col, font);
const BOLD = `bold 12px ${DISPLAY_FONT}`;

const sounding = (st: B7State, out: boolean, now: number) =>
  new Set(st.notes.filter((n) => n.out === out && now - n.at < 300).map((n) => n.n));

function drawKeys(g: CanvasRenderingContext2D, C: ScopePalette, st: B7State, now: number) {
  const so = sounding(st, true, now);
  const si = sounding(st, false, now);
  ["C4", "D4", "E4", "G4", "A4"].forEach((nm, i) => {
    const on = so.has(60 + (PENTA[i] ?? 0));
    g.fillStyle = on ? C.violet : C.dim;
    g.fillRect(8 + i * 62, 34, 56, 40);
    T(g, 16 + i * 62, 58, nm, on ? C.ink : C.muted, BOLD);
  });
  const white = [0, 2, 4, 5, 7, 9, 11];
  for (let o = 0; o < 2; o++)
    white.forEach((s, w) => {
      const n = 60 + o * 12 + s;
      g.fillStyle = so.has(n) ? C.violet : si.has(n) ? C.blue : C.ink;
      g.fillRect(22 + (o * 7 + w) * 13, 82, 12, 34);
    });
  T(
    g,
    196,
    140,
    st.listening ? "synth listening" : "no synth yet",
    st.listening ? C.teal : C.amber,
  );
}

function drawSequencer(g: CanvasRenderingContext2D, C: ScopePalette, st: B7State) {
  ["kick", "snare", "hat", "clap"].forEach((d, r) => {
    T(g, 6, 44 + r * 22, d, C.muted);
    const pattern = st.beat[r] ?? 0;
    for (let s = 0; s < 16; s++) {
      const hit = (pattern >> s) & 1;
      const head = st.seq && s === st.step;
      g.fillStyle = hit ? (head ? C.amber : C.violet) : s % 4 ? C.paper : C.dim;
      g.fillRect(44 + s * 17, 38 + r * 22, 15, 18);
    }
  });
  T(
    g,
    6,
    136,
    `house · 100 bpm · ${st.seq ? "playing" : "stopped"} · channel 10 (drums)`,
    st.seq ? C.ink : C.muted,
  );
}

function drawRoll(g: CanvasRenderingContext2D, C: ScopePalette, st: B7State, now: number) {
  st.notes
    .filter((n) => now - n.at < 6000)
    .forEach((n) => {
      const xx = 314 - ((now - n.at) / 6000) * 308;
      const y = 150 - ((n.n - 36) / 60) * 116;
      g.fillStyle = n.out ? C.violet : C.blue;
      g.fillRect(xx, y - 2, Math.max(2, Math.min(18, 314 - xx)), 4);
    });
}

function drawLatency(g: CanvasRenderingContext2D, C: ScopePalette, t: number, st: B7State) {
  T(g, 6, 44, "connection interval", C.muted);
  T(g, 6, 62, st.radio === "connected" ? "15.00 ms" : "15.00 ms (not connected)", C.blue, BOLD);
  g.fillStyle = C.dim;
  g.fillRect(6, 120, 308, 1);
  for (let e = 0; e <= 160; e += 15) {
    g.fillStyle = C.blue;
    g.fillRect(6 + (e / 160) * 308, 116, 1, 8);
  }
  const pr = [12, 49, 93, 131][Math.floor(t * 1.2) % 4] ?? 12;
  const sent = Math.ceil(pr / 15) * 15;
  g.fillStyle = C.violet;
  g.beginPath();
  g.arc(6 + (pr / 160) * 308, 88, 4, 0, 7);
  g.fill();
  g.strokeStyle = C.amber;
  g.beginPath();
  g.moveTo(6 + (pr / 160) * 308, 88);
  g.lineTo(6 + (sent / 160) * 308, 120);
  g.stroke();
  T(g, 6 + (pr / 160) * 308, 80, `+${(sent - pr).toFixed(1)} ms`, C.amber);
}
