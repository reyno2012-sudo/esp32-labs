// The commands every sound lab's shell understands (kit/lib/sound-kit's SoundLab), for the simulated
// serial monitor. Each returns true when it handled the line.
import type { ResolvedLesson } from "@/domain/lesson";
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { attenName, parseAtten } from "../model/level";
import type { Mic } from "../model/mic";
import { isWave } from "../model/speaker";
import { soundNote } from "./note";
import type { SoundSpec, SoundState } from "./types";

export const micName = (m: Mic) => (m.digital ? "INMP441 (I2S, digital)" : "KY-037 (ADC, analog)");
export const micLine = (m: Mic) =>
  m.digital
    ? "[I] Mic: INMP441 on I2S (SCK 40, WS 41, SD 42) at 16000 Hz, 24-bit"
    : "[I] Mic: AO on GPIO 6 (ADC1 channel 5) at 16000 Hz, attenuation 12 dB (0-3.1 V); DO on GPIO 21";

const TUNES: Readonly<Record<string, readonly [string, number]>> = {
  hello: ["C5/16 E5/16 G5/8", 220],
  scale: ["C5/8 D5/8 E5/8 F5/8 G5/8 A5/8 B5/8 C6/4", 200],
  twinkle: ["C5/4 C5/4 G5/4 G5/4 A5/4 A5/4 G5/2", 150],
  ode: ["E5/4 E5/4 F5/4 G5/4 G5/4 F5/4 E5/4 D5/4 C5/4 C5/4 D5/4 E5/4 E5/4. D5/8 D5/2", 150],
  alarm: ["A5/16 E5/16 A5/16 E5/16 A5/16 E5/16 A5/16 E5/16", 200],
};

/** The help text every lab prints (SoundLab::printHelp), with the lab's own commands first. */
export function printSoundHelp<S extends SoundState>(
  lesson: ResolvedLesson,
  spec: SoundSpec<S>,
  term: TerminalPrinter,
  st: SoundState,
): void {
  term.line(
    `Sound lab ${lesson.id} ${lesson.title}  (sound-lab-${lesson.id.toLowerCase()})  ·  mic: ${micName(st.mic)}`,
  );
  const row = (u: string, w: string) => term.line(`  ${u.padEnd(28)} ${w}`);
  spec.commands.forEach(([u, w]) => row(u, w));
  row("quiet", "re-learn the quiet of your room (half a second: shh)");
  row("mic [auto|ky037|inmp441]", "which microphone (saved; restarts)");
  row("vol <0-100>", "speaker volume (saved, default 40)");
  row("beep [Hz] [wave]", "a test tone on the speaker (sine square triangle saw noise)");
  row("tune <name>", "play a tune: hello scale twinkle ode alarm");
  row("plot [off]", "print the level as a bar every 50 ms");
  row("status", "the sampler, the ADC and the level, in numbers");
  row("rate <Hz>", "sample rate, 2000-48000 (default 16000)");
  row("atten <0|2.5|6|12>", "the ADC's input range (default 12 dB = 0-3.1 V)");
  row("view <n>", "show screen view n");
  term.line(`Views: ${spec.views.map((v, i) => `${i + 1} ${v}`).join(" · ")}`);
  term.line(
    "Button (GPIO 5, optional) or BOOT: click = next view, double-click = the view's action",
  );
}

/** Switches the microphone, as `mic <arg>` does (the board saves it and restarts). */
export function switchMic(st: SoundState, term: TerminalPrinter, arg: string): void {
  const m = st.mic;
  if (!["auto", "ky037", "inmp441"].includes(arg)) {
    term.line(`[W] mic auto | mic ky037 | mic inmp441   (now: ${micName(m)})`, "warn");
    return;
  }
  // auto: the preview pretends both microphones are wired, so the INMP441 answers.
  m.digital = arg !== "ky037";
  term.line("  - mic setting saved: restarting...");
  term.line(arg === "auto" ? "Listening for an INMP441 on the I2S pins..." : "");
  term.line(`Microphone: ${micName(m)} (mic setting: ${arg})`);
  term.line(micLine(m), "info");
  m.level.relearn();
}

export function setAtten(st: SoundState, term: TerminalPrinter | undefined, arg: string): void {
  const a = parseAtten(arg);
  if (a === undefined) {
    term?.line(`[W] atten 0 | 2.5 | 6 | 12   (now ${attenName(st.mic.atten)})`, "warn");
    return;
  }
  st.mic.atten = a;
  st.mic.level.relearn();
  soundNote(st, term, "-", `attenuation ${attenName(a)}`);
}

function printStatus(st: SoundState, term: TerminalPrinter): void {
  const m = st.mic;
  const L = m.level;
  const dc = m.dc ?? 0;
  term.line(
    `sampler: ${m.rate} Hz asked, ${m.rate} Hz measured · frames dropped 0 · DMA overruns 0`,
  );
  const clip = m.rawLow <= 0 || m.rawHigh >= 4095;
  term.line(
    `ADC: attenuation ${attenName(m.atten)} · bias ${m.toMv(dc)} mV (raw ${Math.round(dc)}) · last 100 ms raw ${m.rawLow}..${m.rawHigh}${clip ? " CLIPPING" : ""} · eFuse calibration`,
  );
  term.line(
    `level: ${L.fast.toFixed(1)} dBFS fast, ${L.slow.toFixed(1)} slow, floor ${L.floor.toFixed(1)} dBFS · ${L.above().toFixed(1)} dB above the quiet · peak ${L.peak.toFixed(1)} dBFS`,
  );
  if (!m.digital)
    term.line(`comparator DO: ${m.doHigh ? "HIGH" : "low"} now, ${m.doRises} rising edges`);
  else term.line(`INMP441: about ${m.spl().toFixed(0)} dB SPL (RMS dBFS + 111)`);
  term.line(`speaker: volume ${m.spk.vol}, ${m.spk.busy() ? "playing" : "quiet"}`);
}

function startPlot(st: SoundState, term: TerminalPrinter, arg: string): void {
  clearInterval(st.plotTimer);
  st.plotTimer = undefined;
  if (arg === "off") {
    soundNote(st, term, "-", "plot off");
    return;
  }
  soundNote(st, term, "-", "plot on: one bar per 50 ms");
  const m = st.mic;
  const L = m.level;
  let k = 0;
  const timer = setInterval(() => {
    const a = L.instAbove();
    const n = Math.round(Math.min(1, a / 60) * 40);
    const p = Math.round(Math.min(1, (L.peak - L.floor) / 60) * 40);
    term.line(
      `${a.toFixed(1).padStart(5)} dB |${Array.from({ length: 40 }, (_, i) => (i < n ? "#" : i === p ? "|" : " ")).join("")}| DO ${m.doHigh ? 1 : 0}`,
    );
    // The preview stops after 3 s; the board goes on until plot off.
    if (++k >= 60) clearInterval(timer);
  }, 50);
  st.plotTimer = timer;
}

/** Commands every lab shares (the shell's own). */
export function soundShell<S extends SoundState>(
  line: string,
  st: S,
  term: TerminalPrinter,
  lesson: ResolvedLesson,
  spec: SoundSpec<S>,
): boolean {
  const [cmd = "", ...rest] = line.split(/\s+/);
  const arg = rest.join(" ").toLowerCase();
  const m = st.mic;
  switch (cmd) {
    case "help":
    case "?":
      printSoundHelp(lesson, spec, term, st);
      return true;
    case "mic":
      switchMic(st, term, arg);
      return true;
    case "vol": {
      const v = Number(arg);
      if (!arg || !(v >= 0 && v <= 100)) term.line(`[W] vol <0-100>   (now ${m.spk.vol})`, "warn");
      else {
        m.spk.setVolume(v);
        soundNote(st, term, "-", `volume ${v}`);
      }
      return true;
    }
    case "beep": {
      const [hzs, wave = "sine"] = arg.split(/\s+/);
      const hz = hzs ? Number(hzs) : 440;
      if (!(hz >= 20 && hz <= 8000) || !isWave(wave))
        term.line("[W] beep [Hz 20-8000] [sine|square|triangle|saw|noise]", "warn");
      else {
        m.spk.beep(hz, 400, wave);
        soundNote(st, term, "-", `beep ${hz} Hz ${wave}`);
      }
      return true;
    }
    case "tune": {
      const tune = TUNES[arg];
      if (!tune) term.line("[W] tune hello | scale | twinkle | ode | alarm", "warn");
      else {
        m.spk.tune(tune[0], tune[1]);
        soundNote(st, term, "-", `tune ${arg}`);
      }
      return true;
    }
    case "quiet":
      m.level.relearn();
      soundNote(st, term, "-", "shh... learning the quiet");
      return true;
    case "status":
      printStatus(st, term);
      return true;
    case "atten":
      setAtten(st, term, arg);
      return true;
    case "rate": {
      const hz = Number(arg);
      if (!(hz >= 2000 && hz <= 48000))
        term.line(`[W] rate <Hz>, 2000-48000. Now ${m.rate}`, "warn");
      else {
        soundNote(st, term, "-", `rate ${hz} Hz`);
        term.line("[I] Mic: (the preview keeps 16000 Hz; the board really switches)", "info");
      }
      return true;
    }
    case "plot":
      startPlot(st, term, arg);
      return true;
    default:
      return false;
  }
}
