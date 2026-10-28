// R7's door rules, mirrored from kit/lib/door-rules/src/access_rules.h: checked in order, the first
// one that says no decides.

export type Role = "resident" | "guest" | "maintenance" | "admin";
export type Until = "none" | "future" | "past";
export type Lock = "front" | "admin";

export interface DoorCard {
  readonly listed: boolean;
  readonly role: Role;
  readonly blocked: boolean;
  readonly until: Until;
  /** Allowed hours [from, to); from === to means any time. */
  readonly from: number;
  readonly to: number;
  /** -1 = unlimited. */
  readonly uses: number;
  /** Where it is tapped (default: the front door). */
  readonly lock?: Lock;
}

export interface DoorClock {
  readonly lockdown: boolean;
  /** The board has internet time. */
  readonly synced: boolean;
  readonly hour: number;
}

export type RuleKey =
  | "unknown"
  | "blocked"
  | "admin"
  | "lockdown"
  | "clock"
  | "expired"
  | "hours"
  | "uses";

export interface DoorRule {
  readonly key: RuleKey;
  /** The question the panel shows is doorRules.rules.<key>.name in the labs-rfid catalogue. */
  readonly name: string;
  /** What the firmware says when this rule denies (screen, log and serial: stays English). */
  readonly says: string;
  check(c: DoorCard, k: DoorClock): boolean;
}

export const DOOR_RULES: readonly DoorRule[] = [
  { key: "unknown", name: "In the list?", says: "unknown card", check: (c) => c.listed },
  { key: "blocked", name: "Blocked?", says: "blocked", check: (c) => !c.blocked },
  {
    key: "admin",
    name: "Admin room: an admin card?",
    says: "admins only",
    check: (c) => c.lock !== "admin" || c.role === "admin",
  },
  {
    key: "lockdown",
    name: "Lockdown (maintenance and admin still open)",
    says: "lockdown",
    check: (c, k) => !k.lockdown || c.role === "maintenance" || c.role === "admin",
  },
  {
    key: "clock",
    name: "Needs a clock, and has one?",
    says: "no clock yet",
    check: (c, k) => !(c.until !== "none" || c.from !== c.to) || k.synced,
  },
  {
    key: "expired",
    name: "Before its end date?",
    says: "expired",
    check: (c) => c.until !== "past",
  },
  {
    key: "hours",
    name: "Inside its hours?",
    says: "outside hours",
    check: (c, k) =>
      c.from === c.to ||
      (c.from < c.to ? k.hour >= c.from && k.hour < c.to : k.hour >= c.from || k.hour < c.to),
  },
  { key: "uses", name: "Uses left?", says: "no uses left", check: (c) => c.uses !== 0 },
];

/** The first rule that says no, or null: granted. */
export function doorDecide(card: DoorCard, clock: DoorClock): DoorRule | null {
  return DOOR_RULES.find((r) => !r.check(card, clock)) ?? null;
}

export interface RuleStep {
  readonly rule: DoorRule;
  /** pass, stop (the rule that decides), or skip (never reached). */
  readonly state: "pass" | "stop" | "skip";
}

/** Every rule in order, as the board walks them for one tap. */
export function ruleTrail(card: DoorCard, clock: DoorClock): RuleStep[] {
  let reached = true;
  return DOOR_RULES.map((rule) => {
    const ok = rule.check(card, clock);
    const state: RuleStep["state"] = !reached ? "skip" : ok ? "pass" : "stop";
    if (reached && !ok) reached = false;
    return { rule, state };
  });
}
