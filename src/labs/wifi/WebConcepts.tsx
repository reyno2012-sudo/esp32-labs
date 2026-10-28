/* eslint-disable i18next/no-literal-string -- literal text here is firmware names, protocols and paths in the diagram, not interface text. */
import { useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useReducedMotion } from "@/lib/media";
import type { WidgetProps } from "@/widgets/types";
import { ScrollBox } from "@/ui/ScrollBox";
import { usePackets } from "./use-packets";
import styles from "./wifi.module.css";

const s = styles;
type ApiRow = "status" | "scan" | "view" | "led" | "wifi" | "admin" | "ws";

// Methods and paths are the board's API, as is; what each does lives in the catalogue.
const API: readonly (readonly [string, string, ApiRow])[] = [
  ["GET", "/api/status · /api/networks", "status"],
  ["POST", "/api/scan", "scan"],
  ["PUT", "/api/view · /api/settings", "view"],
  ["PUT", "/api/led · /api/message", "led"],
  ["PUT", "/api/wifi", "wifi"],
  ["DELETE · POST", "/api/wifi · /api/reboot · /api/ota", "admin"],
  ["WS", "/ws", "ws"],
];

/** W2 "How the pieces talk": phone, React app, Node server and board, and the board's API. */
export function WebConcepts(_: WidgetProps) {
  const { t } = useTranslation("labs-wifi");
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  // Alternate: a request goes out, then a live update comes back.
  const { wire, packet } = usePackets(svgRef, (now, i) => {
    if (reduce) return 0.5;
    const phase = now / 1600 + i * 0.33;
    const k = phase % 1;
    return Math.floor(phase) % 2 === 1 ? 1 - k : k;
  });

  return (
    <div>
      <ScrollBox label={t("web.drawing")}>
        <svg
          ref={svgRef}
          className={s.arch}
          viewBox="0 0 720 250"
          role="img"
          aria-label={t("web.drawingAlt")}
          direction="ltr"
        >
          <path ref={wire(0)} className={s.wire} d="M150 60 H500" />
          <path ref={wire(1)} className={s.wire} d="M150 190 H260" />
          <path ref={wire(2)} className={s.wire} d="M400 190 C 460 190, 470 120, 520 110" />
          <rect className={s.box} x="20" y="30" width="130" height="60" rx="10" />
          <text className={s.lbl} x="34" y="56">
            {t("web.phone")}
          </text>
          <text className={s.sub} x="34" y="74">
            {t("web.phoneSub")}
          </text>
          <rect className={s.box} x="20" y="160" width="130" height="60" rx="10" />
          <text className={s.lbl} x="34" y="186">
            {t("web.react")}
          </text>
          <text className={s.sub} x="34" y="204">
            {t("web.reactSub")}
          </text>
          <rect className={s.box} x="260" y="160" width="140" height="60" rx="10" />
          <text className={s.lbl} x="274" y="186">
            {t("web.node")}
          </text>
          <text className={s.sub} x="274" y="204">
            {t("web.nodeSub")}
          </text>
          <rect className={`${s.box} ${s.esp}`} x="500" y="30" width="200" height="110" rx="12" />
          <text className={`${s.lbl} ${s.inv}`} x="516" y="58">
            ESP32 wifi-lab-w2
          </text>
          <text className={`${s.sub} ${s.inv}`} x="516" y="78">
            REST /api/…
          </text>
          <text className={`${s.sub} ${s.inv}`} x="516" y="96">
            live /ws
          </text>
          <text className={`${s.sub} ${s.inv}`} x="516" y="114">
            page / · OTA /api/ota
          </text>
          <text className={s.sub} x="290" y="50">
            REST + WebSocket
          </text>
          <text className={s.sub} x="160" y="178">
            /api + /ws
          </text>
          <text className={s.sub} x="430" y="236">
            {t("web.adminWire")}
          </text>
          <circle ref={packet(0)} r="5" className={s.pktCopper} />
          <circle ref={packet(1)} r="5" className={s.pktSda} />
          <circle ref={packet(2)} r="5" className={s.pktOk} />
        </svg>
      </ScrollBox>
      <ScrollBox label={t("web.api")}>
        <table className={s.api}>
          <tbody>
            {API.map(([method, path, what]) => (
              <tr key={method + path}>
                <td>{method}</td>
                <td>{path}</td>
                <td>
                  <Trans
                    t={t}
                    i18nKey={`web.rows.${what}`}
                    components={{ adm: <span className={s.adm} /> }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollBox>
    </div>
  );
}
