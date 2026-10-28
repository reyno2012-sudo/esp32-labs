// For diagrams redrawn on every animation frame: they draw into an <svg> React renders empty
// (rule 3 of the simulators), the way a canvas would.

const NS = "http://www.w3.org/2000/svg";

/** Creates an SVG element with attributes and optional text. */
export function svgEl(
  tag: string,
  attrs: Readonly<Record<string, string | number>>,
  text?: string,
): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

/** A small drawing surface over one <svg>: clear it, then add shapes and text. */
export class SvgPainter {
  readonly #svg: SVGSVGElement;
  constructor(svg: SVGSVGElement) {
    this.#svg = svg;
  }
  clear(): void {
    this.#svg.replaceChildren();
  }
  add(tag: string, attrs: Readonly<Record<string, string | number>>, text?: string): SVGElement {
    const el = svgEl(tag, attrs, text);
    this.#svg.append(el);
    return el;
  }
}
