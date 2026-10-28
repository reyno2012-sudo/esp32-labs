import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  data,
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useSearchParams,
} from "react-router";
import { trackLessonsQuery } from "@/content/queries";
import { DEFAULT_LESSON_ID, findTrack, trackOfLesson } from "@/content/tracks";
import { isActive, resolveLesson } from "@/domain/lesson";
import { lessonSections } from "@/domain/lesson-sections";
import { entryLesson, stepsTicked } from "@/domain/progress";
import { BoardSignalsProvider } from "@/features/board/board-signals";
import { LessonPage } from "@/features/lesson/LessonPage";
import { LessonTabs } from "@/features/lesson/LessonTabs";
import { SectionNav } from "@/features/lesson/SectionNav";
import { LessonStepper } from "@/features/navigation/LessonStepper";
import { TrackNav } from "@/features/navigation/TrackNav";
import { currentLocale } from "@/i18n/i18n";
import { useLocale } from "@/i18n/use-locale";
import { useTranslation } from "react-i18next";
import { progress, useTicks, useVariants } from "@/features/progress/progress-store";
import { useActiveSection } from "@/lib/active-section";
import type { RouteErrorReason } from "../route-errors";

// Loaders make sure a lesson's content is in the query cache before the page renders (no
// spinner, no waterfall); components then read it from the cache with useSuspenseQuery.

/** "/tracks/:trackId": the first lesson of that theme that isn't working yet (its code with ?view=code). */
export const trackLoader =
  (queryClient: QueryClient) =>
  async ({ params, request }: LoaderFunctionArgs) => {
    const track = findTrack(params.trackId ?? "");
    if (!track || track.planned) throw data({ reason: "noTheme", id: params.trackId ?? "" } satisfies RouteErrorReason, {
        status: 404,
      });
    const lessons = await queryClient.query(trackLessonsQuery(track.id, currentLocale()));
    const entry = entryLesson(lessons, progress.ticks.get());
    const code = new URL(request.url).searchParams.get("view") === "code";
    return redirect(`/lessons/${entry?.id ?? DEFAULT_LESSON_ID}${code ? "/code" : ""}`);
  };

/** "/lessons/:lessonId" */
export const lessonLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const lessonId = params.lessonId ?? "";
    const trackId = trackOfLesson(lessonId);
    if (!trackId) throw data({ reason: "noLesson", id: lessonId } satisfies RouteErrorReason, { status: 404 });
    const lessons = await queryClient.query(trackLessonsQuery(trackId, currentLocale()));
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson || !isActive(lesson))
      throw data({ reason: "plannedLesson", id: lessonId } satisfies RouteErrorReason, {
        status: 404,
      });
    progress.lastLesson.set(lessonId);
    return { lessonId, trackId };
  };

/** The lesson of the current route, with its variant applied (URL first, then your last choice). */
export function useRouteLesson() {
  const { lessonId, trackId } =
    useLoaderData<Awaited<ReturnType<ReturnType<typeof lessonLoader>>>>();
  const { data: lessons } = useSuspenseQuery(trackLessonsQuery(trackId, useLocale()));
  const variants = useVariants();
  const [params, setParams] = useSearchParams();
  const base = lessons.find((l) => l.id === lessonId);
  if (!base || !isActive(base)) throw new Error(`Lesson ${lessonId} vanished from the cache`);
  const lesson = resolveLesson(base, params.get("variant") ?? variants[lessonId]);

  function chooseVariant(key: string) {
    progress.setVariant(lessonId, key);
    setParams(
      (p) => {
        p.set("variant", key);
        return p;
      },
      { replace: true, preventScrollReset: true },
    );
  }
  return { lesson, lessons, trackId, chooseVariant };
}

export function LessonRoute() {
  const { lesson, lessons, trackId, chooseVariant } = useRouteLesson();
  const ticks = useTicks();
  const track = findTrack(trackId);
  const sections = lessonSections(lesson);
  // The pinout is its own section on phones (it comes after the lesson there).
  const active = useActiveSection([...sections.map((s) => s.id), "sec-board"]);
  const { t } = useTranslation();
  return (
    <BoardSignalsProvider>
      <title>{t("titles.lesson", { id: lesson.id, title: lesson.title })}</title>
      <TrackNav activeTrack={trackId} />
      <LessonStepper lessons={lessons} currentId={lesson.id} color={track?.color ?? "--copper"} />
      <LessonTabs lesson={lesson} current="lab">
        <SectionNav
          sections={sections}
          active={active}
          steps={{ ticked: stepsTicked(lesson, ticks), total: lesson.steps.length }}
        />
      </LessonTabs>
      <LessonPage
        lesson={lesson}
        lessons={lessons}
        sections={sections}
        active={active}
        onVariant={chooseVariant}
      />
    </BoardSignalsProvider>
  );
}
