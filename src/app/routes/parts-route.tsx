import { useTranslation } from "react-i18next";
import { PartsPage } from "@/features/parts/PartsPage";

// Lazy route module: the gallery of the parts library.
export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <title>{t("titles.parts")}</title>
      <PartsPage />
    </>
  );
}
