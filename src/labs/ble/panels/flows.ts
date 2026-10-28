import type { SeqFlows } from "@/ui/sequence/types";

/** The flows a panel asks for (`panel.flows`, in that order), or all of them. */
export function pickFlows(all: SeqFlows, keys: readonly string[] | undefined): SeqFlows {
  if (!keys?.length) return all;
  const picked = Object.fromEntries(keys.flatMap((k) => (all[k] ? [[k, all[k]]] : [])));
  return Object.keys(picked).length ? picked : all;
}
