// The DevKitC and the parts on it, plus the small modules wired to it.
import { arc, box, cylinder, disc, line, poly, project } from "../iso";
import { Cyl, Face, Glow, Shadow, Solid, Stroke, Wire } from "../shapes";

const at = (x: number, y: number, z: number) => project([x, y, z]);

export function DevKit() {
  const pins = Array.from({ length: 12 }, (_, i) => -14 + i * 2.8);
  const [gx, gy] = at(-1.5, 2.5, 4);
  return (
    <>
      <Shadow rx={25} y={47} />
      {pins.map((x) => (
        <Wire key={`leg${x}`} d={line([x, 6.3, 0], [x, 6.3, -4.5])} hue="gold" w={1} />
      ))}
      <Solid b={box(-20, -7, 0, 40, 14, 2.5)} hue="pcb" />
      <Solid b={box(5, -6, 2.5, 15, 12, 1)} hue="edge" />
      <Solid b={box(6, -5.5, 3.5, 10, 11, 3.5)} hue="metal" />
      <Stroke
        d={line(
          [17, -4.5, 3.5],
          [19, -4.5, 3.5],
          [19, -2, 3.5],
          [17, -2, 3.5],
          [17, 0.5, 3.5],
          [19, 0.5, 3.5],
          [19, 3, 3.5],
          [17, 3, 3.5],
        )}
        hue="gold"
        w={1}
        t="lit"
      />
      <Solid b={box(-22, -5.5, 2.5, 5, 4, 2.2)} hue="metal" />
      <Solid b={box(-22, 1.5, 2.5, 5, 4, 2.2)} hue="metal" />
      <Solid b={box(-15.5, -6.2, 2.5, 2.4, 2.4, 1.2)} hue="plastic" />
      <Solid b={box(-15.5, 3.8, 2.5, 2.4, 2.4, 1.2)} hue="plastic" />
      <Glow x={gx} y={gy} r={7} hue="pink" />
      <Solid b={box(-3, 1, 2.5, 3, 3, 1.2)} hue="white" />
      {pins.map((x) => (
        <Solid key={`b${x}`} b={box(x - 0.5, -6.8, 2.5, 1, 1, 0.7)} hue="gold" />
      ))}
      {pins.map((x) => (
        <Solid key={`f${x}`} b={box(x - 0.5, 5.8, 2.5, 1, 1, 0.7)} hue="gold" />
      ))}
    </>
  );
}

export function Module() {
  return (
    <>
      <Shadow rx={22} y={47} />
      <Solid b={box(-13, -10, 0, 26, 20, 2)} hue="pcb" />
      <Solid b={box(-12, -9, 2, 17, 18, 4.5)} hue="metal" />
      <Stroke d={line([-8, -5, 6.5], [1, -5, 6.5])} hue="steel" w={1.2} />
      <Stroke d={line([-8, -1.5, 6.5], [3, -1.5, 6.5])} hue="steel" w={1.2} />
      <Stroke d={line([-8, 2, 6.5], [-1, 2, 6.5])} hue="steel" w={1.2} />
      <Stroke
        d={line(
          [6.5, -7.5, 2],
          [11.5, -7.5, 2],
          [11.5, -4, 2],
          [6.5, -4, 2],
          [6.5, -0.5, 2],
          [11.5, -0.5, 2],
          [11.5, 3, 2],
          [6.5, 3, 2],
          [6.5, 6.5, 2],
          [11.5, 6.5, 2],
        )}
        hue="gold"
        w={1.4}
        t="lit"
      />
    </>
  );
}

export function UsbC() {
  return (
    <>
      <Shadow rx={18} y={48} />
      <Solid b={box(-9, -14, -2, 18, 28, 2)} hue="pcb" />
      <Solid b={box(-5, -12, 0, 10, 24, 7)} hue="metal" />
      <Face
        d={poly([-3.6, 12, 1.6], [3.6, 12, 1.6], [3.6, 12, 5.4], [-3.6, 12, 5.4])}
        hue="plastic"
        t="deep"
      />
      <Stroke d={line([-2.2, 12, 3.5], [2.2, 12, 3.5])} hue="gold" w={1.6} t="lit" />
    </>
  );
}

export function Cable() {
  return (
    <>
      <Shadow rx={16} y={50} />
      <Wire
        d={`M${at(0, -6, 6.5).join(" ")}C${at(0, -14, 7).join(" ")} ${at(6, -22, 10).join(" ")} ${at(14, -24, 14).join(" ")}`}
        hue="sky"
        w={3.6}
      />
      <Solid b={box(-4, -6, 3.5, 8, 12, 6)} hue="sky" />
      <Solid b={box(-2.6, 6, 5, 5.2, 5, 3)} hue="metal" />
      <Face
        d={poly([-1.4, 11, 5.8], [1.4, 11, 5.8], [1.4, 11, 7.2], [-1.4, 11, 7.2])}
        hue="plastic"
        t="deep"
      />
    </>
  );
}

export function Button() {
  return (
    <>
      <Shadow rx={18} y={48} />
      {[-8, 8].map((x) => (
        <Wire key={x} d={line([x, 6, 0], [x, 9, -3])} hue="gold" w={1.3} />
      ))}
      <Solid b={box(-9, -9, 0, 18, 18, 4)} hue="plastic" />
      <Solid b={box(-9, -9, 4, 18, 18, 1)} hue="metal" />
      <Cyl c={cylinder(0, 0, 5, 5.2, 4.5)} hue="red" />
    </>
  );
}

export function RgbLed() {
  const [x, y] = at(0, 0, 4);
  return (
    <>
      <Shadow rx={18} y={47} />
      <Solid b={box(-9, -9, 0, 18, 18, 4)} hue="white" />
      <Face d={poly([-6, -6, 4], [6, -6, 4], [6, 6, 4], [-6, 6, 4])} hue="yellow" t="lit" />
      <Glow x={x - 5} y={y} r={11} hue="red" />
      <Glow x={x + 5} y={y} r={11} hue="blue" />
      <Glow x={x} y={y + 3} r={11} hue="green" />
      <Face d={poly([-4, -3, 4], [-2, -3, 4], [-2, -1, 4], [-4, -1, 4])} hue="red" />
      <Face d={poly([-1, -1, 4], [1, -1, 4], [1, 1, 4], [-1, 1, 4])} hue="green" />
      <Face d={poly([2, 1, 4], [4, 1, 4], [4, 3, 4], [2, 3, 4])} hue="blue" />
    </>
  );
}

export function Led({ hue = "red" }: { hue?: "red" | "green" | "blue" | "yellow" }) {
  const [cx, cy] = at(0, 0, 16.5);
  const rx = 6 * Math.SQRT2 * Math.cos(Math.PI / 6);
  return (
    <>
      <Shadow rx={13} y={46} />
      <Wire d={line([-2.2, 0, 8], [-2.2, 0, -7])} hue="gold" w={1.4} />
      <Wire d={line([2.2, 0, 8], [2.2, 0, -2], [3.6, 1, -4.5])} hue="gold" w={1.4} />
      <Cyl c={cylinder(0, 0, 7, 7, 1.6)} hue={hue} />
      <Cyl c={cylinder(0, 0, 8.6, 6, 7.9)} hue={hue} />
      <Face d={`M${cx - rx} ${cy}A${rx} ${rx * 0.95} 0 0 1 ${cx + rx} ${cy}Z`} hue={hue} t="lit" />
      <path
        d={`M${cx - 3.4} ${cy - 2}a2 3.4 -20 1 1 0.1 0Z`}
        style={{ fill: "var(--part-light)" }}
        opacity={0.7}
      />
      <Glow x={cx} y={cy - 2} r={13} hue={hue} />
    </>
  );
}

export function Header() {
  const xs = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5];
  return (
    <>
      <Shadow rx={20} y={48} />
      {xs.map((x) => (
        <Wire key={`l${x}`} d={line([x, 0, 0], [x, 0, -6])} hue="gold" w={1.3} />
      ))}
      <Solid b={box(-15, -2.5, 0, 30, 5, 5)} hue="plastic" />
      {xs.map((x) => (
        <Solid key={`p${x}`} b={box(x - 0.7, -0.7, 5, 1.4, 1.4, 8)} hue="gold" />
      ))}
    </>
  );
}

export function Antenna() {
  const meander: [number, number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const x = -11 + i * 3;
    meander.push(i % 2 ? [x, 6, 2] : [x, -6, 2], i % 2 ? [x, -6, 2] : [x, 6, 2]);
  }
  return (
    <>
      <Shadow rx={22} y={48} />
      <Solid b={box(-14, -9, 0, 28, 18, 2)} hue="pcb" />
      <Wire d={line(...meander)} hue="gold" w={1.3} />
      <Stroke d={arc(46, 22, 6, 30, 110)} hue="teal" w={2} />
      <Stroke d={arc(46, 22, 11, 30, 110)} hue="teal" w={2} t="lit" />
    </>
  );
}

export function Sensor() {
  return (
    <>
      <Shadow rx={17} y={47} />
      {[-5, -1.5, 2, 5.5].map((y) => (
        <Wire key={y} d={line([-8, y, 0], [-8, y, -5])} hue="gold" w={1.1} />
      ))}
      <Solid b={box(-10, -8, 0, 20, 16, 1.6)} hue="purple" />
      {[-5, -1.5, 2, 5.5].map((y) => (
        <Face key={`p${y}`} d={disc(-8, y, 1.6, 0.9)} hue="gold" t="lit" />
      ))}
      <Solid b={box(-1, -3, 1.6, 6, 6, 1.8)} hue="metal" />
      <Face d={disc(2, 0, 3.4, 0.8)} hue="plastic" t="deep" />
      <Cyl c={cylinder(-5, 4, 1.6, 1.2, 1)} hue="yellow" />
    </>
  );
}

export function Knob() {
  const [cx, cy] = at(0, 0, 14);
  return (
    <>
      <Shadow rx={16} y={48} />
      {[-5, 0, 5].map((x) => (
        <Wire key={x} d={line([x, 8, 0], [x, 8, -5])} hue="gold" w={1.3} />
      ))}
      <Solid b={box(-8, -8, 0, 16, 16, 5)} hue="blue" />
      <Cyl c={cylinder(0, 0, 5, 2.6, 3)} hue="metal" />
      <Cyl c={cylinder(0, 0, 8, 6.4, 6)} hue="plastic" />
      <Stroke d={`M${cx} ${cy}L${cx - 4} ${cy + 3}`} hue="white" w={1.8} t="lit" />
    </>
  );
}

export const RedLed = () => <Led hue="red" />;
