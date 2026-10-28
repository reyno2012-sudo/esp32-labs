import { useTranslation } from "react-i18next";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { SOUND_LABS } from "./screens";

/** Every sound lesson's preview: the lab's screen, the hands buttons and the serial monitor. */
export function SoundPreview({ lesson }: WidgetProps) {
  const { t } = useTranslation("labs-sound");
  const lab = SOUND_LABS[lesson.id];
  return lab ? lab.preview(lesson) : <Caption>{t("kit.previewSoon")}</Caption>;
}
