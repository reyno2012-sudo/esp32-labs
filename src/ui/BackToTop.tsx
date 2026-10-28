import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "@/lib/media";
import { useScrollChrome } from "@/lib/use-scroll-chrome";
import { Icon } from "./Icon";
import styles from "./BackToTop.module.css";

// Shows after about a screenful of scrolling.
const SHOW_AFTER = 640;
const pastFirstScreen = (scrollY: number) => scrollY > SHOW_AFTER;

/** A small round button, bottom right, that eases the page back to the top. */
export function BackToTop() {
  const { away: show } = useScrollChrome(pastFirstScreen);
  const { t } = useTranslation();

  function goTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    // The button hides once you are up there: leave keyboard focus at the top of the page, not nowhere.
    document.getElementById("main")?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      className={styles.button}
      data-show={show || undefined}
      onClick={goTop}
      aria-label={t("ui.backToTop")}
      title={t("ui.backToTop")}
      tabIndex={show ? 0 : -1}
    >
      <Icon name="up" size={20} />
    </button>
  );
}
