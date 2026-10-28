import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { SettingsPage } from "@/features/settings/SettingsPage";

// Lazy route module: the settings page and its live code preview load only when opened.
export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <title>{t("titles.settings")}</title>
      <Suspense fallback={<p>{t("app.loadingSettings")}</p>}>
        <SettingsPage />
      </Suspense>
    </>
  );
}
