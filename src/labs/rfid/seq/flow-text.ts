// The words of a sequence diagram live in the labs-rfid catalogue; the shape of each flow (lanes
// crossed, timing, the bytes in the payload box) stays here in code. localizeFlows zips the two.
import type { SeqFlow, SeqFlows, SeqStep } from "@/ui/sequence/types";

/** A step without its words. `msg` stays only where the arrow carries bytes or a command. */
export type StepShape = Omit<SeqStep, "title" | "text" | "msg"> & { readonly msg?: string };

export interface FlowShape {
  readonly wait?: SeqFlow["wait"];
  readonly steps: readonly StepShape[];
}
export type FlowShapes = Readonly<Record<string, FlowShape>>;

export interface StepText {
  readonly title: string;
  readonly text: string;
  readonly msg?: string;
}

/** One diagram's catalogue entry: lane names and subtitles, then each flow's label and steps. */
export interface FlowsText {
  readonly lanes: { readonly names: readonly string[]; readonly subs: readonly string[] };
  readonly flows: Readonly<Record<string, { readonly label: string; readonly steps: readonly StepText[] }>>;
}

export function localizeFlows(shapes: FlowShapes, text: FlowsText): SeqFlows {
  const lanes = text.lanes.names.map((name, i) => [name, text.lanes.subs[i] ?? ""] as const);
  const out: Record<string, SeqFlow> = {};
  for (const [key, shape] of Object.entries(shapes)) {
    const words = text.flows[key];
    out[key] = {
      label: words?.label ?? key,
      lanes,
      ...(shape.wait ? { wait: shape.wait } : {}),
      steps: shape.steps.map((step, i) => {
        const w = words?.steps[i];
        return { ...step, msg: w?.msg ?? step.msg ?? "", title: w?.title ?? "", text: w?.text ?? "" };
      }),
    };
  }
  return out;
}
