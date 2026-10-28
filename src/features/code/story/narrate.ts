import { explainLine } from "@/domain/code/explain";
import type { Scene } from "@/domain/code/story";
import { commentText, type TourStop } from "@/domain/code/tour";
import type { Rich } from "@/domain/lesson";
import { explainContext, type CodeFile, type LabCode } from "../lab-code";

// Words for a scene: where we are in the program, why we got here, and what the code does.
// Pure, so the wording can be tested and improved without touching the screen: the sentences come
// from the "code" catalogue through the lab's translate function. Act titles and blurbs are
// catalogue entries too (story.acts.<act>), read by the components.

export interface SceneText {
  readonly title: string;
  /** Why we are here: who called this, from where. */
  readonly lead: Rich;
  /** What the function does. */
  readonly say: Rich;
  readonly note?: string;
  readonly deep?: Rich;
}

const code = (s: string) => `<code>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code>`;
const call = (qualified: string) => code(`${qualified}()`);
const fileName = (path: string) => path.split("/").at(-1) ?? path;

/** The hand-written tour stop about this function, if one starts at (or just above) its header. */
function writtenStopFor(file: CodeFile, scene: Scene): TourStop | undefined {
  const b = scene.fn.block;
  return file.stops.find(
    (s) =>
      s.source === "written" &&
      s.start <= b.start &&
      s.end >= b.open &&
      s.end <= b.end + 2 &&
      b.start - s.start <= 12,
  );
}

/** The comment written right above the function, if any. */
function noteAbove(file: CodeFile, scene: Scene): string | undefined {
  const { kinds, chapters } = file.analysis;
  const end = scene.fn.block.start - 1;
  let start = end;
  while (start >= 0 && kinds[start] === "comment" && !chapters.has(start)) start--;
  return start < end ? commentText(file.analysis, start + 1, end) || undefined : undefined;
}

function leadFor(scene: Scene, lab: LabCode): Rich {
  const { t } = lab;
  const { fn, trail, act } = scene;
  const parent = trail.at(-1);
  if (!parent) {
    if (act === "start" && fn.name === "setup") return t("story.lead.setup");
    if (act === "forever" && fn.name === "loop") return t("story.lead.loop");
    const callers = lab.symbols.callers(fn);
    return callers.length
      ? t("story.lead.indirect", {
          count: callers.length,
          callers: callers
            .slice(0, 3)
            .map((c) => call(c.qualified))
            .join(", "),
        })
      : t("story.lead.handedOver", { name: call(fn.qualified) });
  }
  const names = { caller: call(parent.qualified), callee: call(fn.qualified) };
  const lead = scene.calledAt
    ? t("story.lead.callsAt", {
        ...names,
        line: scene.calledAt.line + 1,
        file: code(fileName(scene.calledAt.path)),
      })
    : t("story.lead.calls", names);
  if (parent.path === fn.path) return lead;
  const file = code(fileName(fn.path));
  return fn.role === "shared"
    ? t("story.lead.movedShared", { lead, file })
    : t("story.lead.moved", { lead, file });
}

export function narrate(scene: Scene, lab: LabCode, file: CodeFile): SceneText {
  const stop = writtenStopFor(file, scene);
  const header = explainLine(explainContext(lab, file), scene.fn.block.start).text;
  const note = noteAbove(file, scene);
  const title =
    scene.depth === 0 && scene.fn.name === "setup"
      ? lab.t("story.title.setup")
      : scene.depth === 0 && scene.fn.name === "loop"
        ? lab.t("story.title.loop")
        : (stop?.title ?? `${scene.fn.qualified}()`);
  return {
    title,
    lead: leadFor(scene, lab),
    say: stop?.say ?? header,
    ...(note ? { note } : {}),
    ...(stop?.deep ? { deep: stop.deep } : {}),
  };
}
