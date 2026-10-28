import { type RefObject, useRef } from "react";
import { useFrameLoop } from "@/lib/animation";

/** Where packet `i` is along its wire at `now`: 0 = start of the path, 1 = its end. */
export type PacketPosition = (now: number, i: number) => number;

/**
 * Packets travelling along the wires of an architecture drawing. Returns ref callbacks for the
 * wire paths and the packet circles (index i moves along wire i); positions are written straight
 * to the circles every frame.
 */
export function usePackets(svg: RefObject<SVGSVGElement | null>, position: PacketPosition) {
  const wires = useRef<(SVGPathElement | null)[]>([]);
  const packets = useRef<(SVGCircleElement | null)[]>([]);

  useFrameLoop(svg, ({ now }) => {
    packets.current.forEach((c, i) => {
      const p = wires.current[i];
      if (!c || !p) return;
      const pt = p.getPointAtLength(p.getTotalLength() * position(now, i));
      c.setAttribute("cx", String(pt.x));
      c.setAttribute("cy", String(pt.y));
    });
  });

  return {
    wire: (i: number) => (el: SVGPathElement | null) => {
      wires.current[i] = el;
    },
    packet: (i: number) => (el: SVGCircleElement | null) => {
      packets.current[i] = el;
    },
  };
}
