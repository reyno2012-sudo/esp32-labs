import { useTranslation } from "react-i18next";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { useBrowserAudio } from "./audio/use-browser-audio";
import { SOUND_LABS } from "./screens";

/** "What the screen shows": every view of the lab, the microphone still live. */
export function SoundScreens({ lesson, panel }: WidgetProps) {
  // The gallery's labs can sound too (alarms, chimes) once browser sound is on.
  useBrowserAudio();
  const { t } = useTranslation("labs-sound");
  const lab = SOUND_LABS[lesson.id];
  return lab ? lab.gallery(lesson, panel?.view) : <Caption>{t("kit.screensSoon")}</Caption>;
}
