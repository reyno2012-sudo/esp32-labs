import { useTranslation } from "react-i18next";
import { THEMES, themeStore, useTheme } from "@/lib/theme";
import { ChoiceGroup } from "@/ui/ChoiceGroup";

/** Auto follows the OS; Light and Dark pin a theme for this browser. */
export function ThemeSwitch() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <ChoiceGroup
      label={t("theme.label")}
      value={theme}
      onChange={themeStore.set}
      choices={THEMES.map((key) => ({ key, label: t(`theme.${key}`) }))}
    />
  );
}
