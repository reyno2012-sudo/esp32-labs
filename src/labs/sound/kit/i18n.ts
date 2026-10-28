// The sound track's translator type. Pure modules take it as an argument (they never import the
// i18n instance); components get it from useTranslation("labs-sound").
import type { TFunction } from "i18next";

export type SoundT = TFunction<"labs-sound">;
