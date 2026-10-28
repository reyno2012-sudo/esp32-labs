import { definePalette } from "@/lib/palette";

/** Colours of the 3D models (the RC522 board, the card, the field lines), from the design tokens. */
export const palette3d = definePalette({
  rc522: "--rc522",
  copper: "--copper",
  rfid: "--rfid",
  pcb: "--pcb",
  silkDim: "--silk-dim",
  gold: "--gold",
  cardWhite: "--card-white",
  wSda: "--w-sda",
  ok: "--ok",
  warn: "--warn",
  line: "--line",
  danger: "--danger",
});
export type Palette3d = ReturnType<typeof palette3d>;
