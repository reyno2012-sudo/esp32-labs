// The sound track at a glance: which parts each lab needs. What each lab turns sound into is
// interface text: it lives in the catalogue (journey.labs.<id>).

export type PartKey = "ky" | "inmp" | "mic" | "spk" | "wifi";

/** A part's label lives in the catalogue under journey.parts.<key>. */
export type LabId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8";

export interface JourneyLab {
  /** Also the catalogue key: journey.labs.<id>.title / what / out. */
  readonly id: LabId;
  readonly need: readonly PartKey[];
  readonly opt?: readonly PartKey[];
}

export const LABS: readonly JourneyLab[] = [
  {
    id: "S1",
    need: ["mic"],
  },
  {
    id: "S2",
    need: ["mic"],
    opt: ["spk"],
  },
  {
    id: "S3",
    need: ["mic"],
    opt: ["spk"],
  },
  {
    id: "S4",
    need: ["mic"],
    opt: ["wifi", "spk"],
  },
  {
    id: "S5",
    need: ["mic"],
    opt: ["spk"],
  },
  {
    id: "S6",
    need: ["mic"],
    opt: ["spk"],
  },
  {
    id: "S7",
    need: ["spk"],
  },
  {
    id: "S8",
    need: ["inmp", "spk"],
  },
];
