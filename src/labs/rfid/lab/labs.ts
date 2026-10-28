// What each lab's firmware has: its views and commands (kit/lib/rfid-lab-kit, labs/rfid-lab-rN/src/main.cpp).

export type LabId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";

export interface LabSpec {
  readonly title: string;
  /** Indexes into RFID_VIEWS, in button order. */
  readonly views: readonly number[];
  readonly cmds: readonly string[];
  /** Double-click action per view index (null: none in this lab). */
  readonly actions: readonly (string | null)[];
}

export const RFID_CMD_HELP: Readonly<Record<string, readonly [string, string]>> = {
  chip: ["", "read VersionReg again (92h NXP, B2h/88h clones, 00/FF = no answer)"],
  reset: ["", "hard reset of the reader chip (RST pin), then VersionReg"],
  selftest: ["", "the datasheet's digital self-test (clones: two runs compared)"],
  loopback: ["", "3,200 bytes through the chip's FIFO and back"],
  regs: ["", "15 registers with their bits and meaning"],
  spi: ["<MHz>", "SPI clock, 1-40 (default 4, the chip's limit is 10)"],
  gain: ["<0-7>", "receiver gain, 18-48 dB (default 4 = 33 dB)"],
  timeout: ["<us>", "how long the chip waits for a card (default 25000)"],
  irq: ["on|off", "wait on the IRQ wire, or poll the chip over SPI"],
  poll: ["on|off", "look for cards ~12 times a second, or pause"],
  trace: ["[on|off]", "the sniffer: print each card's frames (alone: toggle)"],
  inventory: ["", "find every card in the field, one by one"],
  dump: ["", "all 16 sectors with the factory key (hold the card still)"],
  read: ["<block>", "one block, 0-63"],
  write: ["<block> <text>", "16 bytes of text into a data block, read back"],
  credits: ["[init|add|use <n>]", "a value block on block 8, backup on 9"],
  edge: ["<test>", "spi gain timeout timing irq crc stress [n], or next"],
};

const r1 = ["chip", "reset", "selftest", "loopback", "regs", "spi", "gain", "timeout", "irq"];
const r2 = [...r1, "poll", "trace"];
const r3 = [...r2, "inventory"];
const r4 = [...r3, "dump", "read"];
const r5 = [...r4, "write", "credits"];
const r6 = [...r5, "edge"];
const actions = (inv: boolean) => [
  "selftest",
  inv ? "inventory" : null,
  "trace",
  "dump",
  "credits add 1",
  "edge next",
];

export const RFID_LABS: Readonly<Record<LabId, LabSpec>> = {
  R1: { title: "R1 Wire & talk", views: [0, 1], cmds: r1, actions: actions(false) },
  R2: { title: "R2 Wake a card", views: [0, 1, 2], cmds: r2, actions: actions(false) },
  R3: { title: "R3 Who's there", views: [0, 1, 2], cmds: r3, actions: actions(true) },
  R4: { title: "R4 Inside the card", views: [0, 1, 2, 3], cmds: r4, actions: actions(true) },
  R5: { title: "R5 Write & count", views: [0, 1, 2, 3, 4], cmds: r5, actions: actions(true) },
  R6: { title: "R6 Edge lab", views: [0, 1, 2, 3, 4, 5], cmds: r6, actions: actions(true) },
};

/** The quick-command buttons under each lab's monitor. */
export const QUICK: Readonly<Record<LabId, readonly string[]>> = {
  R1: ["chip", "reset", "selftest", "loopback", "regs"],
  R2: ["trace off", "trace on", "gain 0", "gain 7", "gain 4"],
  R3: ["inventory", "help"],
  R4: ["dump", "read 0", "read 1"],
  R5: ["write 4 hello bench", "write 3 test", "credits init 50", "credits use 3", "credits add 10"],
  R6: ["edge spi", "edge timeout", "edge timing", "edge stress 500"],
};

export const isLabId = (id: string): id is LabId => id in RFID_LABS;

/** The firmware's self-test result on an NXP v2.0 chip (datasheet 16.1.1). */
export const SELFTEST_V2 = [
  0x00, 0xeb, 0x66, 0xba, 0x57, 0xbf, 0x23, 0x95, 0xd0, 0xe3, 0x0d, 0x3d, 0x27, 0x89, 0x5c, 0xde,
  0x9d, 0x3b, 0xa7, 0x00, 0x21, 0x5b, 0x89, 0x82, 0x51, 0x3a, 0xeb, 0x02, 0x0c, 0xa5, 0x00, 0x49,
  0x7c, 0x84, 0x4d, 0xb3, 0xcc, 0xd2, 0x1b, 0x81, 0x5d, 0x48, 0x76, 0xd5, 0x71, 0x61, 0x21, 0xa9,
  0x86, 0x96, 0x83, 0x38, 0xcf, 0x9d, 0x5b, 0x6d, 0xdc, 0x15, 0xba, 0x3e, 0x7d, 0x95, 0x3b, 0x2f,
] as const;
