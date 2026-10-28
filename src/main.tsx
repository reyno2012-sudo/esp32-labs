import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { initI18n } from "@/i18n/i18n";
import { createLogger, errorData } from "@/lib/logger";
import { initMotion } from "@/lib/motion";
import { initTheme } from "@/lib/theme";
import "@/styles/tokens.css";
import "@/styles/base.css";

const log = createLogger("app");

// Anything that escapes React (event handlers, timers, promises) still reaches the log stream.
window.addEventListener("error", (e) =>
  log.error("uncaught error", errorData(e.error ?? e.message)),
);
window.addEventListener("unhandledrejection", (e) =>
  log.error("unhandled rejection", errorData(e.reason)),
);

initTheme();
initMotion();
// The reader's language, its direction and its interface text are in place before the first paint.
await initI18n();

const container = document.getElementById("root");
if (!container) throw new Error("index.html is missing #root");

createRoot(container, {
  onUncaughtError: (error, info) =>
    log.error("render error", { ...errorData(error), componentStack: info.componentStack }),
  onCaughtError: (error) => log.warn("render error caught by a boundary", errorData(error)),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
log.info("bench guide started");
