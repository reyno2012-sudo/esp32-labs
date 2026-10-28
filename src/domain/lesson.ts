// The lesson model: pure data, no React. Content files in src/content/lessons describe lessons
// with these types; widgets (simulators, diagrams) are referenced by id and resolved by the
// widget registry, so content never imports code.
import type { WidgetId } from "@/widgets/registry";

export type TrackId = "intro" | "display" | "wifi" | "rfid" | "sensors" | "ble" | "sound";

/** Rich text: plain text that may carry <b>, <i>, <code> and <span class="..."> (see RichText). */
export type Rich = string;

export type PinSide = "L" | "R";
export type PinKind = "power" | "gnd" | "btn" | "rfid" | "sound" | "snd-mic" | "snd-amp";

/** A board pin a lesson uses. `idx` disambiguates pins that appear twice (3V3, GND). */
export interface PinUse {
  readonly pin: string;
  readonly role: string;
  readonly side: PinSide;
  readonly idx?: number;
  readonly kind?: PinKind;
}

export interface WiringTable {
  readonly title?: string;
  readonly head?: readonly string[];
  readonly rows: readonly (readonly [Rich, Rich, Rich])[];
}

export type CommandPlace = "mac" | "button" | "hands" | "app" | "phone" | "serial";
export type CommandState =
  | "off"
  | "any"
  | "on"
  | "move"
  | "both"
  | "still"
  | "bnone"
  | "bscan"
  | "bconn"
  | "bpair"
  | "bhost"
  | "bperiph"
  | "squiet"
  | "sany"
  | "ssound"
  | "smusic";

/** One row of "Commands, in order": what to type, where, and what should happen. */
export interface CommandStep {
  readonly command: string;
  readonly where?: CommandPlace;
  readonly card: CommandState;
  readonly does: Rich;
  readonly see: Rich;
  readonly fix?: Rich;
}

/** A panel on the lesson page, rendered by the widget registered under `widget`. */
export interface PanelSpec {
  readonly title: string;
  readonly widget: WidgetId;
  readonly intro?: Rich;
  /** Screen view to open first (screen-gallery widgets). */
  readonly view?: number;
  /** Which flows a sequence widget shows, in order. */
  readonly flows?: readonly string[];
}

/** The "Preview: what you should see" simulator at the bottom of a lesson. */
export interface PreviewSpec {
  readonly widget: WidgetId;
  readonly view?: number;
}

/** Everything a variant may override. */
export interface LessonBody {
  readonly goal: Rich;
  readonly goalLine?: Rich;
  readonly goalCheck?: readonly Rich[];
  readonly learn: readonly string[];
  readonly pins: readonly PinUse[];
  readonly usb?: boolean;
  readonly boot?: boolean;
  readonly cmd: string;
  readonly wiring?: WiringTable;
  readonly commands?: readonly CommandStep[];
  readonly panels?: readonly PanelSpec[];
  readonly steps: readonly Rich[];
  readonly note: Rich;
}

export interface LessonVariant extends Partial<LessonBody> {
  readonly key: string;
  readonly label: string;
  readonly short: string;
  /** Passed to the preview widget as `mode`. */
  readonly previewMode?: string;
}

interface LessonHead {
  readonly id: string;
  readonly track: TrackId;
  readonly title: string;
  readonly status: string;
}

export interface ActiveLesson extends LessonHead, Partial<LessonBody> {
  readonly kind: "lesson";
  readonly heading: string;
  readonly preview?: PreviewSpec;
  readonly variants?: readonly LessonVariant[];
}

/** A lesson on the roadmap: shown greyed out in the stepper, never opened. */
export interface PlannedLesson extends LessonHead {
  readonly kind: "planned";
}

export type LessonEntry = ActiveLesson | PlannedLesson;

/** A lesson with its chosen variant applied: what the page actually renders. */
export interface ResolvedLesson extends LessonHead, LessonBody {
  readonly heading: string;
  readonly panels: readonly PanelSpec[];
  readonly preview?: PreviewSpec;
  readonly variants?: readonly LessonVariant[];
  readonly variantKey?: string;
  readonly previewMode?: string;
}

export const isActive = (l: LessonEntry): l is ActiveLesson => l.kind === "lesson";

/** Applies a variant over its base lesson. Unknown keys fall back to the first variant. */
export function resolveLesson(base: ActiveLesson, variantKey?: string): ResolvedLesson {
  const variant = base.variants?.find((v) => v.key === variantKey) ?? base.variants?.[0];
  const {
    key,
    label: _label,
    short: _short,
    previewMode,
    ...overrides
  } = variant ?? ({} as Partial<LessonVariant>);
  const merged = { ...base, ...overrides };
  return {
    ...merged,
    goal: merged.goal ?? "",
    learn: merged.learn ?? [],
    pins: merged.pins ?? [],
    cmd: merged.cmd ?? "",
    steps: merged.steps ?? [],
    note: merged.note ?? "",
    panels: merged.panels ?? [],
    ...(key ? { variantKey: key } : {}),
    ...(previewMode ? { previewMode } : {}),
  };
}

/** Storage key of one step's tick, compatible with the original single-file guide. */
export const stepKey = (lesson: Pick<ResolvedLesson, "id" | "variantKey">, index: number) =>
  `${lesson.id}${lesson.variantKey ? `.${lesson.variantKey}` : ""}-${index}`;
