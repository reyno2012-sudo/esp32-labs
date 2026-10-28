/** One message in a sequence diagram: from lane `f` to lane `t` (same lane = a self-call). */
export interface SeqStep {
  readonly f: number;
  readonly t: number;
  /** Label on the arrow. */
  readonly msg: string;
  readonly title: string;
  readonly text: string;
  /** Payload shown under the explanation; none (or "") hides the box. */
  readonly code?: string;
  /** Roughly how long the step takes for real; also paces the animation. */
  readonly ms?: number;
  /** Over the network: drawn solid. */
  readonly net?: boolean;
  /** The payload is generated live by the diagram's `live` callback while this step runs. */
  readonly live?: boolean;
}

export interface SeqFlow {
  readonly label: string;
  /** [name, subtitle] per lane, left to right. */
  readonly lanes: readonly (readonly [string, string])[];
  readonly steps: readonly SeqStep[];
  /** Steps [from, to] during which `waitLane` waits: a bar grows on its lifeline. */
  readonly wait?: readonly [number, number];
}

export type SeqFlows = Readonly<Record<string, SeqFlow>>;

export type LegendKind = "msg" | "wait" | "loop";
export interface LegendItem {
  readonly kind: LegendKind;
  readonly label: string;
}
