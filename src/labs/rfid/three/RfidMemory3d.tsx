import { type CSSProperties, type MouseEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { Button, ButtonRow } from "@/ui/Button";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { useSimulation } from "../../shared/simulation";
import { hx } from "../protocol/bytes";
import { blockKind, type BlockKind, byteRole, exampleCard, KIND_TOKEN } from "../protocol/card-memory";
import panels from "../panels/panels.module.css";
import { StepCaption } from "../panels/StepCaption";
import styles from "./f3d.module.css";
import {
  buildMemoryScene,
  initialMemory,
  type MemoryState,
  type SectorPicker,
} from "./memory-scene";
import { StageBox } from "@/ui/stage3d/StageBox";
import { useStage3d } from "@/ui/stage3d/use-stage";

const OPEN_LEGEND = [
  ["--danger", "keyA"],
  ["--copper", "access"],
  ["--gnd", "user"],
  ["--w-sda", "keyB"],
  ["--w-cs", "uid"],
  ["--ok", "text"],
] as const;

const swatch = (token: string) => ({ "--key": `var(${token})` }) as CSSProperties;

type CaptionId = "auth" | "open" | "locked";

// Takes the fields it reads, not the whole state: the state object is mutated in place, so the
// React Compiler would keep a result computed from it.
function caption(
  sector: number,
  isOpen: boolean,
  handshake: MemoryState["anim"],
): { readonly id: CaptionId; readonly values: Readonly<Record<string, number>> } {
  if (handshake) return { id: "auth", values: { sector: handshake.s } };
  const first = sector * 4;
  return { id: isOpen ? "open" : "locked", values: { sector, first, last: first + 3 } };
}

/** R4 panel: the card's memory as 16 cabinets; authenticate a sector to read its blocks. */
export function RfidMemory3d(_: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const [sim, snapshot] = useSimulation(initialMemory);
  const [spinning, setSpinning] = useState(() => !prefersReducedMotion());
  const pick = useRef<SectorPicker | null>(null);
  const { boxRef, canvasRef, labelsRef, stageRef, status } = useStage3d(
    {
      target: { x: 0, y: 1.0, z: 0 },
      radius: 17,
      az: 0.75,
      el: 0.55,
      ground: { w: 18, d: 9, y: -0.05 },
    },
    (T, stage) => {
      pick.current = buildMemoryScene(T, stage, sim, {
        maker: t("memory3d.labels.maker"),
        trailer: t("memory3d.labels.trailer"),
        last: t("memory3d.labels.last"),
      });
    },
  );
  const st = snapshot.state;
  const first = st.sector * 4;
  const open = st.open.has(st.sector);
  const cap = caption(st.sector, open, st.handshake ? st.anim : null);
  const ready = status === "ready";

  function choose(sector: number) {
    sim.update((s) => {
      s.sector = sector;
      s.handshake = false;
    });
  }

  // Without WebGL there is no key to watch: the sector simply opens.
  function authenticate() {
    sim.update((s) => {
      if (ready) s.anim = { s: s.sector, t0: performance.now() / 1000 };
      else s.open = new Set([...s.open, s.sector]);
    });
  }

  function onCanvasClick(e: MouseEvent<HTMLCanvasElement>) {
    if (!stageRef.current?.wasClick()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const hit = pick.current?.(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    if (hit !== null && hit !== undefined) choose(hit);
  }

  return (
    <div className={styles.f3d}>
      <StageBox
        boxRef={boxRef}
        canvasRef={canvasRef}
        labelsRef={labelsRef}
        stageRef={stageRef}
        status={status}
        label={t("memory3d.stage")}
        fallback={t("memory3d.fallback")}
        onClick={onCanvasClick}
      />
      <ButtonRow>
        <Button
          pressed={st.after}
          onClick={() =>
            sim.update((s) => {
              s.after = !s.after;
              s.blocks = exampleCard(s.after);
            })
          }
        >
          {t("memory3d.after")}
        </Button>
        <select
          className={styles.select}
          aria-label={t("memory3d.sector")}
          value={st.sector}
          onChange={(e) => choose(Number(e.target.value))}
        >
          {Array.from({ length: 16 }, (_, s) => (
            <option key={s} value={s}>
              {t("memory3d.sectorN", { n: s })}
            </option>
          ))}
        </select>
        <Button disabled={status === "loading" || st.anim !== null} onClick={authenticate}>
          {t("memory3d.authenticate")}
        </Button>
        <Button
          disabled={!ready}
          pressed={spinning}
          onClick={() => {
            const stage = stageRef.current;
            if (!stage) return;
            stage.view.spinning = !stage.view.spinning;
            setSpinning(stage.view.spinning);
          }}
        >
          {t("controls.turn")}
        </Button>
      </ButtonRow>
      <p className={styles.legend}>
        {(Object.entries(KIND_TOKEN) as [BlockKind, string][]).map(([kind, token]) => (
          <span key={kind}>
            <i style={swatch(token)} />
            {t(`memory3d.kinds.${kind}`)}
          </span>
        ))}
      </p>
      <StepCaption
        title={t(`memory3d.captions.${cap.id}.title`, cap.values)}
        text={t(`memory3d.captions.${cap.id}.text`, cap.values)}
        token={open ? "--rfid" : "--danger"} />
      <div className={panels.memScroll}>
        <div className={panels.memSide}>
          {[0, 1, 2, 3].map((k) => {
            const i = first + k;
            const b = st.blocks[i] ?? [];
            const kind = blockKind(b, i);
            return (
              <div key={i} className={panels.memRow} dir="ltr">
                <b>{i}</b>
                <div className={panels.memBytes}>
                  {b.map((x, j) =>
                    open ? (
                      <i key={j} className={panels[byteRole(b, j, kind)] ?? ""} title={t("memory3d.byte", { n: j })}>
                        {hx(x)}
                      </i>
                    ) : (
                      <i key={j}>··</i>
                    ),
                  )}
                </div>
              </div>
            );
          })}
          {open ? (
            <p className={styles.legend}>
              {OPEN_LEGEND.map(([token, key]) => (
                <span key={key}>
                  <i style={swatch(token)} />
                  {t(`memory3d.legend.${key}`)}
                </span>
              ))}
            </p>
          ) : (
            <Caption>
              {t("memory3d.lockedNote")}
            </Caption>
          )}
        </div>
      </div>
    </div>
  );
}
