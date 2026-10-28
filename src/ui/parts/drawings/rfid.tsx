// RFID and NFC: the RC522 reader, cards and tags, and what you do with them.
import { box, cylinder, disc, line, poly, project } from "../iso";
import { Cyl, Face, type Hue, Shadow, Solid, Stroke, Wire } from "../shapes";
import { Waves } from "./radio";

/** A coil: nested rounded rectangles flat on a face at height z. */
function coil(x0: number, y0: number, x1: number, y1: number, z: number, turns = 3) {
  return Array.from({ length: turns }, (_, k) => {
    const i = k * 1.3;
    return line(
      [x0 + i, y0 + i, z],
      [x1 - i, y0 + i, z],
      [x1 - i, y1 - i, z],
      [x0 + i, y1 - i, z],
      [x0 + i, y0 + i + 1, z],
    );
  });
}

export function Reader() {
  return (
    <>
      <Shadow rx={24} y={49} />
      {[-7.5, -5.5, -3.5, -1.5, 0.5, 2.5, 4.5, 6.5].map((y) => (
        <Stroke key={y} d={line([-14, y, 0], [-14, y, -4])} hue="gold" w={1.1} t="lit" />
      ))}
      <Solid b={box(-15, -11, 0, 30, 22, 1.6)} hue="reader" />
      {coil(-1, -9.5, 13.5, 9.5, 1.6).map((d) => (
        <Stroke key={d} d={d} hue="copper" w={1.2} t="lit" />
      ))}
      <Solid b={box(-11, -4, 1.6, 5, 5, 1)} hue="plastic" />
      <Solid b={box(-10, 3, 1.6, 3.4, 1.6, 1.3)} hue="metal" />
    </>
  );
}

function CardBody({
  hue = "white",
  z = 0,
  dx = 0,
  dy = 0,
}: {
  hue?: Hue;
  z?: number;
  dx?: number;
  dy?: number;
}) {
  return (
    <>
      <Solid b={box(-14 + dx, -9 + dy, z, 28, 18, 1.2)} hue={hue} />
      <Face
        d={poly(
          [5 + dx, -6.5 + dy, z + 1.2],
          [10 + dx, -6.5 + dy, z + 1.2],
          [10 + dx, -2.5 + dy, z + 1.2],
          [5 + dx, -2.5 + dy, z + 1.2],
        )}
        hue="gold"
        t="lit"
      />
      <Face
        d={poly(
          [-14 + dx, 4 + dy, z + 1.2],
          [14 + dx, 4 + dy, z + 1.2],
          [14 + dx, 6.5 + dy, z + 1.2],
          [-14 + dx, 6.5 + dy, z + 1.2],
        )}
        hue="teal"
        ink={false}
      />
    </>
  );
}

export function Card() {
  return (
    <>
      <Shadow rx={23} y={48} />
      <CardBody />
      <Waves x={44} y={20} hue="teal" from={30} to={110} />
    </>
  );
}

export function Cards() {
  return (
    <>
      <Shadow rx={24} y={50} />
      <CardBody hue="sky" dx={3} dy={3} />
      <CardBody z={4} dx={-3} dy={-3} />
    </>
  );
}

export function Memory() {
  const cells = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const x = -12 + c * 6;
      const y = -7.5 + r * 3.6;
      cells.push(
        <Face
          key={`${r}${c}`}
          d={poly([x, y, 1.2], [x + 5, y, 1.2], [x + 5, y + 2.8, 1.2], [x, y + 2.8, 1.2])}
          hue={r === 3 ? "yellow" : (r + c) % 2 ? "sky" : "teal"}
          t="lit"
        />,
      );
    }
  return (
    <>
      <Shadow rx={23} y={48} />
      <Solid b={box(-14, -9, 0, 28, 18, 1.2)} hue="white" />
      {cells}
    </>
  );
}

export function Coins() {
  return (
    <>
      <Shadow rx={23} y={49} />
      <CardBody />
      {[0, 1, 2].map((i) => (
        <Cyl key={i} c={cylinder(4, 2, 1.2 + i * 2, 5.5, 2)} hue="gold" />
      ))}
      <Face d={disc(4, 2, 7.2, 2.8)} hue="yellow" t="lit" />
    </>
  );
}

export function Range() {
  const [x0, y0] = project([0, 0, 2]);
  const [, y1] = project([0, 0, 14]);
  return (
    <>
      <Shadow rx={20} y={48} />
      <Solid b={box(-11, -8, 0, 22, 16, 1.6)} hue="reader" />
      {coil(-8, -6, 8, 6, 1.6, 2).map((d) => (
        <Stroke key={d} d={d} hue="copper" w={1.1} t="lit" />
      ))}
      <Stroke d={`M${x0} ${y0 - 2}V${y1 + 2}`} hue="teal" w={1.6} dash="2 2" />
      <Stroke d={`M${x0 - 3} ${y1 + 5}l3-3 3 3M${x0 - 3} ${y0 - 5}l3 3 3-3`} hue="teal" w={1.6} />
      <Solid b={box(-10, -6.5, 14, 20, 13, 1)} hue="white" />
    </>
  );
}

function Fob({ hue, dx = 0, dy = 0 }: { hue: Hue; dx?: number; dy?: number }) {
  return (
    <>
      <Solid b={box(-3 + dx, -14 + dy, 0, 6, 6, 3)} hue={hue} />
      <Cyl c={cylinder(dx, dy, 0, 9, 3)} hue={hue} />
      <Face d={disc(dx, -11.5 + dy, 3, 1.4)} hue={hue} t="deep" />
      <Face d={disc(dx, dy, 3, 4)} hue={hue} t="shade" />
      <Wire d={disc(dx, -16 + dy, 3, 4)} hue="metal" w={1.4} />
    </>
  );
}

export function KeyFob() {
  return (
    <>
      <Shadow rx={16} y={47} />
      <Fob hue="blue" />
    </>
  );
}

export function KeyFobs() {
  return (
    <>
      <Shadow rx={24} y={48} />
      <Fob hue="blue" dx={-8} dy={-2} />
      <Fob hue="orange" dx={8} dy={6} />
    </>
  );
}
