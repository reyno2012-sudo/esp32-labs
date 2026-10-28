// kit/lib/sound-kit/src/trigger.h in TypeScript (voice-activated recording), counted in milliseconds
// of sound instead of samples.

export interface TriggerConfig {
  startDb: number;
  holdMs: number;
  prerollMs: number;
  maxMs: number;
  minMs: number;
}

export type TriggerAction = "start" | "save" | "drop";

export interface TriggerResult {
  readonly action: TriggerAction;
  readonly from: number;
  readonly to: number;
}

export type TriggerState = "off" | "armed" | "rec";

export class VoiceTrigger {
  readonly cfg: TriggerConfig;
  state: TriggerState = "off";
  armed = false;
  manual = false;
  from = 0;
  trig = 0;
  lastLoud = 0;

  constructor(cfg: Partial<TriggerConfig> = {}) {
    this.cfg = { startDb: 15, holdMs: 1200, prerollMs: 500, maxMs: 20000, minMs: 400, ...cfg };
  }

  arm(on: boolean): void {
    if (this.state !== "rec") this.state = on ? "armed" : "off";
    this.armed = on;
  }

  #begin(now: number): TriggerResult {
    this.from = Math.max(0, now - this.cfg.prerollMs);
    this.trig = this.lastLoud = now;
    this.state = "rec";
    return { action: "start", from: this.from, to: now };
  }

  #end(to: number, action: TriggerAction): TriggerResult {
    this.state = this.armed ? "armed" : "off";
    this.manual = false;
    return { action, from: this.from, to };
  }

  /** Record now, by hand. */
  start(now: number): TriggerResult | null {
    if (this.state === "rec") return null;
    this.manual = true;
    return this.#begin(now);
  }

  stop(now: number): TriggerResult | null {
    return this.state === "rec" ? this.#end(now, "save") : null;
  }

  /** One level reading (dB above the quiet) at `now` ms. */
  push(above: number, now: number): TriggerResult | null {
    if (this.state === "armed" && above >= this.cfg.startDb) {
      this.manual = false;
      return this.#begin(now);
    }
    if (this.state !== "rec") return null;
    if (above >= this.cfg.startDb * 0.6) this.lastLoud = now;
    if (now - this.from >= this.cfg.maxMs) return this.#end(now, "save");
    if (!this.manual && now - this.lastLoud >= this.cfg.holdMs) {
      const to = Math.min(now, this.lastLoud + 500);
      return this.#end(to, this.lastLoud - this.trig + 100 >= this.cfg.minMs ? "save" : "drop");
    }
    return null;
  }
}
