import type { ComponentType } from "react";
import type { PanelSpec, ResolvedLesson } from "@/domain/lesson";

/**
 * The one contract every widget (simulator, diagram, explainer) implements. A widget renders
 * either as a lesson panel (`panel` set: read panel.view / panel.flows) or as the lesson's
 * preview (`panel` undefined: read lesson.preview / lesson.previewMode).
 */
export interface WidgetProps {
  readonly lesson: ResolvedLesson;
  readonly panel?: PanelSpec;
}

export type WidgetComponent = ComponentType<WidgetProps>;
