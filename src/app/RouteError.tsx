import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { createLogger, errorData } from "@/lib/logger";
import { isRouteErrorReason } from "./route-errors";
import styles from "./RouteError.module.css";

const log = createLogger("router");

/** Shown for unknown URLs and for errors thrown while loading or rendering a page. */
export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (!notFound) log.error("route failed", errorData(error));
  const message = isRouteErrorResponse(error)
    ? isRouteErrorReason(error.data)
      ? error.data.reason === "noPage"
        ? t("routeError.reasons.noPage")
        : t(`routeError.reasons.${error.data.reason}`, { id: error.data.id })
      : String(error.data)
    : error instanceof Error
      ? error.message
      : t("routeError.unknown");
  return (
    <div className={styles.box} role="alert">
      <p className={styles.code}>{notFound ? "404" : t("routeError.code")}</p>
      <h2>{notFound ? t("routeError.notFound") : t("routeError.failed")}</h2>
      <p>{message}</p>
      <Link to="/">{t("routeError.back")}</Link>
    </div>
  );
}
