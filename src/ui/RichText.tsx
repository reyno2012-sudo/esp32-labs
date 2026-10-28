import { Fragment, type ReactNode } from "react";
import styles from "./RichText.module.css";

// Lesson text is authored with a little inline markup. Instead of dangerouslySetInnerHTML, this
// parser builds React elements for an allow-list of tags; anything else (e.g. "<n>" placeholders
// inside commands) stays visible as plain text.
const TAGS = { b: "b", i: "i", code: "code", span: "span" } as const;
type Tag = keyof typeof TAGS;
const SPAN_CLASSES: Readonly<Record<string, string | undefined>> = {
  "snd-parts": styles.parts,
  need: styles.need,
  opt: styles.opt,
};
const TOKEN = /<(\/?)(b|i|code|span)((?:\s+class="[^"]*")?)\s*>/g;
const ENTITIES: Readonly<Record<string, string>> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
};
const decode = (text: string) => text.replace(/&(?:lt|gt|amp|quot|#39);/g, (e) => ENTITIES[e] ?? e);

interface Node {
  tag: Tag | "root";
  className?: string;
  children: (Node | string)[];
}

export function parseRich(source: string): Node {
  const root: Node = { tag: "root", children: [] };
  const stack: Node[] = [root];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const [raw, closing, tag, classAttr] = match;
    const top = stack.at(-1) ?? root;
    if (match.index > last) top.children.push(decode(source.slice(last, match.index)));
    last = match.index + raw.length;
    if (closing) {
      // Close the nearest matching tag; a stray closer is kept as text.
      const at = stack.findLastIndex((n) => n.tag === tag);
      if (at > 0) stack.length = at;
      else top.children.push(raw);
      continue;
    }
    const className = /class="([^"]*)"/.exec(classAttr ?? "")?.[1];
    const node: Node = { tag: tag as Tag, children: [], ...(className ? { className } : {}) };
    top.children.push(node);
    stack.push(node);
  }
  if (last < source.length) (stack.at(-1) ?? root).children.push(decode(source.slice(last)));
  return root;
}

function render(node: Node | string, key: number): ReactNode {
  if (typeof node === "string") return node;
  const children = node.children.map(render);
  if (node.tag === "root") return <Fragment key={key}>{children}</Fragment>;
  const Tag = TAGS[node.tag];
  const className =
    node.tag === "span"
      ? node.className
          ?.split(/\s+/)
          .map((c) => SPAN_CLASSES[c])
          .filter(Boolean)
          .join(" ")
      : undefined;
  return (
    <Tag key={key} className={className || undefined}>
      {children}
    </Tag>
  );
}

/** Renders lesson text with its inline markup. */
export function RichText({ text }: { text: string }) {
  return render(parseRich(text), 0);
}
