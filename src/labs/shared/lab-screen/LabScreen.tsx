import { useEffect, useEffectEvent } from "react";
import type { ResolvedLesson } from "@/domain/lesson";
import { Button, ButtonRow } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import { Terminal, useTerminalLog } from "@/ui/terminal/Terminal";
import { useSimulation } from "../simulation";
import { labText, useLabT } from "./lab-text";
import { ScreenCanvas } from "./ScreenCanvas";
import type { LabAction, LabKit, LabState, ScreenSpec } from "./types";
import styles from "./LabScreen.module.css";

const BOOT_LINE_MS = 170;

interface LabScreenProps<S extends LabState, Spec extends ScreenSpec<S>> {
  kit: LabKit<S, Spec>;
  /** The lab's screen; undefined while a lab has none yet. */
  spec: Spec | undefined;
  lesson: ResolvedLesson;
}

/** "Preview: what you should see": the lab's screen, its buttons and its serial monitor. */
export function LabScreen<S extends LabState, Spec extends ScreenSpec<S>>({
  kit,
  spec,
  lesson,
}: LabScreenProps<S, Spec>) {
  const t = useLabT(kit.ns);
  if (!spec) return <Caption>{t("screen.previewSoon")}</Caption>;
  // A different lab is a different board: key resets the simulation.
  return <LabScreenRunning key={lesson.id} kit={kit} spec={spec} lesson={lesson} />;
}

function LabScreenRunning<S extends LabState, Spec extends ScreenSpec<S>>({
  kit,
  spec,
  lesson,
}: LabScreenProps<S, Spec> & { spec: Spec }) {
  const [sim, snapshot] = useSimulation(() => spec.init());
  const term = useTerminalLog();
  const t = useLabT(kit.ns);
  const firmware = `${kit.firmware}-${lesson.id.toLowerCase()}`;

  const nextView: LabAction<S> = {
    label: (_, t) => t("screen.nextView"),
    run: (st) => {
      st.view = (st.view + 1) % spec.views.length;
    },
  };
  const actions = [
    nextView,
    ...(kit.handActions ?? []),
    ...(spec.actions ?? []),
    ...(kit.trailingActions?.(lesson, spec) ?? []),
  ];

  // Boot: the serial monitor fills line by line, like a board starting up. Once per mounted
  // board (an Effect Event, so a re-render with a new lesson object never boots it twice).
  const boot = useEffectEvent(() => {
    const st = sim.state;
    const lines = [
      ...(kit.bootLines?.(st) ?? []),
      ...(spec.boot ?? []).map(
        (l, i) => [l, i === 0 && !kit.bootLines ? "info" : "plain"] as const,
      ),
    ];
    const timers = lines.map(([text, tone], i) =>
      setTimeout(() => term.line(text, tone), BOOT_LINE_MS * i),
    );
    if (kit.afterBoot)
      timers.push(
        setTimeout(() => kit.afterBoot?.(st, term, lesson, spec), BOOT_LINE_MS * lines.length),
      );
    const stop = kit.start?.(st, term);
    return () => {
      timers.forEach(clearTimeout);
      stop?.();
    };
  });
  useEffect(() => boot(), []);
  useEffect(() => kit.subscribe?.(sim.notify), [kit, sim]);

  const acceptsCommands = Boolean(spec.onCommand || kit.shell);
  function runCommand(line: string) {
    term.line(`> ${line}`);
    sim.update((st) => {
      const view = /^view (\d)$/.exec(line);
      if (view && Number(view[1]) >= 1 && Number(view[1]) <= spec.views.length) {
        st.view = Number(view[1]) - 1;
        term.line(`[I] view ${view[1]}: ${spec.views[st.view]}`, "info");
        return;
      }
      if (spec.onCommand && spec.onCommand(line, st, term) !== false) return;
      if (!kit.shell?.(line, st, term, lesson, spec))
        term.line(`[W] unknown command '${line}' in ${firmware} (type help)`, "warn");
    });
  }

  return (
    <div className={styles.sim}>
      <ButtonRow>
        {actions.map((a, i) => (
          <Button
            key={i}
            pressed={a.pressed?.(snapshot.state)}
            onClick={() => sim.update((st) => a.run(st, term))}
          >
            {typeof a.label === "function" ? a.label(snapshot.state, t) : a.label}
          </Button>
        ))}
      </ButtonRow>
      <ScreenCanvas
        kit={kit}
        spec={spec}
        lesson={lesson}
        sim={sim}
        label={t("screen.label", { lesson: lesson.id, views: spec.views.join(", ") })}
      />
      <Caption>{labText(kit.previewCaption, t)}</Caption>
      <Terminal
        log={term}
        title="$ uv run pio device monitor"
        onCommand={acceptsCommands ? runCommand : undefined}
      />
    </div>
  );
}
