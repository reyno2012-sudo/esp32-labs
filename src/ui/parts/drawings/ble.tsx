// Bluetooth LE: the logo, scanning, advertising, talking, pairing, and the devices it drives.
import { arc, box, cylinder, disc, line, poly, project, ring } from "../iso";
import { Cyl, Face, Glow, Shadow, Slab, Solid, Stroke, Wire } from "../shapes";

const RUNE = "M27 25l10 9-5 5V17l5 5-10 9";

export function Bluetooth() {
  return (
    <>
      <Shadow rx={18} y={51} />
      <Slab
        d="M21 16h22a7 7 0 0 1 7 7v18a7 7 0 0 1-7 7H21a7 7 0 0 1-7-7V23a7 7 0 0 1 7-7z"
        hue="blue"
        depth={4}
      />
      <Stroke d={RUNE} hue="white" w={2.6} t="lit" />
    </>
  );
}

export function Radar() {
  const tilt: [number, number, number] = [0.8, 0, 0.6];
  const rim = ring([0, 0, 15], tilt, [0, 1, 0], 11);
  const [fx, fy] = project([5, 0, 20]);
  const [cx, cy] = project([0, 0, 15]);
  return (
    <>
      <Shadow rx={14} y={48} />
      <Cyl c={cylinder(0, 0, 0, 6, 3)} hue="steel" />
      <Wire d={line([0, 0, 3], [0, 0, 12])} hue="steel" w={2} />
      <Face d={rim} hue="white" />
      <Face d={ring([0, 0, 15], tilt, [0, 1, 0], 7)} hue="white" t="shade" />
      <Wire d={`M${cx} ${cy}L${fx} ${fy}`} hue="steel" w={1.2} />
      <Cyl c={cylinder(5, 0, 19, 1.4, 1.6)} hue="red" />
      <Stroke d={arc(fx, fy, 6, 20, 80)} hue="blue" w={2} />
      <Stroke d={arc(fx, fy, 10, 20, 80)} hue="blue" w={2} t="lit" />
    </>
  );
}

export function Beacon() {
  const [x, y] = project([0, 0, 7]);
  return (
    <>
      <Shadow rx={18} y={47} />
      <Stroke d={disc(0, 0, 2, 15)} hue="blue" w={1.4} t="lit" dash="3 3" />
      <Stroke d={disc(0, 0, 2, 12)} hue="blue" w={1.6} />
      <Cyl c={cylinder(0, 0, 0, 9, 5)} hue="white" />
      <Glow x={x} y={y} r={10} hue="sky" />
      <Cyl c={cylinder(0, 0, 5, 4, 2)} hue="sky" />
    </>
  );
}

export function Chat() {
  return (
    <>
      <Shadow rx={20} y={52} />
      <Slab
        d="M14 14h24a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H24l-6 5v-5h-4a5 5 0 0 1-5-5V19a5 5 0 0 1 5-5z"
        hue="blue"
        depth={3}
      />
      <Slab
        d="M28 28h20a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-2v5l-6-5H28a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z"
        hue="white"
        depth={3}
      />
      {[32, 38, 44].map((x) => (
        <circle key={x} cx={x} cy={37} r={1.6} style={{ fill: "var(--part-blue)" }} />
      ))}
    </>
  );
}

export function Padlock() {
  const shackle: [number, number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI;
    shackle.push([5.5 * Math.cos(a), 0, 12 + 7 * Math.sin(a)]);
  }
  return (
    <>
      <Shadow rx={15} y={47} />
      <Wire d={line([-5.5, 0, 10], ...shackle, [5.5, 0, 10])} hue="metal" w={2.6} />
      <Solid b={box(-8, -4, 0, 16, 8, 12)} hue="gold" />
      <Face d={ring([0, 4, 7.5], [1, 0, 0], [0, 0, 1], 1.7)} hue="plastic" t="deep" />
      <Face d={poly([-0.7, 4, 6.5], [0.7, 4, 6.5], [1, 4, 3], [-1, 4, 3])} hue="plastic" t="deep" />
    </>
  );
}

export function Keyboard() {
  const keys = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++)
      keys.push(
        <Solid
          key={`${r}${c}`}
          b={box(-14 + c * 4.8, -7.5 + r * 4, 3, 3.8, 3.2, 1.5)}
          hue="white"
        />,
      );
  return (
    <>
      <Shadow rx={25} y={49} />
      <Solid b={box(-16, -9, 0, 32, 18, 3)} hue="plastic" />
      {keys}
      <Solid b={box(-9, 4.5, 3, 18, 3, 1.5)} hue="sky" />
    </>
  );
}

export function Note() {
  return (
    <>
      <Shadow rx={16} y={52} />
      <Slab d="M27 17l21-5v6l-21 5z" hue="purple" depth={2.5} />
      <Slab d="M26 20h3v24h-3zM45 15h3v24h-3z" hue="purple" depth={2.5} />
      <Slab d="M17 45a6 4.6 -20 1 0 12 -3a6 4.6 -20 1 0 -12 3z" hue="purple" depth={2.5} />
      <Slab d="M36 40a6 4.6 -20 1 0 12 -3a6 4.6 -20 1 0 -12 3z" hue="pink" depth={2.5} />
    </>
  );
}

export function Mouse() {
  return (
    <>
      <Shadow rx={15} y={52} />
      <Stroke d="M32 15C32 9 40 8 44 4" hue="sky" w={2.2} />
      <Slab
        d="M32 15c9 0 13 7 13 16v4c0 8-6 13-13 13s-13-5-13-13v-4c0-9 4-16 13-16z"
        hue="white"
        depth={4}
      />
      <Stroke d="M32 15v13M19.5 28h25" hue="steel" w={1.2} />
      <Slab d="M30.5 18h3v6h-3z" hue="blue" depth={1} />
    </>
  );
}
