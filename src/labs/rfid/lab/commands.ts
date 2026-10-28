// The rfid-lab serial commands, one handler each (kit/lib/rfid-lab-kit/src/lab_commands.h).
import { asciiOf, crcA, hx, hxs, withCrc } from "../protocol/bytes";
import { blockKind, valueBlock, valueOf } from "../protocol/card-memory";
import { EDGE, type EdgeExperiment } from "../edge/edge-data";
import { SELFTEST_V2 } from "./labs";
import type { RfidLab } from "./rfid-lab";

const CHIP_LINE = "RC522 on SPI3: SS 15 SCK 16 MOSI 17 MISO 18 RST 14 IRQ 13 · 4 MHz";
const id = (u: readonly number[]) => u.map(hx).join(":");

const REGS: readonly (readonly [string, string, number | "gain", string])[] = [
  ["01", "CommandReg", 0x00, "bits 3-0: running command (0 = idle)"],
  ["04", "ComIrqReg", 0x14, "Tx Rx Idle HiA LoA Err Timer"],
  ["06", "ErrorReg", 0x00, "WrErr Temp - Ovfl Coll CRC Parity Proto"],
  ["14", "TxControlReg", 0x83, "bits 1-0: antenna drivers TX2 TX1"],
  ["26", "RFCfgReg", "gain", "bits 6-4: receiver gain"],
  ["2A", "TModeReg", 0x80, "bit 7 TAuto"],
  ["2B", "TPrescalerReg", 0xa9, "timer prescaler (A9h = 25 us ticks)"],
  ["2C", "TReloadRegH", 0x03, "timer reload, high byte"],
  ["2D", "TReloadRegL", 0xe8, "timer reload, low byte"],
  ["36", "AutoTestReg", 0x40, "40h normal, 09h self-test"],
  ["37", "VersionReg", 0x92, "91h v1.0 · 92h v2.0"],
];

function dumpLines(lab: RfidLab, uid: readonly number[], mem: readonly (readonly number[])[]) {
  lab.log(`Dump of ${id(uid)} (MIFARE Classic 1K), factory key A, sectors 0-15`, "plain");
  lab.log("  blk  data                                             ascii", "plain");
  mem.forEach((b, i) => {
    const kind = blockKind(b, i);
    const tag =
      kind === "trailer"
        ? "trailer ok: A writes all (transport)"
        : i === 0
          ? "maker: UID, BCC, SAK, ATQA"
          : kind === "value"
            ? `value ${valueOf(b)} · read AB write AB inc AB dec AB`
            : "read AB write AB inc AB dec AB";
    lab.log(`  ${String(i).padStart(3)}  ${hxs(b)}  |${asciiOf(b)}|  ${tag}`, "plain");
  });
  lab.log("  Key A always reads back as 00: the card never reveals it.", "plain");
}

/** The table each edge experiment prints, filled with the example numbers. */
function edgeTable(lab: RfidLab, e: EdgeExperiment) {
  const ex = e.example;
  const p = (s: string) => lab.log(s, "plain");
  if (e.key === "spi") {
    p("  MHz   bytes wrong   VersionReg reads wrong");
    ex.forEach(([l, v]) =>
      p(`  ${l.padStart(3)}   ${v.toFixed(1).padStart(5)} %        ${v > 5 ? 4 : 0} / 20`),
    );
  }
  if (e.key === "gain") {
    p("  gain    found (wake + select, 30 tries)");
    ex.forEach(([l, v]) => p(`  ${l} dB   ${String(v).padStart(3)} %`));
  }
  if (e.key === "timeout") {
    p("  timer     WUPA answered   wake + select ok   (20 tries each)");
    ex.forEach(([l, v]) =>
      p(
        `  ${String(l.endsWith("ms") ? parseInt(l, 10) * 1000 : l).padStart(5)} us   ${String(v).padStart(3)} %            ${String(v).padStart(3)} %`,
      ),
    );
  }
  if (e.key === "timing") {
    p("  step      min      avg      max   (us, start of command to answer)");
    ex.forEach(([l, v]) =>
      p(
        `  ${l.padEnd(6)}  ${String(Math.round(v * 0.9)).padStart(6)}   ${String(v).padStart(6)}   ${String(Math.round(v * 1.3)).padStart(6)}`,
      ),
    );
  }
  if (e.key === "irq")
    p(
      `  mode   SPI accesses / WUPA   ms / WUPA\n  poll   ${(ex[0]?.[1] ?? 0).toFixed(1).padStart(8)}                0.52\n  irq    ${(ex[1]?.[1] ?? 0).toFixed(1).padStart(8)}                0.47`,
    );
  if (e.key === "crc")
    p(
      `  chip coprocessor ${(ex[0]?.[1] ?? 0).toFixed(1)} us/frame (mostly SPI), ESP32 ${(ex[1]?.[1] ?? 0).toFixed(2)} us/frame, 0 mismatches`,
    );
  if (e.key === "stress") {
    p("  wake + select + auth + read block 4, 500 times in 9.8 s");
    ex.forEach(([l, v]) => p(`  ${l.padEnd(7)} ${String(v).padStart(4)}`));
  }
}

function edgeRun(lab: RfidLab, key: string) {
  const e = EDGE.find((x) => x.key === key);
  if (!e) return;
  if (key !== "spi" && key !== "crc" && key !== "irq" && !lab.selected())
    return lab.say(`${e.label}: no card answered, hold it on the reader`, true);
  lab.state.view = 5;
  lab.busyFor(e.label, 1600, () => {
    edgeTable(lab, e);
    lab.state.edge = e;
    lab.say(`${e.label}: example result (paste yours in the Experiments panel)`);
  });
}

function credits(lab: RfidLab, a: string) {
  lab.state.view = 4;
  const card = lab.need();
  if (!card) return;
  const [op, val] = a.split(/\s+/);
  const v = parseInt(val ?? "", 10);
  const cur = card.mem[8] ?? [];
  const has = blockKind(cur, 8) === "value";
  const usage = () => lab.log("[W][lab.h] warn(): credits init|add|use <n>, 0-100000", "warn");
  if (op === "init") {
    if (!(v >= 0)) return usage();
    card.mem[8] = valueBlock(v, 8);
    card.mem[9] = valueBlock(v, 9);
  } else if (op === "add" || op === "use") {
    if (!has) return lab.say("no credits on this card yet: credits init <n>", true);
    if (!(v >= 0)) return usage();
    if (op === "use" && valueOf(cur) < v)
      return lab.say(`only ${valueOf(cur)} credits, can't use ${v}`, true);
    card.mem[9] = valueBlock(valueOf(cur), 9);
    card.mem[8] = valueBlock(valueOf(cur) + (op === "add" ? v : -v), 8);
  } else if (op) return lab.log("[W][lab.h] warn(): credits init|add|use <n>", "warn");
  const now = card.mem[8] ?? [];
  if (blockKind(now, 8) !== "value")
    return lab.say("block 8 is not a value block: credits init <n>", true);
  lab.state.credits = { v: valueOf(now), b: valueOf(card.mem[9] ?? []) };
  lab.log(
    `  credits ${lab.state.credits.v} (block 8) · backup ${lab.state.credits.b} (block 9)`,
    "plain",
  );
  lab.say(`credits: ${lab.state.credits.v}`);
}

function read(lab: RfidLab, n: number) {
  if (!(n >= 0 && n <= 63)) return lab.log("[W][lab.h] warn(): read <block>, 0-63", "warn");
  const card = lab.need();
  if (!card) return;
  const b = card.mem[n] ?? [];
  lab.log(
    `  ${String(n).padStart(3)}  ${hxs(b)}  |${asciiOf(b)}|  ${blockKind(b, n) === "value" ? "value block" : ""}`,
    "plain",
  );
  if (lab.state.trace) {
    lab.state.frames = [
      { t: 0, dir: ">", bytes: [0x60, n], name: "AUTH key A: ok" },
      { t: 2.4, dir: ">", bytes: withCrc([0x30, n]), name: "READ", crypto: true },
      { t: 4.6, dir: "<", bytes: [...b, ...crcA(b)], name: "16 bytes + CRC", crypto: true },
    ];
    lab.log(
      `  ${(0).toFixed(3).padStart(8)} ms  reader > ${hxs([0x60, n])}${" ".repeat(35)} 3-pass auth inside the chip: ok`,
      "plain",
    );
    lab.log(
      `  ${(2.4).toFixed(3).padStart(8)} ms  reader > ${hxs(withCrc([0x30, n])).padEnd(40)} READ [encrypted on air]`,
      "plain",
    );
    lab.log(
      `  ${(4.6).toFixed(3).padStart(8)} ms    card > ${`${hxs(b.slice(0, 9))} ..`.padEnd(40)} 16 bytes + CRC [encrypted on air]`,
      "plain",
    );
  }
  lab.say(`block ${n} read`);
}

function write(lab: RfidLab, arg: string) {
  const m = /^(\d+)\s+(.+)$/.exec(arg);
  const blk = Number(m?.[1]);
  const text = m?.[2] ?? "";
  if (!m || blk < 1 || blk > 63)
    return lab.log("[W][lab.h] warn(): write <block> <text>, e.g. write 4 hello bench", "warn");
  if (blk % 4 === 3)
    return lab.say(`block ${blk}: not writable here (block 0 and trailers are off limits)`, true);
  const card = lab.need();
  if (!card) return;
  const data = [...text.slice(0, 16)]
    .map((ch) => ch.charCodeAt(0) & 0xff)
    .concat(new Array<number>(16).fill(0))
    .slice(0, 16);
  card.mem[blk] = data;
  lab.log(
    `  ${String(blk).padStart(3)}  ${hxs(data)}  |${asciiOf(data)}|  written and read back`,
    "plain",
  );
  lab.say(`block ${blk}: "${text.slice(0, 16)}"`);
}

/** One line typed into the serial monitor (or sent by a button). */
export function runCommand(lab: RfidLab, raw: string): void {
  const st = lab.state;
  const line = raw.trim();
  if (!line) return;
  lab.log(line, "you");
  const [cmd = "", ...rest] = line.split(/\s+/);
  const arg = rest.join(" ");
  const c = cmd.toLowerCase();
  const a = arg.toLowerCase();
  const n = parseInt(arg, 10);
  if (c === "help" || c === "?") return lab.printHelp();
  if (c !== "view" && !lab.spec.cmds.includes(c))
    return lab.log(
      `[W][lab.h] runLine(): unknown command '${line}' in ${lab.env} (type help)`,
      "warn",
    );
  switch (c) {
    case "chip":
    case "reset":
      lab.log(CHIP_LINE, "plain");
      lab.log("VersionReg 0x92: MFRC522 v2.0", "plain");
      if (c === "reset") lab.say("hard reset: VersionReg 0x92");
      return;
    case "selftest":
      st.view = 0;
      return lab.busyFor("self-test", 600, () => {
        lab.log("Self-test (datasheet 16.1.1), chip 0x92, FIFO level 64:", "plain");
        for (let r = 0; r < 4; r++)
          lab.log(
            SELFTEST_V2.slice(r * 16, r * 16 + 16)
              .map((x) => `${hx(x)} `)
              .join(""),
            "plain",
          );
        st.selfTest = 1;
        lab.say("self-test passed: 64/64 bytes match");
      });
    case "loopback":
      return lab.say(
        `FIFO loopback: ${st.mhz > 16 ? 41 : 0} of 3200 bytes wrong at ${st.mhz} MHz`,
        st.mhz > 16,
      );
    case "regs":
      lab.log("  addr  register        value  bits      meaning", "plain");
      REGS.forEach(([ad, name, value, what]) => {
        const v = value === "gain" ? st.gain << 4 : value;
        lab.log(
          `  ${ad}h   ${name.padEnd(15)} ${hx(v)}h    ${v.toString(2).padStart(8, "0")}  ${what}`,
          "plain",
        );
      });
      lab.log(
        "  SPI address bytes: read = 0x80 | reg << 1, write = reg << 1 (e.g. VersionReg read = 0xEE)",
        "plain",
      );
      return;
    case "spi":
      if (!(n >= 1 && n <= 40))
        return lab.log("[W][lab.h] warn(): spi <MHz>, 1-40 (the chip is rated for 10)", "warn");
      st.mhz = n;
      return lab.say(`SPI clock ${n} MHz${n > 10 ? ": above the chip's 10 MHz spec" : ""}`, n > 10);
    case "gain":
      if (!(n >= 0 && n <= 7))
        return lab.log("[W][lab.h] warn(): gain <0-7>: 0=18 1=23 4=33 5=38 6=43 7=48 dB", "warn");
      st.gain = n;
      return lab.say(`receiver gain ${gainDb(n)} dB`);
    case "timeout":
      if (!(n >= 25))
        return lab.log("[W][lab.h] warn(): timeout <us>, 25-1000000 (default 25000)", "warn");
      st.timeout = n;
      return lab.say(`chip timer ${n} us`);
    case "irq":
    case "poll":
    case "trace": {
      if (a !== "on" && a !== "off")
        return lab.log(`[W][lab.h] warn(): ${c} on | ${c} off`, "warn");
      const on = a === "on";
      if (c === "irq") {
        st.irq = on;
        return lab.say(`waiting by ${on ? "IRQ wire" : "polling"}`);
      }
      if (c === "poll") {
        st.polling = on;
        return lab.say(`card polling ${on ? "on" : "paused"}`);
      }
      st.trace = on;
      return lab.say(`sniffer ${on ? "on" : "off"}`);
    }
    case "inventory":
      return lab.busyFor("inventory", 500, () => {
        lab.log("Inventory: REQA, select one, halt it, repeat until nobody answers.", "plain");
        const one = lab.selected();
        const found = st.on === "both" ? (["tag", "card"] as const) : one ? [one] : [];
        found.forEach((k, i) =>
          lab.log(
            `  #${i + 1}  ${id(st.cards[k].uid)}  MIFARE Classic 1K  SAK 08${st.on === "both" && i === 0 ? "  collision at level 1 bit 23 -> chose 1" : ""}`,
            "plain",
          ),
        );
        lab.say(`inventory: ${found.length} card${found.length === 1 ? "" : "s"} in the field`);
      });
    case "dump": {
      st.view = 3;
      const card = lab.need();
      if (!card) return;
      return lab.busyFor("dump", 1400, () => {
        dumpLines(lab, card.uid, card.mem);
        st.dump = card;
        lab.say("dump: 16 sectors read");
      });
    }
    case "read":
      return read(lab, n);
    case "write":
      return write(lab, arg);
    case "credits":
      return credits(lab, a);
    case "edge": {
      const k = a.split(/\s+/)[0] ?? "";
      if (!EDGE.some((e) => e.key === k))
        return lab.log(
          "[W][lab.h] warn(): edge spi | gain | timeout | timing | irq | crc | stress [n]",
          "warn",
        );
      return edgeRun(lab, k);
    }
    case "view":
      if (!(n >= 1 && n <= lab.spec.views.length))
        return lab.log(`[W][lab.h] warn(): view <1-${lab.spec.views.length}>`, "warn");
      return lab.setView(n - 1);
  }
  lab.log(`[W][main.cpp] handleCommand(): unknown command '${line}' (type help)`, "warn");
}

/** Receiver gain setting 0-7 in dB, as the firmware maps it. */
export const gainDb = (n: number) => [18, 23, 18, 23, 33, 38, 43, 48][n] ?? 33;
