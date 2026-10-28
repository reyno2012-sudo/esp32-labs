/* eslint-disable i18next/no-literal-string -- literal text here is host names, firmware names and paths in the diagram, not interface text. */
import { useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useReducedMotion } from "@/lib/media";
import { Caption } from "@/ui/Caption";
import type { WidgetProps } from "@/widgets/types";
import { ScrollBox } from "@/ui/ScrollBox";
import { usePackets } from "./use-packets";
import styles from "./wifi.module.css";

const s = styles;

const COMPARE = ["who", "away", "router", "signIn", "ota"] as const;

/** W2 variation 2 "How remote control works": who dials whom, and the two variations side by side. */
export function RemoteConcepts(_: WidgetProps) {
  const { t } = useTranslation("labs-wifi");
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  // Phone and board send towards the public address; the tunnel carries it down to the Mac.
  const { wire, packet } = usePackets(svgRef, (now, i) => {
    const k = reduce ? 0.5 : (now / 1800 + i * 0.3) % 1;
    return i === 2 ? 1 - k : k;
  });

  return (
    <div>
      <ScrollBox label={t("remote.drawing")}>
        <svg
          ref={svgRef}
          className={s.arch}
          viewBox="0 0 720 270"
          role="img"
          aria-label={t("remote.drawingAlt")}
          direction="ltr"
        >
          <rect className={s.zone} x="250" y="132" width="460" height="128" rx="14" />
          <text className={s.sub} x="264" y="252">
            {t("remote.home")}
          </text>
          <path ref={wire(0)} className={s.wire} d="M160 66 H280" />
          <path ref={wire(2)} className={s.wire} d="M375 168 V102" />
          <path ref={wire(1)} className={s.wire} d="M610 160 C 610 90, 570 66, 480 66" />
          <rect className={s.box} x="20" y="36" width="140" height="60" rx="10" />
          <text className={s.lbl} x="34" y="62">
            {t("remote.phone")}
          </text>
          <text className={s.sub} x="34" y="80">
            {t("remote.phoneSub")}
          </text>
          <rect className={s.box} x="280" y="30" width="200" height="72" rx="22" />
          <text className={s.lbl} x="298" y="56">
            {t("remote.public")}
          </text>
          <text className={s.sub} x="298" y="74">
            tunnel: ….trycloudflare.com
          </text>
          <text className={s.sub} x="298" y="90">
            {t("remote.publicSub")}
          </text>
          <rect className={s.box} x="275" y="168" width="200" height="64" rx="10" />
          <text className={s.lbl} x="289" y="192">
            {t("remote.mac")}
          </text>
          <text className={s.sub} x="289" y="210">
            tunnel → Node :8787
          </text>
          <text className={s.sub} x="289" y="224">
            {t("remote.macSub")}
          </text>
          <rect className={`${s.box} ${s.esp}`} x="520" y="160" width="176" height="72" rx="12" />
          <text className={`${s.lbl} ${s.inv}`} x="534" y="186">
            ESP32 w2-remote
          </text>
          <text className={`${s.sub} ${s.inv}`} x="534" y="204">
            {t("remote.boardOut")}
          </text>
          <text className={`${s.sub} ${s.inv}`} x="534" y="220">
            {t("remote.boardToken")}
          </text>
          <text className={s.sub} x="168" y="56">
            {t("remote.https")}
          </text>
          <text className={s.sub} x="384" y="122">
            {t("remote.tunnel")}
          </text>
          <text className={s.sub} x="560" y="108">
            {t("remote.wss")}
          </text>
          <circle ref={packet(0)} r="5" className={s.pktCopper} />
          <circle ref={packet(1)} r="5" className={s.pktSda} />
          <circle ref={packet(2)} r="5" className={s.pktOk} />
        </svg>
      </ScrollBox>
      <Caption>
        <Trans
          t={t}
          i18nKey="remote.caption"
          components={{ code: <code className={s.inlineCode} /> }}
        />
      </Caption>
      <ScrollBox label={t("remote.compare")}>
        <table className={`${s.api} ${s.cmp}`}>
          <thead>
            <tr>
              <td />
              <th scope="col">{t("remote.lan")}</th>
              <th scope="col">{t("remote.remote")}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row) => (
              <tr key={row}>
                <td>{t(`remote.rows.${row}.what`)}</td>
                <td>{t(`remote.rows.${row}.lan`)}</td>
                <td>{t(`remote.rows.${row}.remote`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollBox>
    </div>
  );
}
