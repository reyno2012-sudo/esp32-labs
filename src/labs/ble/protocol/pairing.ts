// Which SMP pairing method two IO capabilities lead to (Core spec, Vol 3 Part H, 2.3.5.1).

export interface IoCap {
  readonly k: string;
  readonly s: string;
  readonly ex: string;
}

export const B4_CAPS: readonly IoCap[] = [
  { k: "DisplayOnly", s: "screen, no input", ex: "B4 with pair passkey" },
  { k: "DisplayYesNo", s: "screen + yes/no", ex: "B4 with pair compare" },
  { k: "KeyboardOnly", s: "keys, no screen", ex: "a keyboard" },
  { k: "NoInputNoOutput", s: "nothing", ex: "B4 with pair justworks, earbuds" },
  { k: "KeyboardDisplay", s: "screen + keys", ex: "a phone or a laptop" },
];

/**
 * J just works, N numeric comparison, PI = passkey, initiator types (responder shows),
 * PR = passkey, responder types (initiator shows), PB = both type.
 */
export type PairMethod = "J" | "N" | "PI" | "PR" | "PB";

// [initiator][responder] with LE Secure Connections.
const B4_SC: readonly (readonly PairMethod[])[] = [
  ["J", "J", "PR", "J", "PR"],
  ["J", "N", "PR", "J", "N"],
  ["PI", "PI", "PB", "J", "PI"],
  ["J", "J", "J", "J", "J"],
  ["PI", "N", "PR", "J", "N"],
];
// Legacy pairing (Bluetooth 4.0/4.1) has no numeric comparison: those cells fall back.
const B4_LEGACY: Readonly<Record<string, PairMethod>> = {
  "1,1": "J",
  "1,4": "PR",
  "4,1": "PI",
  "4,4": "PR",
};

export function b4Method(init: number, resp: number, sc: boolean, mitm: boolean): PairMethod {
  if (!mitm) return "J";
  const legacy = B4_LEGACY[`${init},${resp}`];
  if (!sc && legacy) return legacy;
  return B4_SC[init]?.[resp] ?? "J";
}
