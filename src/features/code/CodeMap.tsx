/* eslint-disable i18next/no-literal-string -- literal text here is C++ function names, not interface text. */
import { Trans, useTranslation } from "react-i18next";
import type { Block } from "@/domain/code/analyze";
import styles from "./panels.module.css";
import type { CodeFile, LabCode } from "./lab-code";

/** The kinds the map lists; their labels are map.kind.<kind> in the catalogue. */
type MapKind = "function" | "struct" | "class" | "enum";
const isMapKind = (kind: Block["kind"]): kind is MapKind =>
  kind === "function" || kind === "struct" || kind === "class" || kind === "enum";

/**
 * The shape of the program before the details: how it runs (setup once, loop forever, and what
 * each calls), then this file's sections and the functions and types in them.
 */
export function CodeMap({
  lab,
  file,
  onGo,
}: {
  lab: LabCode;
  file: CodeFile;
  onGo: (path: string, line: number) => void;
}) {
  const { t } = useTranslation("code");
  const main = lab.files[0];
  const entry = (name: string) =>
    main?.analysis.blocks.find((b) => b.kind === "function" && b.depth === 0 && b.name === name);
  const setup = entry("setup");
  const loop = entry("loop");
  const ours = (calls: readonly string[]) =>
    calls.filter((c) => lab.defined.get(c)?.kind === "function");
  const go = (name: string) => {
    const def = lab.defined.get(name);
    if (def) onGo(def.path, def.line);
  };

  const named = file.analysis.blocks.filter((b) => isMapKind(b.kind) && b.name);
  const chapters = [...file.analysis.chapters];
  const chapterOf = (line: number) => chapters.filter(([at]) => at < line).at(-1)?.[1];
  const sections = new Map<string, Block[]>();
  for (const b of named) {
    const key = chapterOf(b.start) ?? "";
    sections.set(key, [...(sections.get(key) ?? []), b]);
  }

  return (
    <div className={styles.map}>
      {setup && loop && main ? (
        <section aria-labelledby="map-run">
          <h3 id="map-run" className={styles.mapTitle}>
            {t("map.howItRuns")}
          </h3>
          <ol className={styles.run}>
            <li className={styles.runStep} data-kind="once">
              <button
                type="button"
                className={styles.runName}
                onClick={() => onGo(main.path, setup.start)}
              >
                setup()
              </button>
              <span className={styles.runWhen}>{t("map.once")}</span>
              <CallList calls={ours(setup.calls)} onGo={go} />
            </li>
            <li className={styles.runStep} data-kind="loop">
              <button
                type="button"
                className={styles.runName}
                onClick={() => onGo(main.path, loop.start)}
              >
                loop()
              </button>
              <span className={styles.runWhen}>
                <span className={styles.spin} aria-hidden="true">
                  ↻
                </span>{" "}
                {t("map.forever")}
              </span>
              <CallList calls={ours(loop.calls)} onGo={go} />
            </li>
          </ol>
          {setup.calls.length + loop.calls.length > 0 &&
          ours([...setup.calls, ...loop.calls]).length === 0 ? (
            <p className={styles.hint}>
              <Trans t={t} i18nKey="map.shared" components={{ code: <code /> }} />
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="map-file">
        <h3 id="map-file" className={styles.mapTitle}>
          {t("map.inFile", { name: file.name })}
        </h3>
        {named.length === 0 ? (
          <p className={styles.hint}>{t("map.empty")}</p>
        ) : null}
        {[...sections].map(([chapter, blocks]) => (
          <div key={chapter || "top"} className={styles.mapSection}>
            {chapter ? <p className={styles.mapChapter}>{chapter}</p> : null}
            <ul className={styles.outline}>
              {blocks.map((b) => (
                <li
                  key={`${b.kind}-${b.start}`}
                  style={{ paddingInlineStart: `${Math.max(0, b.depth - 1) * 12}px` }}
                >
                  <button type="button" onClick={() => onGo(file.path, b.start)}>
                    <span className={styles.kind} data-kind={b.kind}>
                      {isMapKind(b.kind) ? t(`map.kind.${b.kind}`) : null}
                    </span>
                    <code>
                      {b.name.split("::").at(-1)}
                      {b.kind === "function" ? "()" : ""}
                    </code>
                    <span className={styles.at}>
                      {t("map.lines", { count: b.end - b.start + 1 })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

function CallList({ calls, onGo }: { calls: readonly string[]; onGo: (name: string) => void }) {
  const { t } = useTranslation("code");
  if (!calls.length) return null;
  return (
    <ul className={styles.calls} aria-label={t("map.calls")}>
      {calls.map((c) => (
        <li key={c}>
          <button type="button" onClick={() => onGo(c)}>
            <code>{c}()</code>
          </button>
        </li>
      ))}
    </ul>
  );
}
