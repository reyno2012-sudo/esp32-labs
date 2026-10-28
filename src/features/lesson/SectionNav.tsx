import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { LessonSection } from "@/domain/lesson-sections";
import { goToSection } from "@/lib/active-section";
import { Icon } from "@/ui/Icon";
import { SECTION_ICON } from "./section-icons";
import { sectionShort } from "./section-labels";
import styles from "./SectionNav.module.css";

/** Jump links to the parts of a long lesson; the one you are reading is lit. */
export function SectionNav({
  sections,
  active,
  steps,
}: {
  sections: readonly LessonSection[];
  active?: string;
  /** Ticked and total steps, shown on the Steps chip. */
  steps: { ticked: number; total: number };
}) {
  const { t } = useTranslation("lesson");
  const navRef = useRef<HTMLElement>(null);

  // On a phone the chips scroll sideways: keep the lit one in view as you read down the page.
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !chip) return;
    // Measured on screen, not with scrollLeft, which runs backwards in a right-to-left page.
    const box = nav.getBoundingClientRect();
    const at = chip.getBoundingClientRect();
    const shift =
      at.left < box.left ? at.left - box.left - 24 : at.right > box.right ? at.right - box.right + 24 : 0;
    if (shift) nav.scrollBy({ left: shift });
  }, [active]);

  return (
    <nav ref={navRef} className={styles.nav} aria-label={t("nav.label")}>
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={styles.chip}
              aria-current={s.id === active ? "location" : undefined}
              data-kind={s.kind}
              onClick={() => goToSection(s.id)}
            >
              <Icon name={SECTION_ICON[s.kind]} size={15} />
              {sectionShort(t, s)}
              {s.kind === "steps" && steps.total ? (
                <span
                  className={styles.count}
                  data-complete={steps.ticked === steps.total || undefined}
                >
                  {steps.ticked}/{steps.total}
                </span>
              ) : null}
            </button>
          </li>
        ))}
        <li className={styles.phoneOnly}>
          <button
            type="button"
            className={styles.chip}
            aria-current={active === "sec-board" ? "location" : undefined}
            onClick={() => goToSection("sec-board")}
          >
            <Icon name={SECTION_ICON.board} size={15} />
            {t("sections.board.short")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
