// Screens: the 1.9" TFT module, showing a trace or a colour test.
import type { ReactNode } from "react";
import { box, line, poly } from "../iso";
import { Face, type Hue, Shadow, Solid, Stroke } from "../shapes";

const Z = 3.25; // the glass

function TftModule({ children }: { children: ReactNode }) {
  return (
    <>
      <Shadow rx={23} y={48} />
      {[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((y) => (
        <Stroke key={y} d={line([-13, y, 0], [-13, y, -4])} hue="gold" w={1.2} t="lit" />
      ))}
      <Solid b={box(-14, -11, 0, 28, 22, 2)} hue="pcb" />
      <Solid b={box(-11, -9.5, 2, 23, 19, 1.25)} hue="plastic" />
      <Face d={poly([-10, -8.5, Z], [11, -8.5, Z], [11, 8.5, Z], [-10, 8.5, Z])} hue="glass" />
      {children}
    </>
  );
}

/** The display module showing a live trace, like the scope views. */
export function Tft() {
  const wave: [number, number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const x = -8.5 + i * 1.2;
    wave.push([x, -1 + 3.6 * Math.sin(i * 0.8), Z]);
  }
  return (
    <TftModule>
      <Stroke d={line(...wave)} hue="screen" w={1.6} t="lit" />
      <Face
        d={poly([5, -7, Z], [9.5, -7, Z], [9.5, -5.5, Z], [5, -5.5, Z])}
        hue="yellow"
        ink={false}
      />
      <Face d={poly([-8.5, 5, Z], [-2, 5, Z], [-2, 7, Z], [-8.5, 7, Z])} hue="pink" ink={false} />
    </TftModule>
  );
}

const BARS: readonly Hue[] = ["red", "orange", "yellow", "green", "sky", "purple"];

/** The display module showing the colour test of the showcase lab. */
export function Showcase() {
  return (
    <TftModule>
      {BARS.map((hue, i) => {
        const x0 = -9.5 + i * 3.4;
        return (
          <Face
            key={hue}
            d={poly([x0, -8, Z], [x0 + 3.4, -8, Z], [x0 + 3.4, 8, Z], [x0, 8, Z])}
            hue={hue}
            t="lit"
            ink={false}
          />
        );
      })}
    </TftModule>
  );
}
