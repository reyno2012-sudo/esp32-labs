// B2 "Build an advertisement": the fields you can place, the board's modes as presets, and the
// two 31-byte packets that result.
import { B2_UUID, b2Url } from "../../protocol/advertising";

export type FieldKey =
  "flags" | "name" | "tx" | "app" | "svc16" | "svc128" | "maker" | "ibeacon" | "url";
export type Place = "" | "adv" | "rsp";
export type Placement = Partial<Record<FieldKey, Place>>;

/** A field you can place; its name and explanation live in the catalogue (builder.fields.<k>). */
export interface BuilderField {
  readonly k: FieldKey;
  readonly type: number;
  /** A CSS colour (token reference). */
  readonly col: string;
  data(name: string, url: string): number[];
}

export const BUILDER_FIELDS: readonly BuilderField[] = [
  {
    k: "flags",
    type: 0x01,
    col: "var(--ble)",
    data: () => [0x06],
  },
  {
    k: "name",
    type: 0x09,
    col: "var(--scope-amber)",
    data: (name) => [...name].map((c) => c.charCodeAt(0) & 0x7f),
  },
  {
    k: "tx",
    type: 0x0a,
    col: "var(--scope-trace)",
    data: () => [9],
  },
  {
    k: "app",
    type: 0x19,
    col: "var(--scope-violet)",
    data: () => [0x40, 0x05],
  },
  {
    k: "svc16",
    type: 0x03,
    col: "var(--scope-coral)",
    data: () => [0x0f, 0x18],
  },
  {
    k: "svc128",
    type: 0x07,
    col: "var(--w-dc)",
    data: () => [...B2_UUID].reverse(),
  },
  {
    k: "maker",
    type: 0xff,
    col: "var(--w-scl)",
    data: () => [0xff, 0xff, 0x01, 0x01, 0x00, 0x2e, 0x10, 0x2c, 0x01],
  },
  {
    k: "ibeacon",
    type: 0xff,
    col: "var(--w-btn)",
    data: () => [0x4c, 0x00, 0x02, 0x15, ...B2_UUID, 0x00, 0x01, 0x00, 0x02, -59 & 255],
  },
  {
    k: "url",
    type: 0x16,
    col: "var(--w-res)",
    data: (_, url) => [0xaa, 0xfe, ...(b2Url(url) ?? [])],
  },
];

export const PRESETS = {
  bench: { flags: "adv", name: "adv", maker: "adv", tx: "rsp", app: "rsp" },
  ibeacon: { flags: "adv", ibeacon: "adv", name: "rsp" },
  url: { flags: "adv", svc16: "adv", url: "adv", name: "rsp" },
  name: { flags: "adv", name: "adv", tx: "adv" },
  b3: { flags: "adv", svc128: "adv", name: "rsp", app: "rsp" },
} as const satisfies Record<string, Placement>;

export type PresetKey = keyof typeof PRESETS;
export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

export interface Cell {
  readonly b: number;
  /** Index of its field in BUILDER_FIELDS. */
  readonly i: number;
  /** Length or type byte. */
  readonly head: boolean;
}

/** The bytes of one packet ("adv" or "rsp"), in field order. */
export function packetCells(
  place: Placement,
  where: "adv" | "rsp",
  name: string,
  url: string,
): Cell[] {
  const cells: Cell[] = [];
  BUILDER_FIELDS.forEach((f, i) => {
    if (place[f.k] !== where) return;
    const d = f.data(name, url);
    [d.length + 1, f.type, ...d].forEach((b, j) => cells.push({ b, i, head: j < 2 }));
  });
  return cells;
}
