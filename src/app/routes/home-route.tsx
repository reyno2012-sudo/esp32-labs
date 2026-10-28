import type { QueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { trackLessonsQuery } from "@/content/queries";
import { TRACKS } from "@/content/tracks";
import { LabsHome } from "@/features/home/LabsHome";
import { currentLocale } from "@/i18n/i18n";

// "/" and "/lessons": the labs map. Every theme's content chunk is small, so the loader brings
// them all in before the page shows (no row fills in late).
export const homeLoader = (queryClient: QueryClient) => async () => {
  await Promise.all(
    TRACKS.filter((t) => !t.planned).map((t) => queryClient.query(trackLessonsQuery(t.id, currentLocale()))),
  );
  return null;
};

export function HomeRoute() {
  const { t } = useTranslation();
  return (
    <>
      <title>{t("titles.labs")}</title>
      <LabsHome />
    </>
  );
}
