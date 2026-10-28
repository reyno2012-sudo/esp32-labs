// The rfid-lab-rN firmware as the R1-R6 preview runs it: the cards in the field, the reader's
// settings, and the serial commands (the same words as kit/lib/rfid-lab-kit/src/lab_commands.h).
// Plain TypeScript: the preview draws `state` and wires buttons to these methods.
import type { Tone } from "@/ui/terminal/terminal-log";
import { bccOf, hx, hxs, RF, type Uid, withCrc } from "../protocol/bytes";
import { exampleCard } from "../protocol/card-memory";
import { EDGE } from "../edge/edge-data";
import {
  type CardData,
  RFID_VIEWS,
  type RfidScreenState,
  type TraceFrame,
} from "../screen/rfid-screen";
import { runCommand } from "./commands";
import { type LabId, type LabSpec, RFID_CMD_HELP, RFID_LABS } from "./labs";

export type FieldOn = "none" | "card" | "tag" | "both";
export type CardKey = "card" | "tag";

export interface LabState extends Omit<RfidScreenState, "uid" | "dots" | "hint"> {
  on: FieldOn;
  timeout: number;
  nextEdge: number;
  /** performance.now() until which the LED flashes (a read). */
  flashUntil: number;
  cards: Record<CardKey, CardData>;
}

/** What the firmware needs from its surroundings. */
export interface LabIO {
  print(text: string, tone?: Tone): void;
  now(): number;
  /** Runs `fn` after `ms`; cancelled when the preview closes. */
  after(ms: number, fn: () => void): void;
  /** The state changed outside a button press (a busy job finished). */
  changed(): void;
}

const id = (u: Uid, sep = ":") => u.map(hx).join(sep);

export function initialLabState(view: number): LabState {
  return {
    view,
    on: "none",
    polling: true,
    trace: true,
    taps: 0,
    rate: 0,
    selfTest: -1,
    gain: 4,
    irq: true,
    mhz: 4,
    timeout: 25000,
    frames: [],
    dump: null,
    credits: null,
    edge: null,
    note: "",
    noteBad: false,
    busy: null,
    progress: 0,
    coll: 0,
    nextEdge: 0,
    flashUntil: 0,
    cards: {
      card: { uid: RF.card.uid, mem: exampleCard(false) },
      tag: { uid: RF.tag.uid, mem: exampleCard(false, RF.tag.uid) },
    },
  };
}

/** The trace of one wake-up, as the firmware records it. */
export function wakeFrames(u: Uid, collisionBit: number): TraceFrame[] {
  const b = bccOf(u);
  const f: TraceFrame[] = [];
  let t = 0;
  const add = (dir: ">" | "<", bytes: readonly number[], name: string, dt: number, extra = "") => {
    t += dt;
    f.push({ t, dir, bytes, name: name + extra });
  };
  add(">", [0x52], "WUPA", 0, " (short)");
  add("<", [0x04, 0x00], "ATQA", 0.371);
  add(">", [0x93, 0x20], "ANTICOLL CL1", 0.27);
  if (collisionBit) {
    add("<", [0x9c, 0x4f, 0x2a & 0x3f], "UID + BCC", 0.57, `  collision at bit ${collisionBit}`);
    add(">", [0x93, 0x47, 0x9c, 0x4f, 0x6a], "ANTICOLL CL1", 0.31, "  23 bits known");
    add("<", [0x6a, u[3] ?? 0, b], "UID + BCC", 0.3);
  } else add("<", [...u, b], "UID + BCC", 0.565);
  add(">", withCrc([0x93, 0x70, ...u, b]), "SELECT CL1", 0.3);
  add("<", withCrc([0x08]), "SAK", 1.08);
  add(">", withCrc([0x50, 0x00]), "HLTA", 0.21);
  return f;
}

export class RfidLab {
  readonly spec: LabSpec;
  readonly env: string;
  readonly state: LabState;
  readonly io: LabIO;

  constructor(labId: LabId, state: LabState, io: LabIO) {
    this.state = state;
    this.io = io;
    this.spec = RFID_LABS[labId];
    this.env = `rfid-lab-${labId.toLowerCase()}`;
  }

  log = (text: string, tone: Tone = "info") => this.io.print(text, tone);

  /** The firmware's say(): the screen's footer note and a log line. */
  say = (text: string, bad = false) => {
    this.state.note = text;
    this.state.noteBad = bad;
    this.log(`[${bad ? "W" : "I"}][reader.h] say(): ${text}`, bad ? "warn" : "info");
  };

  /** The card the walk picks when both lie there: the one with a 1 at the first differing bit (the tag here). */
  selected(): CardKey | null {
    const on = this.state.on;
    return on === "both" ? "tag" : on === "none" ? null : on;
  }

  /** Position of the current view among this lab's views. */
  pos(): number {
    return Math.max(0, this.spec.views.indexOf(this.state.view));
  }

  /** The double-click action of the current view, if this lab has one. */
  action(): string | null {
    return this.spec.actions[this.state.view] ?? null;
  }

  /** What the screen draws right now. */
  screen(): RfidScreenState {
    const s = this.selected();
    const a = this.action();
    return {
      ...this.state,
      uid: s ? this.state.cards[s].uid : null,
      coll: s ? this.state.coll : 0,
      dots: { n: this.spec.views.length, i: this.pos() },
      hint: a ? `double-click: ${a}` : "click: next view",
    };
  }

  boot(lessonId: string) {
    this.log(`[I][lab.h] begin(): ${this.env}: reader task started on core 0, screen on core 1`);
    this.log("RC522 on SPI3: SS 15 SCK 16 MOSI 17 MISO 18 RST 14 IRQ 13 · 4 MHz", "plain");
    this.log("VersionReg 0x92: MFRC522 v2.0", "plain");
    this.printHelp();
    this.log(
      lessonId === "R1"
        ? "Type selftest, loopback or regs (no card needed), or use the buttons below."
        : "Type a command, or use the buttons: lay the card on the reader first.",
      "plain",
    );
  }

  printHelp() {
    this.log(`RFID lab ${this.spec.title}  (${this.env})`, "plain");
    this.spec.cmds.forEach((k) => {
      const [args, what] = RFID_CMD_HELP[k] ?? ["", ""];
      this.log(`  ${`${k} ${args}`.padEnd(28)} ${what}`, "plain");
    });
    this.log(`  ${"view <n>".padEnd(28)} show screen view n`, "plain");
    this.log(
      `Views: ${this.spec.views.map((v, i) => `${i + 1} ${RFID_VIEWS[v]}`).join(" · ")}`,
      "plain",
    );
  }

  setView(p: number) {
    const n = this.spec.views.length;
    this.state.view = this.spec.views[((p % n) + n) % n] ?? 0;
    this.log(`[I][lab.h] setView(): view ${this.pos() + 1}: ${RFID_VIEWS[this.state.view]}`);
  }

  nextView() {
    this.setView(this.pos() + 1);
  }

  setField(on: FieldOn) {
    const st = this.state;
    const before = this.selected();
    st.on = on;
    const now = this.selected();
    if (!now) {
      if (before) this.log("[I][reader.h] pollOnce(): card removed");
      st.rate = 0;
      return;
    }
    if (now === before) return;
    const u = st.cards[now].uid;
    st.taps++;
    st.flashUntil = this.io.now() + 300;
    st.rate = 100;
    st.coll = on === "both" ? 23 : 0;
    st.frames = wakeFrames(u, st.coll);
    this.log(
      `[I][reader.h] pollOnce(): card ${id(u)} · MIFARE Classic 1K · ATQA 0004 SAK 08${st.coll ? " · collision resolved" : ""}`,
    );
    this.printFrames();
  }

  printFrames() {
    if (!this.state.trace) return;
    this.state.frames.forEach((fr) =>
      this.log(
        `  ${fr.t.toFixed(3).padStart(8)} ms  ${fr.dir === ">" ? "reader >" : "  card >"} ${hxs(fr.bytes).padEnd(40)} ${fr.name}`,
        "plain",
      ),
    );
  }

  /** The card a command needs, or a warning; every read flashes the LED. */
  need(): CardData | null {
    const s = this.selected();
    if (!s) {
      this.say("no card: hold it on the reader (no answer)", true);
      return null;
    }
    this.state.flashUntil = this.io.now() + 300;
    return this.state.cards[s];
  }

  /** A job that takes a while: the footer shows its progress, then `done` runs. */
  busyFor(what: string, ms: number, done: () => void) {
    const st = this.state;
    st.busy = what;
    st.progress = 0;
    const t0 = this.io.now();
    const tick = () => {
      st.progress = Math.min(100, ((this.io.now() - t0) / ms) * 100);
      if (st.progress < 100) {
        this.io.after(60, tick);
        return;
      }
      st.busy = null;
      done();
      this.io.changed();
    };
    tick();
  }

  run(raw: string) {
    runCommand(this, raw);
  }

  /** The push button's double-click: this view's action. */
  doubleClick() {
    const a = this.action();
    if (!a) return;
    this.log(`> ${a}   (double-click)`, "plain");
    if (a === "trace") return this.run(`trace ${this.state.trace ? "off" : "on"}`);
    if (a === "credits add 1" && !this.state.credits) return this.run("credits init 50");
    if (a === "edge next") {
      const k = EDGE[this.state.nextEdge]?.key ?? "spi";
      this.state.nextEdge = (this.state.nextEdge + 1) % EDGE.length;
      return this.run(`edge ${k}`);
    }
    this.run(a);
  }
}
