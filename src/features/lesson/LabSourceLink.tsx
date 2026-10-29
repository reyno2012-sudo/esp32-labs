/* eslint-disable i18next/no-literal-string -- literal text here is a repository path, not interface text. */
import { useTranslation } from "react-i18next";
import { env } from "@/config/env";
import { labDirOfCommand } from "@/domain/lab-source";
import { GithubMark } from "@/ui/GithubMark";
import { Icon } from "@/ui/Icon";
import styles from "./LabSourceLink.module.css";

/**
 * The lab's folder in the esp-labs repo, as a card: the GitHub mark on a board-green tile (like the
 * app's logo), what it opens, and the folder it lands in. Nothing for a lesson that has no lab.
 */
export function LabSourceLink({ cmd, className }: { cmd: string; className?: string }) {
  const { t } = useTranslation("lesson");
  const dir = labDirOfCommand(cmd);
  if (!env.labsSourceUrl || !dir) return null;
  return (
    <a
      className={className ? `${styles.card} ${className}` : styles.card}
      href={env.labsSourceUrl}
      target="_blank"
      rel="noreferrer noopener"
    >
      <span className={styles.mark}>
        <GithubMark size={22} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{t("source.title")}</span>
        <span className={styles.path} dir="ltr">Reyno Lab / firmware-source / labs / {dir}</span>
      </span>
      <span className={styles.go}>
        <Icon name="arrow" size={16} />
      </span>
      <span className="visually-hidden">{t("source.newTab")}</span>
    </a>
  );
}
