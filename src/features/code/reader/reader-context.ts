import { createContext, use } from "react";
import type { Settings } from "@/features/settings/settings";
import type { CodeFile, LabCode } from "../lab-code";

// What every reading mode shares: the lab, the settings, the URL state and the line lens, word
// card and panel the shell owns. Modes read it with useReader() and never reach into each other.

export type ModeId = "tour" | "story" | "explore";
export type SideTab = "guide" | "map" | "words";

export interface LineRef {
  readonly path: string;
  readonly line: number;
}

export interface Reader {
  readonly lab: LabCode;
  readonly settings: Settings;
  /** The Simple view: fewer controls, one panel, one main button. */
  readonly simple: boolean;
  readonly params: URLSearchParams;
  /** Changes the reader's URL state in place (no history entry, no scroll). */
  update(change: (params: URLSearchParams) => void): void;
  readonly mode: ModeId;
  switchMode(mode: ModeId, params?: Readonly<Record<string, string>>): void;
  file(path: string | null): CodeFile;
  /** Shows a file in a mode that follows the URL's file (tour or explore), optionally at a line. */
  openFile(path: string, line?: number): void;
  readonly selected: LineRef | null;
  selectLine(path: string, line: number): void;
  clearLine(): void;
  readonly word: string | null;
  pickWord(id: string): void;
  closeWord(): void;
  readonly side: SideTab;
  setSide(tab: SideTab): void;
  readonly sheetOpen: boolean;
  toggleSheet(): void;
  readonly focus: boolean;
  toggleFocus(): void;
  /** The lesson page this code belongs to. */
  readonly lessonHref: string;
}

export const ReaderContext = createContext<Reader | null>(null);

export function useReader(): Reader {
  const reader = use(ReaderContext);
  if (!reader) throw new Error("useReader() needs a <CodeReader> around it");
  return reader;
}
