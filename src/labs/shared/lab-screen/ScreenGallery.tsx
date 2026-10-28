import { useState } from "react";
import type { ResolvedLesson } from "@/domain/lesson";
import { Button, ButtonRow } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import { ChoiceGroup } from "@/ui/ChoiceGroup";
import { TerminalLog } from "@/ui/terminal/terminal-log";
import { useSimulation } from "../simulation";
import { labText, useLabT } from "./lab-text";
import { ScreenCanvas } from "./ScreenCanvas";
import type { LabKit, LabState, ScreenSpec } from "./types";
import styles from "./LabScreen.module.css";

interface ScreenGalleryProps<S extends LabState, Spec extends ScreenSpec<S>> {
  kit: LabKit<S, Spec>;
  spec: Spec | undefined;
  lesson: ResolvedLesson;
  /** View to open first. */
  initialView?: number;
}

/** "What the screen shows": every view of the lab, one at a time, with a sentence each. */
export function ScreenGallery<S extends LabState, Spec extends ScreenSpec<S>>({
  spec,
  ...rest
}: ScreenGalleryProps<S, Spec>) {
  const t = useLabT(rest.kit.ns);
  if (!spec) return <Caption>{t("gallery.soon")}</Caption>;
  return <Gallery key={rest.lesson.id} spec={spec} {...rest} />;
}

// The gallery's buttons have no serial monitor to print to.
const SILENT = new TerminalLog();

function Gallery<S extends LabState, Spec extends ScreenSpec<S>>({
  kit,
  spec,
  lesson,
  initialView = 0,
}: ScreenGalleryProps<S, Spec> & { spec: Spec }) {
  const t = useLabT(kit.ns);
  const [sim, snapshot] = useSimulation(() => spec.init());
  const [view, setView] = useState(Math.min(initialView, spec.views.length - 1));

  return (
    <div className={styles.sim}>
      <ChoiceGroup
        label={t("gallery.views")}
        value={view}
        onChange={setView}
        choices={spec.views.map((v, i) => ({ key: i, label: `${i + 1} · ${v}` }))}
      />
      {kit.handActions ? (
        <ButtonRow>
          {kit.handActions.map((a, i) => (
            <Button key={i} onClick={() => sim.update((st) => a.run(st, SILENT))}>
              {typeof a.label === "function" ? a.label(snapshot.state, t) : a.label}
            </Button>
          ))}
        </ButtonRow>
      ) : null}
      <ScreenCanvas
        kit={kit}
        spec={spec}
        lesson={lesson}
        sim={sim}
        view={view}
        label={t("gallery.example", { view: spec.views[view] ?? "" })}
      />
      <Caption live>{labText(spec.captions?.[view], t)}</Caption>
    </div>
  );
}
