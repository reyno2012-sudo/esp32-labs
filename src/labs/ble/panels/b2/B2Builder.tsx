import { type CSSProperties, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ButtonRow } from "@/ui/Button";
import { RichText } from "@/ui/RichText";
import type { WidgetProps } from "@/widgets/types";
import { b2Url } from "../../protocol/advertising";
import { hx, hxs } from "../../protocol/hex";
import styles from "../panels.module.css";
import own from "./B2Builder.module.css";
import {
  BUILDER_FIELDS,
  type Cell,
  type FieldKey,
  type Place,
  type Placement,
  packetCells,
  PRESET_KEYS,
  PRESETS,
} from "./builder-fields";

const PLACES: readonly Place[] = ["", "adv", "rsp"];
const asPlace = (v: string): Place => PLACES.find((p) => p === v) ?? "";

/** B2: build an advertisement inside the 31-byte budget. */
export function B2Builder(_: WidgetProps) {
  const { t } = useTranslation("labs-ble");
  const [place, setPlace] = useState<Placement>({ ...PRESETS.bench });
  const [focus, setFocus] = useState<FieldKey>("maker");
  const [name, setName] = useState("Bench B2");
  const [url, setUrl] = useState("https://github.com/");

  const rows: ["adv" | "rsp", Cell[]][] = [
    ["adv", packetCells(place, "adv", name, url)],
    ["rsp", packetCells(place, "rsp", name, url)],
  ];
  const f = BUILDER_FIELDS.find((x) => x.k === focus) ?? BUILDER_FIELDS[0];
  const data = (k: (typeof BUILDER_FIELDS)[number]) => k.data(name, url);
  const fieldName = (k: FieldKey) => t(`builder.fields.${k}.name`);

  return (
    <div className={styles.wd}>
      <ButtonRow>
        {PRESET_KEYS.map((k) => (
          <Button key={k} onClick={() => setPlace({ ...PRESETS[k] })}>
            {k === "b3" ? t("builder.presetB3") : t("builder.preset", { name: k })}
          </Button>
        ))}
      </ButtonRow>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("builder.field")}</th>
              <th>{t("builder.bytes")}</th>
              <th>{t("builder.goesIn")}</th>
            </tr>
          </thead>
          <tbody>
            {BUILDER_FIELDS.map((x) => (
              <tr key={x.k}>
                <td>
                  <span className={styles.chip} style={{ background: x.col }}>
                    {fieldName(x.k)}
                  </span>
                </td>
                <td className={styles.mono}>{data(x).length + 2}</td>
                <td>
                  <select
                    className={styles.select}
                    aria-label={t("builder.where", { name: fieldName(x.k) })}
                    value={place[x.k] ?? ""}
                    onChange={(e) => {
                      setPlace((p) => ({ ...p, [x.k]: asPlace(e.target.value) }));
                      setFocus(x.k);
                    }}
                  >
                    <option value="">{t("builder.place.none")}</option>
                    <option value="adv">{t("builder.place.adv")}</option>
                    <option value="rsp">{t("builder.place.rsp")}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={own.inputs}>
        <label>
          {t("builder.name")}{" "}
          <input
            className={styles.textInput}
            value={name}
            maxLength={29}
            size={14}
            aria-label={t("builder.nameAria")}
            onChange={(e) => {
              setName(e.target.value);
              setFocus("name");
            }}
          />
        </label>{" "}
        ·{" "}
        <label>
          {t("builder.url")}{" "}
          <input
            className={styles.textInput}
            value={url}
            size={22}
            aria-label={t("builder.urlAria")}
            onChange={(e) => {
              setUrl(e.target.value);
              setFocus("url");
            }}
          />
        </label>
      </p>
      <div className={styles.scroll}>
        <svg
          viewBox="0 0 680 120"
          className={styles.full}
          direction="ltr"
          role="img"
          aria-label={t("builder.aria")}
        >
          {rows.map(([label, cells], r) => (
            <PacketRow
              key={label}
              label={t(`builder.place.${label}`)}
              cells={cells}
              y={22 + r * 52}
              rsp={r === 1}
            />
          ))}
        </svg>
      </div>
      <div className={styles.bytes}>
        {BUILDER_FIELDS.map((x) =>
          place[x.k] ? (
            <span
              key={x.k}
              className={`${styles.bf} ${x.k === focus ? styles.on : ""}`}
              style={{ "--bf": x.col } as CSSProperties}
            >
              <b>{fieldName(x.k)}</b>
              <i>{hxs([data(x).length + 1, x.type, ...data(x)])}</i>
            </span>
          ) : null,
        )}
      </div>
      {f ? (
        <p className={styles.field}>
          <RichText
            text={t("builder.detail", {
              name: fieldName(f.k),
              length: data(f).length,
              why: t(`builder.fields.${f.k}.why`),
            })}
          />
          {f.k === "url" && !b2Url(url) ? (
            <>
              {" "}
              <RichText text={t("builder.badUrl")} />
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function PacketRow({
  label,
  cells,
  y,
  rsp,
}: {
  label: string;
  cells: Cell[];
  y: number;
  rsp: boolean;
}) {
  const { t } = useTranslation("labs-ble");
  const over = cells.length > 31;
  const slots = Array.from({ length: Math.max(31, cells.length) }, (_, k) => k).filter(
    (k) => 4 + k * 21 <= 660,
  );
  return (
    <g>
      <text x={4} y={y - 6} className={over ? own.titleOver : own.title}>
        {over
          ? t("builder.rowOver", { label, count: cells.length, over: cells.length - 31 })
          : t("builder.row", { label, count: cells.length })}
      </text>
      {slots.map((k) => {
        const c = cells[k];
        const x = 4 + k * 21;
        if (!c)
          return <rect key={k} x={x} y={y} width={19} height={22} rx={3} className={own.empty} />;
        // Tinted cells with ink text stay readable in both themes; length and type bytes are paler.
        const col = k >= 31 ? "var(--danger)" : (BUILDER_FIELDS[c.i]?.col ?? "var(--line)");
        return (
          <g key={k}>
            <rect
              x={x}
              y={y}
              width={19}
              height={22}
              rx={3}
              style={{
                fill: `color-mix(in srgb, ${col} ${c.head ? 18 : 42}%, var(--surface))`,
                stroke: col,
              }}
            />
            <text x={x + 9.5} y={y + 15} textAnchor="middle" className={own.cell}>
              {hx(c.b)}
            </text>
          </g>
        );
      })}
      {rsp && !cells.length ? (
        <text x={230} y={y + 15} className={own.note}>
          {t("builder.empty")}
        </text>
      ) : null}
    </g>
  );
}
