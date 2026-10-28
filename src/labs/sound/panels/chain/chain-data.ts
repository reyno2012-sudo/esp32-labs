// From air to numbers: the eight stages between your voice and a number the code can use. Each
// stage's box label, title and text (rich text, may carry <b>, <code>) live in the catalogue
// under chain.steps.<id>.

export type ChainStepId = "air" | "capsule" | "ao" | "adc" | "dma" | "ring" | "bias" | "db";

export const STEPS: readonly ChainStepId[] = [
  "air",
  "capsule",
  "ao",
  "adc",
  "dma",
  "ring",
  "bias",
  "db",
];
