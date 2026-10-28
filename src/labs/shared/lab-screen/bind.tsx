import type { ReactNode } from "react";
import type { ResolvedLesson } from "@/domain/lesson";
import { LabScreen } from "./LabScreen";
import { ScreenGallery } from "./ScreenGallery";
import type { LabKit, LabState, ScreenSpec } from "./types";

/**
 * One lab's screen bound to its kit, its own state type hidden. A track keeps a record of
 * these (labs with different state types side by side, no casts) and renders either view.
 */
export interface BoundLab {
  preview(lesson: ResolvedLesson): ReactNode;
  gallery(lesson: ResolvedLesson, initialView?: number): ReactNode;
}

export function bindLab<S extends LabState, Spec extends ScreenSpec<S>>(
  kit: LabKit<S, Spec>,
  spec: Spec,
): BoundLab {
  return {
    preview: (lesson) => <LabScreen kit={kit} spec={spec} lesson={lesson} />,
    gallery: (lesson, initialView) => (
      <ScreenGallery kit={kit} spec={spec} lesson={lesson} initialView={initialView} />
    ),
  };
}
