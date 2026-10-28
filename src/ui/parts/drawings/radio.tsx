// Wi-Fi things: the access point, a phone, the cloud, a radio mast, the hardware diary.
import { arc, box, cylinder, disc, line, poly, project } from "../iso";
import { Cyl, Face, Glow, Shadow, Slab, Solid, Stroke, Wire } from "../shapes";

/** Three wave arcs, the universal "radio" mark, around a centre in the viewBox. */
export function Waves({
  x,
  y,
  hue = "sky",
  from = 45,
  to = 135,
}: {
  x: number;
  y: number;
  hue?: "sky" | "teal" | "blue";
  from?: number;
  to?: number;
}) {
  return (
    <>
      {[4, 8, 12].map((r, i) => (
        <Stroke key={r} d={arc(x, y, r, from, to)} hue={hue} w={2.2} t={i === 2 ? "lit" : "mid"} />
      ))}
    </>
  );
}

export function Router() {
  return (
    <>
      <Shadow rx={22} y={49} />
      <Cyl c={cylinder(-10, -6.5, 6, 1.2, 14)} hue="plastic" />
      <Cyl c={cylinder(10, -6.5, 6, 1.2, 14)} hue="plastic" />
      <Solid b={box(-12, -8, 0, 24, 16, 6)} hue="white" />
      {[-8, -5, -2].map((x) => (
        <Face
          key={x}
          d={poly([x, 8, 2.6], [x + 1.6, 8, 2.6], [x + 1.6, 8, 3.8], [x, 8, 3.8])}
          hue="green"
          t="lit"
        />
      ))}
      <Waves x={32} y={17} />
    </>
  );
}

export function Phone({ badge }: { badge: "wifi" | "ble" }) {
  const [bx, by] = project([0, 0, 2.5]);
  return (
    <>
      <Shadow rx={20} y={49} />
      <Solid b={box(-9, -14, 0, 18, 28, 2.4)} hue="plastic" />
      <Face
        d={poly([-7.6, -12.6, 2.4], [7.6, -12.6, 2.4], [7.6, 12.6, 2.4], [-7.6, 12.6, 2.4])}
        hue="glass"
      />
      {(
        [
          [-6, -11, "green"],
          [-1, -11, "yellow"],
          [-6, 7, "pink"],
          [-1, 7, "orange"],
        ] as const
      ).map(([x, y, hue]) => (
        <Face
          key={hue}
          d={poly([x, y, 2.4], [x + 3.5, y, 2.4], [x + 3.5, y + 3.5, 2.4], [x, y + 3.5, 2.4])}
          hue={hue}
          t="lit"
          ink={false}
        />
      ))}
      <Face d={disc(0, 0, 2.4, 5)} hue={badge === "wifi" ? "sky" : "blue"} t="lit" />
      {badge === "wifi" ? (
        <>
          <Stroke d={arc(bx, by + 1.5, 2.2, 50, 130)} hue="white" w={1.3} t="lit" />
          <Stroke d={arc(bx, by + 1.5, 4, 50, 130)} hue="white" w={1.3} t="lit" />
        </>
      ) : (
        <Stroke d={`M${bx - 2} ${by - 2}l4 3.5-2 2v-8l2 2-4 3.5`} hue="white" w={1.2} t="lit" />
      )}
      <Glow x={bx} y={by} r={9} hue={badge === "wifi" ? "sky" : "blue"} />
    </>
  );
}

export function Cloud() {
  return (
    <>
      <Shadow rx={18} y={51} />
      <Slab
        d="M16 44C9 44 9 33 17 33C17 22 31 18 35 27C40 20 51 24 49 33C56 34 56 44 49 44Z"
        hue="white"
        depth={3}
      />
      <Slab d="M32 26l6 6h-4v7h-4v-7h-4z" hue="sky" depth={1.5} />
    </>
  );
}

export function Tower() {
  const top: [number, number, number] = [0, 0, 26];
  return (
    <>
      <Shadow rx={12} y={48} />
      <Wire d={line([-7, -7, 0], top)} hue="steel" w={1.4} />
      <Wire d={line([7, 7, 0], top)} hue="steel" w={1.4} />
      <Wire d={line([7, -7, 0], top)} hue="steel" w={1.4} />
      <Wire d={line([-5, -5, 7], [5, 5, 7], [5, -5, 7])} hue="steel" w={1} />
      <Wire d={line([-3, -3, 15], [3, 3, 15], [3, -3, 15])} hue="steel" w={1} />
      <Cyl c={cylinder(0, 0, 25, 1.8, 2.4)} hue="red" />
      <Waves x={32} y={13} hue="teal" from={10} to={60} />
      <Waves x={32} y={13} hue="teal" from={120} to={170} />
    </>
  );
}

export function Notebook() {
  return (
    <>
      <Shadow rx={22} y={50} />
      <Solid b={box(-11, -14, 0, 22, 28, 0.9)} hue="orange" />
      <Solid b={box(-10.4, -13.4, 0.9, 21, 27, 2.2)} hue="white" />
      <Solid b={box(-11, -14, 3.1, 22, 28, 0.9)} hue="orange" />
      <Face d={poly([-6, -9, 4], [3, -9, 4], [3, 2, 4], [-6, 2, 4])} hue="white" t="lit" />
      <Stroke d={line([-4, -6, 4], [1, -6, 4])} hue="steel" w={1} />
      <Stroke d={line([-4, -3, 4], [0, -3, 4])} hue="steel" w={1} />
      <Wire d={line([7, -14, 4], [7, 14, 4], [7, 14, 0])} hue="purple" w={1.6} />
      <Face
        d={poly([-6, 14, 1], [-3.5, 14, 1], [-3.5, 14, -5], [-4.75, 14, -3.8], [-6, 14, -5])}
        hue="red"
      />
    </>
  );
}

export const PhoneWifi = () => <Phone badge="wifi" />;
export const PhoneBle = () => <Phone badge="ble" />;
