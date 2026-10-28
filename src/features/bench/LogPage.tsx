import { useSuspenseQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { useLocaleInfo } from "@/i18n/use-locale";
import { CopyCommand } from "@/ui/CopyCommand";
import { Panel } from "@/ui/Panel";
import { BenchOverview } from "./BenchOverview";
import { benchLogQuery, benchStatusQuery } from "./queries";
import { LOG_TYPES, type LogEntry, type LogType } from "./schema";
import styles from "./LogPage.module.css";

const FILTERS = ["all", ...LOG_TYPES.filter((t) => t !== "observe")] as const;
type Filter = (typeof FILTERS)[number];
const isFilter = (v: string | null): v is Filter => FILTERS.includes(v as Filter);

/** Entry numbers as on the bench: two digits, in the reader's numerals. */
function useEntryNumber() {
  const { tag } = useLocaleInfo();
  const format = new Intl.NumberFormat(tag, { minimumIntegerDigits: 2, useGrouping: false });
  return (n: number) => format.format(n);
}

/** The bench log: every command that installed software, talked to the board or flashed it. */
export function LogPage() {
  const { data: entries } = useSuspenseQuery(benchLogQuery());
  const { data: status } = useSuspenseQuery(benchStatusQuery());
  const [params, setParams] = useSearchParams();
  const { t } = useTranslation("bench");
  const raw = params.get("type");
  const filter: Filter = isFilter(raw) ? raw : "all";
  const shown = filter === "all" ? entries : entries.filter((e) => e.types.includes(filter));

  return (
    <>
      <BenchOverview />
      <section className={styles.log} aria-labelledby="log-title">
        <div className={styles.head}>
          <div>
            <h2 id="log-title">{t("log.title")}</h2>
            <p>{t("log.intro")}</p>
          </div>
          <div className={styles.filters} role="group" aria-label={t("log.filter")}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() =>
                  setParams(f === "all" ? {} : { type: f }, {
                    preventScrollReset: true,
                    replace: true,
                  })
                }
              >
                {t(`types.${f}`)}{" "}
                <span>
                  {f === "all" ? entries.length : entries.filter((e) => e.types.includes(f)).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Timeline entries={entries} filter={filter} />

        <ol className={styles.entries}>
          {shown.map((e) => (
            <LogItem key={e.n} entry={e} />
          ))}
        </ol>

        <div className={styles.facts}>
          {status.facts.map((table) => (
            <Panel key={table.title} title={table.title}>
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {table.head.map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.join("|")}>
                        {row.map((cell, i) => (
                          <td key={i} className={table.mono.includes(i) ? styles.mono : undefined}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note ? <p className={styles.note}>{table.note}</p> : null}
            </Panel>
          ))}
        </div>
      </section>
    </>
  );
}

const primaryType = (e: LogEntry): "flash" | "failed" | "other" =>
  e.types.includes("failed") ? "failed" : e.types.includes("flash") ? "flash" : "other";

/**
 * The whole log at a glance, oldest first: one cell per entry. Only two things stand out:
 * flashes (copper) and failures (red, also marked ✕), so it reads without a colour key.
 */
function Timeline({ entries, filter }: { entries: readonly LogEntry[]; filter: Filter }) {
  const { t } = useTranslation("bench");
  const { tag } = useLocaleInfo();
  const number = useEntryNumber();
  const list = new Intl.ListFormat(tag, { type: "unit" });
  return (
    <nav className={styles.timeline} aria-label={t("log.timeline")}>
      <ol>
        {entries.map((e) => {
          const kind = primaryType(e);
          const dim = filter !== "all" && !e.types.includes(filter as LogType);
          const label = t("log.entryLabel", {
            n: number(e.n),
            types: list.format(e.types.map((type) => t(`types.${type}`))),
            title: e.title,
          });
          return (
            <li key={e.n} data-kind={kind} data-dim={dim}>
              <button
                type="button"
                onClick={() =>
                  document.getElementById(`entry-${e.n}`)?.scrollIntoView({ block: "start" })
                }
                title={label}
                aria-label={label}
              >
                {kind === "failed" ? "✕" : ""}
              </button>
            </li>
          );
        })}
      </ol>
      <p className={styles.timelineKey}>
        <Trans
          t={t}
          i18nKey="log.key"
          components={{
            flash: <span data-kind="flash" />,
            failed: <span data-kind="failed" />,
            other: <span data-kind="other" />,
          }}
        />
      </p>
    </nav>
  );
}

function LogItem({ entry: e }: { entry: LogEntry }) {
  const flash = e.types.includes("flash");
  const { t } = useTranslation("bench");
  const number = useEntryNumber();
  return (
    <li id={`entry-${e.n}`} className={flash ? styles.isFlash : undefined}>
      <span className={styles.num}>{number(e.n)}</span>
      <div className={styles.body}>
        <div className={styles.top}>
          {e.types.map((type) => (
            <span key={type} className={styles.pill} data-type={type}>
              {t(`types.${type}`)}
            </span>
          ))}
          <span className={styles.title}>{e.title}</span>
          <span className={styles.where}>{e.where}</span>
        </div>
        <p className={styles.why}>{e.why}</p>
        {e.cmd ? <CopyCommand command={e.cmd} compact /> : null}
        {e.out ? (
          <details className={styles.out} open={flash}>
            <summary>{t("log.response")}</summary>
            <pre>{e.out}</pre>
          </details>
        ) : null}
        <p className={styles.result}>
          <b>{t("log.result")}</b>
          {e.result}
        </p>
      </div>
    </li>
  );
}
