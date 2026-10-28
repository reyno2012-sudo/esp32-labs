// Sound: the I²S microphone, a level meter, a clap, a recorder, a spectrum, a game, a speaker.
import { box, cylinder, disc, line, poly, ring, LEFT_FACE } from "../iso";
import { Cyl, Face, type Hue, Shadow, Slab, Solid, Stroke, Wire } from "../shapes";
import { Waves } from "./radio";

export function Mic() {
  return (
    <>
      <Shadow rx={17} y={48} />
      {[-4, 0, 4].map((x) => (
        <Wire key={x} d={line([x, 9, 0], [x, 9, -5])} hue="gold" w={1.2} />
      ))}
      <Cyl c={cylinder(0, 0, 0, 11, 1.6)} hue="purple" />
      {[-4, 0, 4].map((x) => (
        <Face key={`p${x}`} d={disc(x, 7.5, 1.6, 1)} hue="gold" t="lit" />
      ))}
      <Solid b={box(-3, -4, 1.6, 6, 6, 1.6)} hue="metal" />
      <Face d={disc(0, -1, 3.2, 0.9)} hue="plastic" t="deep" />
      <Waves x={32} y={20} hue="teal" from={50} to={130} />
    </>
  );
}

export function Meter() {
  const scale: [number, number, number][] = [];
  const red: [number, number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (0.85 - i * 0.07);
    const p: [number, number, number] = [8.5 * Math.cos(a), 4.05, 4 + 8.5 * Math.sin(a)];
    if (i <= 8) scale.push(p);
    if (i >= 8) red.push(p);
  }
  const needle = Math.PI * 0.42;
  return (
    <>
      <Shadow rx={22} y={48} />
      <Solid b={box(-13, -4, 0, 26, 8, 16)} hue="plastic" />
      <Face
        d={poly([-11, 4.02, 2], [11, 4.02, 2], [11, 4.02, 14], [-11, 4.02, 14])}
        hue="white"
        t="lit"
      />
      <Stroke d={line(...scale)} hue="plastic" w={1.6} />
      <Stroke d={line(...red)} hue="red" w={2} />
      <Wire
        d={line([0, 4.05, 4], [7.5 * Math.cos(needle), 4.05, 4 + 7.5 * Math.sin(needle)])}
        hue="red"
        w={1.2}
      />
      <Face d={ring([0, 4.05, 4], LEFT_FACE.u, LEFT_FACE.v, 1.3)} hue="plastic" />
    </>
  );
}

export function Burst() {
  const pts: string[] = [];
  for (let i = 0; i < 20; i++) {
    const r = i % 2 ? 9 : 19;
    const a = (i / 20) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(32 + r * Math.cos(a)).toFixed(1)} ${(30 + r * Math.sin(a) * 0.92).toFixed(1)}`);
  }
  return (
    <>
      <Shadow rx={16} y={52} />
      <Slab d={`M${pts.join("L")}Z`} hue="yellow" depth={3} />
      <Slab d="M33 20l-7 11h5l-2 9 8-12h-5l2-8z" hue="orange" depth={1.5} />
    </>
  );
}

export function Cassette() {
  return (
    <>
      <Shadow rx={25} y={49} />
      <Solid b={box(-15, -10, 0, 30, 20, 3.5)} hue="plastic" />
      <Face
        d={poly([-12.5, -8, 3.5], [12.5, -8, 3.5], [12.5, 5, 3.5], [-12.5, 5, 3.5])}
        hue="white"
        t="lit"
      />
      <Face
        d={poly([-12.5, -8, 3.5], [12.5, -8, 3.5], [12.5, -5.5, 3.5], [-12.5, -5.5, 3.5])}
        hue="orange"
        ink={false}
      />
      <Face d={poly([-7, -3.5, 3.5], [7, -3.5, 3.5], [7, 3, 3.5], [-7, 3, 3.5])} hue="glass" />
      {[-4, 4].map((x) => (
        <g key={x}>
          <Face d={disc(x, 0, 3.5, 2.8)} hue="white" />
          <Face d={disc(x, 0, 3.5, 1.1)} hue="plastic" t="deep" />
        </g>
      ))}
      <Solid b={box(-8, 6.5, 3.5, 16, 3.5, 0.6)} hue="steel" />
    </>
  );
}

const EQ: readonly (readonly [Hue, number])[] = [
  ["green", 8],
  ["yellow", 15],
  ["orange", 21],
  ["pink", 13],
  ["sky", 7],
];

export function Equalizer() {
  return (
    <>
      <Shadow rx={24} y={49} />
      <Solid b={box(-16, -6, 0, 32, 12, 2)} hue="plastic" />
      {EQ.map(([hue, h], i) => (
        <Solid key={hue} b={box(-14 + i * 6, -2, 2, 4, 4, h)} hue={hue} />
      ))}
    </>
  );
}

export function Gamepad() {
  return (
    <>
      <Shadow rx={22} y={52} />
      <Slab
        d="M18 22h28c7 0 11 6 11 13 0 6-3 11-8 11-4 0-6-3-8-6H23c-2 3-4 6-8 6-5 0-8-5-8-11 0-7 4-13 11-13z"
        hue="purple"
        depth={4}
      />
      <Slab d="M17 29h4v4h4v4h-4v4h-4v-4h-4v-4h4z" hue="plastic" depth={1.2} />
      {(
        [
          [44, 31, "yellow"],
          [49, 35, "red"],
          [39, 35, "sky"],
          [44, 39, "green"],
        ] as const
      ).map(([x, y, hue]) => (
        <Slab
          key={hue}
          d={`M${x - 2.4} ${y}a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0z`}
          hue={hue}
          depth={1}
        />
      ))}
    </>
  );
}

export function Speaker() {
  const at = (r: number, z = 10) => ring([0, 6.02, z], LEFT_FACE.u, LEFT_FACE.v, r);
  return (
    <>
      <Shadow rx={20} y={49} />
      <Solid b={box(-11, -6, 0, 22, 12, 21)} hue="orange" />
      <Face d={at(8)} hue="plastic" t="deep" />
      <Face d={at(6)} hue="steel" />
      <Face d={at(2.6)} hue="plastic" t="shade" />
      <Face d={at(1.8, 18)} hue="plastic" t="deep" />
      <Waves x={14} y={24} hue="sky" from={135} to={225} />
    </>
  );
}
