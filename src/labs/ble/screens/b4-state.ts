import type { BenchState } from "./shared/bench";

export type B4Method = "justworks" | "passkey" | "compare";
export const B4_METHOD_NAMES: Readonly<Record<B4Method, string>> = {
  justworks: "Just Works",
  passkey: "Passkey",
  compare: "Compare",
};
export const isMethod = (a: string | undefined): a is B4Method =>
  a === "justworks" || a === "passkey" || a === "compare";

export interface B4State extends BenchState {
  method: B4Method;
  /** When each ceremony phase was reached (s), and whether it was only inferred. */
  at: (number | undefined)[];
  inferred: boolean[];
  /** How the current link was secured: "", "Just Works", "Passkey Entry", "Numeric Comparison", "stored keys". */
  how: string;
  failed: string;
  bonds: string[];
  allow: boolean;
  authed?: boolean;
  boardYes?: boolean;
}
