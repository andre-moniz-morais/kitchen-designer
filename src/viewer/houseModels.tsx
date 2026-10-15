import { useMemo } from 'react';
import * as THREE from 'three';
import { getEntry, type ModelKind } from '../catalog';
import type { Item } from '../types';
import { color3, M, mat3 } from './materials3d';
import { Bx, Cyl, Front, FRONT_T } from './models';

type Mat = THREE.Material;
type P3 = [number, number, number];

/* All models are in cm, item-local: x = width, y = up (0 = bottom), z = depth, front faces +z. */

const SHEET = () => color3('#f4f2ec', 0.95);
const CERAMIC_DARK = () => color3('#b9c2c8', 0.25, 0.1);
const LEAF = ['#3f6b3a', '#4f7d45', '#365f33', '#5b8a4e'];

/** A cylinder from one point to another (pipes, frames, rails). */
function Tube({ from, to, r, m, seg = 12 }: { from: P3; to: P3; r: number; m: Mat; seg?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: d.length() };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
      <primitive object={m} attach="material" />
    </mesh>
  );
}

function Legs({ w, d, h, m, inset = 6, r = 2, round = true }: { w: number; d: number; h: number; m: Mat; inset?: number; r?: number; round?: boolean }) {
  return (
    <>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) =>
          round ? (
            <Cyl key={`${sx}${sz}`} x={sx * (w / 2 - inset)} z={sz * (d / 2 - inset)} y={h / 2} r={r} r2={r * 0.8} h={h} m={m} seg={10} />
          ) : (
            <Bx key={`${sx}${sz}`} x={sx * (w / 2 - inset)} z={sz * (d / 2 - inset)} w={r * 2} h={h} d={r * 2} m={m} />
          ),
        ),
      )}
    </>
  );
}

/* ----------------------------- Living room ----------------------------- */

function Sofa({ it, corner, armW = 18 }: { it: Item; corner?: boolean; armW?: number }) {
  const { width: w, depth: d, height: h } = it;
  const f = mat3(it.materials.fabric);
  const b = mat3(it.materials.body);
  const legH = 12;
  const seatTop = 44;
  const backD = 22;
  const armH = 62;
  const mainD = corner ? Math.min(98, d * 0.55) : d;
  const chaiseW = corner ? Math.min(95, w * 0.35) : 0;
  const seatW = w - armW * (corner ? 1 : 2) - chaiseW;
  const n = Math.max(1, Math.round(seatW / 68));
  const cw = seatW / n;
  const x0 = -w / 2 + armW;
  const cushionD = mainD - backD - 3;
  return (
    <group>
      {/* Base and seat cushions of the main part. */}
      <Bx w={w} h={seatTop - legH - 12} d={mainD} y={legH} z={-d / 2 + mainD / 2} m={f} />
      {Array.from({ length: n }, (_, i) => (
        <Bx key={i} x={x0 + cw * (i + 0.5)} w={cw - 1.5} h={12} d={cushionD} y={seatTop - 12} z={-d / 2 + backD + cushionD / 2 + 1} m={f} />
      ))}
      {/* Back and back cushions. */}
      <Bx w={w} h={h - legH - 4} d={backD - 8} y={legH} z={-d / 2 + (backD - 8) / 2} m={f} />
      {Array.from({ length: n }, (_, i) => (
        <Bx key={`b${i}`} x={x0 + cw * (i + 0.5)} w={cw - 2} h={h - seatTop - 6} d={12} y={seatTop} z={-d / 2 + backD - 3} m={f} />
      ))}
      {/* Arms. */}
      <Bx x={-w / 2 + armW / 2} w={armW} h={armH - legH} d={mainD} y={legH} z={-d / 2 + mainD / 2} m={f} />
      {!corner && <Bx x={w / 2 - armW / 2} w={armW} h={armH - legH} d={mainD} y={legH} z={-d / 2 + mainD / 2} m={f} />}
      {corner && (
        <>
          {/* Chaise longue on the right, running to the front. */}
          <Bx x={w / 2 - chaiseW / 2} w={chaiseW} h={seatTop - legH - 12} d={d} y={legH} m={f} />
          <Bx x={w / 2 - chaiseW / 2} w={chaiseW - 2} h={12} d={d - backD - 2} y={seatTop - 12} z={backD / 2} m={f} />
          <Bx key="bc" x={w / 2 - chaiseW / 2} w={chaiseW - 2} h={h - seatTop - 6} d={12} y={seatTop} z={-d / 2 + backD - 3} m={f} />
        </>
      )}
      <Legs w={w} d={corner ? d : mainD} h={legH} m={b} r={2.2} inset={5} />
      {corner && <Legs w={w} d={mainD} h={legH} m={b} r={2.2} inset={5} />}
    </group>
  );
}

function CoffeeTable({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  return (
    <group>
      <Bx w={w} h={4} d={d} y={h - 4} m={mat3(it.materials.top)} grain="h" />
      <Bx w={w - 10} h={2} d={d - 10} y={10} m={mat3(it.materials.top)} grain="h" />
      <Legs w={w} d={d} h={h - 4} m={mat3(it.materials.body)} r={1.8} inset={5} round={false} />
    </group>
  );
}

function SideTable({ it }: { it: Item }) {
  const { width: w, height: h } = it;
  const b = mat3(it.materials.body);
  return (
    <group>
      <Cyl r={w / 2} h={3} y={h - 1.5} m={mat3(it.materials.top)} seg={40} />
      <Cyl r={1.6} h={h - 4} y={(h - 4) / 2 + 1} m={b} seg={12} />
      <Cyl r={w / 3} h={1.5} y={0.75} m={b} seg={32} />
    </group>
  );
}

function TvUnit({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const front = mat3(it.materials.front);
  const body = mat3(it.materials.body);
  const legH = 10;
  const n = Math.max(2, Math.round(w / 60));
  const fw = w / n;
  return (
    <group>
      <Legs w={w} d={d} h={legH} m={color3('#1d1e20', 0.5)} r={1.5} inset={6} />
      <Bx w={w} h={h - legH} d={d - FRONT_T} y={legH} z={-FRONT_T / 2} m={body} />
      {Array.from({ length: n }, (_, i) => (
        <Front key={i} x={-w / 2 + fw * (i + 0.5)} y={legH} w={fw} h={h - legH} z={d / 2 - FRONT_T} m={front} handle="none" />
      ))}
    </group>
  );
}

function Tv({ it }: { it: Item }) {
  const { width: w, height: h } = it;
  const stand = 6;
  return (
    <group>
      <Bx w={w * 0.35} h={1.2} d={22} m={color3('#1b1c1f', 0.4, 0.4)} />
      <Bx w={5} h={stand + 6} d={3} z={-1} m={color3('#1b1c1f', 0.4, 0.4)} />
      <Bx w={w} h={h - stand} d={3} y={stand} m={color3('#151618', 0.4, 0.2)} />
      <Bx w={w - 1.6} h={h - stand - 1.6} d={0.4} y={stand + 0.8} z={1.6} m={M.blackGlass} />
    </group>
  );
}

const BOOK_COLORS = ['#7b3b2c', '#2f4a5e', '#c7a15a', '#3e5a45', '#d8d2c4', '#8a6a4a', '#5d2f3d', '#a7b4bc', '#2b2b2e'];

function Books({ w, y, d, seed }: { w: number; y: number; d: number; seed: number }) {
  const books: React.ReactNode[] = [];
  let x = -w / 2 + 2;
  let k = seed;
  while (x < w / 2 - 6) {
    k = (k * 9301 + 49297) % 233280;
    const r = k / 233280;
    const bw = 2.5 + r * 3;
    const bh = 20 + r * 9;
    if (r > 0.86) {
      x += 10; // a gap now and then
      continue;
    }
    books.push(<Bx key={x} x={x + bw / 2} y={y} w={bw} h={bh} d={d * 0.7} z={-d * 0.1} m={color3(BOOK_COLORS[Math.floor(r * BOOK_COLORS.length)], 0.8)} />);
    x += bw + 0.3;
  }
  return <>{books}</>;
}

function Bookcase({ it, books = true }: { it: Item; books?: boolean }) {
  const { width: w, depth: d, height: h } = it;
  const b = mat3(it.materials.body);
  const t = 2;
  const shelves = Math.max(2, Math.round(h / 38));
  const gap = (h - t) / shelves;
  return (
    <group>
      {[-1, 1].map((s) => (
        <Bx key={s} x={s * (w / 2 - t / 2)} w={t} h={h} d={d} m={b} />
      ))}
      <Bx w={w} h={1} d={1} y={0} z={-d / 2 + 0.5} m={b} />
      <Bx w={w - 2 * t} h={h} d={1} z={-d / 2 + 0.5} m={b} />
      {Array.from({ length: shelves + 1 }, (_, i) => (
        <Bx key={i} w={w - 2 * t} h={t} d={d - 1} y={i * gap} z={0.5} m={b} grain="h" />
      ))}
      {books && Array.from({ length: shelves }, (_, i) => (i % 3 === 2 ? null : <Books key={i} w={w - 2 * t} y={i * gap + t} d={d} seed={i * 17 + Math.round(w)} />))}
    </group>
  );
}

function Sideboard({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const legH = 16;
  const n = Math.max(2, Math.round(w / 45));
  const fw = w / n;
  return (
    <group>
      <Legs w={w} d={d} h={legH} m={mat3(it.materials.body)} r={1.6} inset={6} />
      <Bx w={w} h={h - legH} d={d - FRONT_T} y={legH} z={-FRONT_T / 2} m={mat3(it.materials.body)} />
      {Array.from({ length: n }, (_, i) => (
        <Front key={i} x={-w / 2 + fw * (i + 0.5)} y={legH + 1} w={fw} h={h - legH - 2} z={d / 2 - FRONT_T} m={mat3(it.materials.front)} handlePos={i < n / 2 ? 'tr' : 'tl'} handleLen={12} />
      ))}
    </group>
  );
}

function Fireplace({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const stone = mat3(it.materials.top);
  const pw = w * 0.18;
  const lint = h * 0.25;
  const ow = w - 2 * pw;
  return (
    <group>
      <Bx w={w + 12} h={6} d={d + 14} z={7} m={stone} />
      {[-1, 1].map((s) => (
        <Bx key={s} x={s * (w / 2 - pw / 2)} y={6} w={pw} h={h - 6 - lint} d={d} m={stone} />
      ))}
      <Bx y={h - lint} w={w} h={lint} d={d} m={stone} />
      <Bx y={h - 4} w={w + 8} h={4} d={d + 6} z={3} m={stone} />
      <Bx y={6} w={ow} h={h - 6 - lint} d={d - 6} z={-3} m={color3('#141414', 0.9)} />
      {/* Embers and flames. */}
      {[-0.25, 0, 0.25].map((fx, i) => (
        <Bx key={i} x={fx * ow} y={8} w={ow * 0.18} h={4} d={8} z={0} m={color3('#5a2a12', 0.8, 0, { emissive: '#ff6a1a', emissiveIntensity: 1.2 })} />
      ))}
      <Bx y={12} w={ow * 0.55} h={16} d={2} z={0} m={color3('#ffb347', 0.5, 0, { emissive: '#ff8a2a', emissiveIntensity: 2, transparent: true, opacity: 0.75 })} />
      <pointLight position={[0, 25, d / 2 + 10]} intensity={2.5} distance={3.5} decay={2} color="#ff9a4a" />
    </group>
  );
}

function FloorLamp({ it }: { it: Item }) {
  const { height: h } = it;
  const m = mat3(it.materials.finish);
  return (
    <group>
      <Cyl r={14} h={2} y={1} m={m} seg={32} />
      <Cyl r={1.1} h={h - 28} y={(h - 28) / 2 + 2} m={m} seg={10} />
      <Cyl r={20} r2={13} h={26} y={h - 13} m={color3('#efe7d8', 0.95, 0, { emissive: '#ffe2b0', emissiveIntensity: 0.5, side: THREE.DoubleSide })} seg={32} open />
      <pointLight position={[0, h - 20, 0]} intensity={3} distance={4} decay={2} color="#ffe0b0" />
    </group>
  );
}

function Plant({ it }: { it: Item }) {
  const { width: w, height: h } = it;
  const pot = mat3(it.materials.finish);
  const ph = Math.min(h * 0.35, 40);
  const r = w * 0.32;
  const leaves = useMemo(() => {
    const out: { p: P3; s: number; c: string }[] = [];
    let k = Math.round(w * 13 + h);
    const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
    const n = Math.round(10 + h / 8);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const yy = ph + 8 + rnd() * (h - ph - 16);
      const spread = (w / 2) * (0.3 + 0.7 * Math.sin(((yy - ph) / (h - ph)) * Math.PI));
      out.push({ p: [Math.cos(a) * spread * rnd(), yy, Math.sin(a) * spread * rnd()], s: 5 + rnd() * (w / 6), c: LEAF[Math.floor(rnd() * LEAF.length)] });
    }
    return out;
  }, [w, h, ph]);
  return (
    <group>
      <Cyl r={r * 0.8} r2={r} h={ph} y={ph / 2} m={pot} seg={24} />
      <Cyl r={r * 0.95} h={1} y={ph - 1.5} m={color3('#3b2a1e', 1)} seg={24} />
      <Cyl r={1.2} h={h - ph - 10} y={ph + (h - ph - 10) / 2} m={color3('#5a4632', 0.9)} seg={8} />
      {leaves.map((l, i) => (
        <mesh key={i} position={l.p} scale={[1, 0.7, 1]} castShadow>
          <icosahedronGeometry args={[l.s, 0]} />
          <primitive object={color3(l.c, 0.8)} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Radiator({ it, towel }: { it: Item; towel?: boolean }) {
  const { width: w, depth: d, height: h } = it;
  const m = mat3(it.materials.finish);
  if (towel) {
    const bars = Math.max(4, Math.round(h / 11));
    return (
      <group>
        {[-1, 1].map((s) => (
          <Cyl key={s} x={s * (w / 2 - 1.5)} y={h / 2} r={1.5} h={h} m={m} seg={12} />
        ))}
        {Array.from({ length: bars }, (_, i) => (
          <Cyl key={i} y={4 + (i * (h - 8)) / (bars - 1)} r={1} h={w - 3} axis="x" m={m} seg={10} />
        ))}
      </group>
    );
  }
  const fins = Math.max(3, Math.round(w / 6));
  return (
    <group>
      {Array.from({ length: fins }, (_, i) => (
        <Bx key={i} x={-w / 2 + (w / fins) * (i + 0.5)} w={w / fins - 1} h={h} d={d} m={m} />
      ))}
    </group>
  );
}

/* ------------------------------- Bedroom ------------------------------- */

function Bed({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const frame = mat3(it.materials.body);
  const duvet = mat3(it.materials.fabric);
  const legH = 8;
  const railH = 22;
  const head = 6;
  const matY = legH + railH;
  const matD = d - head - 4;
  const duvetD = matD * 0.72;
  const pillows = w > 120 ? 2 : 1;
  const pw = (w - 20) / pillows;
  return (
    <group>
      <Legs w={w} d={d} h={legH} m={frame} r={2.5} inset={5} round={false} />
      <Bx w={w} h={railH} d={d - head} y={legH} z={head / 2} m={frame} />
      <Bx w={w} h={h - legH} d={head} y={legH} z={-d / 2 + head / 2} m={frame} />
      <Bx w={w - 6} h={22} d={matD} y={matY} z={head / 2 - 2} m={SHEET()} />
      {Array.from({ length: pillows }, (_, i) => (
        <Bx key={i} x={-w / 2 + 10 + pw * (i + 0.5)} w={pw - 6} h={12} d={42} y={matY + 22} z={-d / 2 + head + 26} m={SHEET()} />
      ))}
      {/* Duvet over the lower part of the mattress, hanging down the sides. */}
      <Bx w={w - 2} h={7} d={duvetD} y={matY + 20} z={d / 2 - 4 - duvetD / 2} m={duvet} />
      {[-1, 1].map((s) => (
        <Bx key={s} x={s * (w / 2 - 1)} w={2.5} h={24} d={duvetD} y={matY + 3} z={d / 2 - 4 - duvetD / 2} m={duvet} />
      ))}
      <Bx w={w - 2} h={24} d={2.5} y={matY + 3} z={d / 2 - 4} m={duvet} />
    </group>
  );
}

function Crib({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const m = mat3(it.materials.body);
  const bars: React.ReactNode[] = [];
  const along = (len: number, axis: 'x' | 'z', off: number) => {
    const n = Math.floor(len / 8);
    for (let i = 1; i < n; i++) {
      const t = -len / 2 + (len / n) * i;
      bars.push(<Bx key={`${axis}${off}${i}`} x={axis === 'x' ? t : off} z={axis === 'z' ? t : off} y={30} w={2} h={h - 34} d={2} m={m} />);
    }
  };
  along(w, 'x', d / 2 - 2);
  along(w, 'x', -d / 2 + 2);
  along(d, 'z', w / 2 - 2);
  along(d, 'z', -w / 2 + 2);
  return (
    <group>
      <Legs w={w} d={d} h={h} m={m} r={2.5} inset={2.5} round={false} />
      <Bx w={w - 4} h={3} d={d - 4} y={27} m={m} />
      <Bx w={w - 6} h={10} d={d - 6} y={30} m={SHEET()} />
      {[-1, 1].map((s) => (
        <Bx key={s} z={s * (d / 2 - 2)} y={h - 4} w={w} h={4} d={3} m={m} />
      ))}
      {[-1, 1].map((s) => (
        <Bx key={`x${s}`} x={s * (w / 2 - 2)} y={h - 4} w={3} h={4} d={d} m={m} />
      ))}
      {bars}
    </group>
  );
}

function Nightstand({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const legH = 12;
  return (
    <group>
      <Legs w={w} d={d} h={legH} m={mat3(it.materials.body)} r={1.3} inset={4} />
      <Bx w={w} h={h - legH} d={d - FRONT_T} y={legH} z={-FRONT_T / 2} m={mat3(it.materials.body)} />
      <Front x={0} y={h - 16} w={w} h={16} z={d / 2 - FRONT_T} m={mat3(it.materials.front)} handle="h" handlePos="tc" handleLen={12} />
      <Bx w={w - 4} h={h - legH - 20} d={1} y={legH + 2} z={d / 2 - FRONT_T - 4} m={color3('#2a2a2a', 0.9)} shadow={false} />
    </group>
  );
}

function Wardrobe({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const plinth = 8;
  const n = Math.max(1, Math.round(w / 50));
  const fw = w / n;
  return (
    <group>
      <Bx w={w - 1} h={plinth} d={d - 6} z={-3} m={color3('#2a2b2e', 0.7)} />
      <Bx w={w} h={h - plinth} d={d - FRONT_T} y={plinth} z={-FRONT_T / 2} m={mat3(it.materials.body)} />
      {Array.from({ length: n }, (_, i) => (
        <Front
          key={i}
          x={-w / 2 + fw * (i + 0.5)}
          y={plinth}
          w={fw}
          h={h - plinth}
          z={d / 2 - FRONT_T}
          m={mat3(it.materials.front)}
          handlePos={i % 2 === 0 ? 'tr' : 'tl'}
          handleLen={40}
          handleY={(h - plinth) * 0.48}
        />
      ))}
    </group>
  );
}

function Dresser({ it, rows = 3, casters }: { it: Item; rows?: number; casters?: boolean }) {
  const { width: w, depth: d, height: h } = it;
  const legH = casters ? 6 : 10;
  const cols = w > 100 ? 2 : 1;
  const rh = (h - legH) / rows;
  const cw = w / cols;
  return (
    <group>
      {casters ? (
        [-1, 1].map((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} x={sx * (w / 2 - 5)} z={sz * (d / 2 - 5)} y={3} r={2.5} h={2} axis="x" m={M.rubber} seg={12} />))
      ) : (
        <Legs w={w} d={d} h={legH} m={mat3(it.materials.body)} r={1.8} inset={5} />
      )}
      <Bx w={w} h={h - legH} d={d - FRONT_T} y={legH} z={-FRONT_T / 2} m={mat3(it.materials.body)} />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <Front key={`${r}${c}`} x={-w / 2 + cw * (c + 0.5)} y={legH + rh * r} w={cw} h={rh} z={d / 2 - FRONT_T} m={mat3(it.materials.front)} handle="h" handlePos="tc" handleLen={Math.min(20, cw * 0.4)} />
        )),
      )}
    </group>
  );
}

/* ------------------------------- Bathroom ------------------------------ */

function Tap({ y, z, m, x = 0, high }: { y: number; z: number; m: Mat; x?: number; high?: boolean }) {
  const hh = high ? 22 : 10;
  return (
    <group position={[x, y, z]}>
      <Cyl r={2} h={hh} y={hh / 2} m={m} seg={14} />
      <Cyl r={1.1} h={12} y={hh - 1} z={5} axis="z" m={m} seg={10} />
      <Bx w={1.2} h={1.2} d={7} y={hh + 1} z={-1} m={m} />
    </group>
  );
}

function Toilet({ it, bidet }: { it: Item; bidet?: boolean }) {
  const { width: w, depth: d, height: h } = it;
  const c = mat3(it.materials.finish);
  const seatH = bidet ? h : 40;
  const bowlD = bidet ? d - 6 : d - 18;
  const bz = d / 2 - bowlD / 2;
  return (
    <group>
      <group position={[0, 0, bz]} scale={[w / 36, 1, bowlD / 36]}>
        <Cyl r={11} r2={18} h={seatH - 4} y={(seatH - 4) / 2} m={c} seg={32} />
        <Cyl r={18} h={4} y={seatH - 2} m={bidet ? c : color3('#fafafa', 0.35)} seg={32} />
        <Cyl r={13} h={0.4} y={seatH + 0.1} m={CERAMIC_DARK()} seg={32} />
      </group>
      {!bidet && (
        <>
          <Bx w={w} h={h - seatH} d={18} y={seatH - 2} z={-d / 2 + 9} m={c} />
          <Bx w={w + 1} h={2} d={19} y={h - 2} z={-d / 2 + 9.5} m={c} />
          <Cyl r={2.4} h={0.6} y={h + 0.2} z={-d / 2 + 9} m={M.handle} seg={16} />
          <Bx w={w * 0.9} h={seatH - 4} d={8} y={0} z={-d / 2 + 14} m={c} />
        </>
      )}
      {bidet && <Tap y={h} z={-d / 2 + 5} m={M.handle} />}
    </group>
  );
}

function Vanity({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const bowlH = 12;
  const topY = h - bowlH - 3;
  const carcY = 25;
  const basins = w >= 110 ? 2 : 1;
  const ceramic = color3('#f6f6f4', 0.2);
  return (
    <group>
      <Bx w={w} h={topY - carcY} d={d - FRONT_T} y={carcY} z={-FRONT_T / 2} m={mat3(it.materials.body)} />
      {[0, 1].map((r) => (
        <Front key={r} x={0} y={carcY + ((topY - carcY) / 2) * r} w={w} h={(topY - carcY) / 2} z={d / 2 - FRONT_T} m={mat3(it.materials.front)} handle="h" handlePos="tc" handleLen={Math.min(30, w * 0.3)} />
      ))}
      <Bx w={w} h={3} d={d} y={topY} m={mat3(it.materials.top)} grain="h" />
      {Array.from({ length: basins }, (_, i) => {
        const bx = basins === 1 ? 0 : (i === 0 ? -1 : 1) * w * 0.25;
        return (
          <group key={i}>
            <group position={[bx, topY + 3, 2]} scale={[1, 1, 0.78]}>
              <Cyl r={15} r2={19} h={bowlH} y={bowlH / 2} m={ceramic} seg={32} />
              <Cyl r={16.5} h={0.4} y={bowlH + 0.05} m={CERAMIC_DARK()} seg={32} />
            </group>
            <Tap x={bx} y={topY + 3} z={-d / 2 + 6} m={M.handle} high />
          </group>
        );
      })}
    </group>
  );
}

function Washbasin({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const c = mat3(it.materials.finish);
  return (
    <group>
      <Bx w={w} h={h} d={d} m={c} />
      <Bx w={w - 8} h={0.4} d={d - 14} y={h - 0.2} z={3} m={CERAMIC_DARK()} />
      <Tap y={h} z={-d / 2 + 5} m={M.handle} />
    </group>
  );
}

function Shower({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const tray = mat3(it.materials.finish);
  const glassH = Math.min(h, 195);
  return (
    <group>
      <Bx w={w} h={4} d={d} m={tray} />
      <Cyl r={4} h={0.4} y={4.1} m={M.handle} seg={20} />
      {/* Glass on the front and on the right side; the other two sides go against walls. */}
      <Bx w={w} h={glassH} d={0.8} y={4} z={d / 2 - 0.4} m={M.glass} shadow={false} />
      <Bx w={0.8} h={glassH} d={d} y={4} x={w / 2 - 0.4} m={M.glass} shadow={false} />
      <Bx w={w} h={1.5} d={1.5} y={4 + glassH} z={d / 2 - 0.4} m={M.handle} />
      <Bx w={1.5} h={1.5} d={d} y={4 + glassH} x={w / 2 - 0.4} m={M.handle} />
      {/* Shower column in the back-left corner. */}
      <Cyl x={-w / 2 + 8} z={-d / 2 + 4} r={1.2} h={h - 10} y={(h - 10) / 2 + 4} m={M.handle} seg={12} />
      <Cyl x={-w / 2 + 8} z={-d / 2 + 18} r={11} h={1.2} y={h - 6} m={M.handle} seg={28} />
      <Tube from={[-w / 2 + 8, h - 6, -d / 2 + 4]} to={[-w / 2 + 8, h - 6, -d / 2 + 18]} r={1} m={M.handle} />
      <Bx x={-w / 2 + 8} z={-d / 2 + 3} y={100} w={6} h={10} d={4} m={M.handle} />
    </group>
  );
}

function Bathtub({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const c = mat3(it.materials.finish);
  const t = 7;
  const inner = 38;
  return (
    <group>
      <Bx w={w} h={h - inner} d={d} m={c} />
      <Bx w={w} h={inner} d={t} y={h - inner} z={d / 2 - t / 2} m={c} />
      <Bx w={w} h={inner} d={t} y={h - inner} z={-d / 2 + t / 2} m={c} />
      <Bx w={t} h={inner} d={d} y={h - inner} x={w / 2 - t / 2} m={c} />
      <Bx w={t} h={inner} d={d} y={h - inner} x={-w / 2 + t / 2} m={c} />
      <Cyl r={2.5} h={0.4} y={h - inner + 0.1} x={-w / 2 + 18} m={M.handle} seg={16} />
      <Tap x={-w / 2 + 3} y={h} z={0} m={M.handle} />
    </group>
  );
}

function Mirror({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  return (
    <group>
      <Bx w={w} h={h} d={d - 0.5} z={-0.25} m={mat3(it.materials.body)} />
      <Bx w={w - 4} h={h - 4} d={0.4} y={2} z={d / 2 - 0.2} m={color3('#dfe6ea', 0.02, 1, { envMapIntensity: 1.6 })} shadow={false} />
    </group>
  );
}

function BathCabinet({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  return (
    <group>
      <Bx w={w} h={h} d={d - FRONT_T} z={-FRONT_T / 2} m={mat3(it.materials.body)} />
      <Front x={0} y={0} w={w} h={h * 0.62} z={d / 2 - FRONT_T} m={mat3(it.materials.front)} handlePos="tr" />
      <Front x={0} y={h * 0.62} w={w} h={h * 0.38} z={d / 2 - FRONT_T} m={mat3(it.materials.front)} handlePos="br" />
    </group>
  );
}

/* -------------------------------- Office ------------------------------- */

function Desk({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  return (
    <group>
      <Bx w={w} h={3} d={d} y={h - 3} m={mat3(it.materials.top)} grain="h" />
      <Legs w={w} d={d} h={h - 3} m={mat3(it.materials.body)} r={2} inset={4} round={false} />
      <Bx w={w - 10} h={20} d={1.5} y={h - 25} z={-d / 2 + 6} m={mat3(it.materials.body)} />
    </group>
  );
}

function OfficeChair({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const f = mat3(it.materials.fabric);
  const b = mat3(it.materials.body);
  const seatY = 46;
  const r = Math.min(w, d) / 2 - 3;
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i}>
            <Tube from={[0, 8, 0]} to={[Math.cos(a) * r, 6, Math.sin(a) * r]} r={1.6} m={b} seg={8} />
            <Cyl x={Math.cos(a) * r} z={Math.sin(a) * r} y={3} r={2.6} h={2.4} axis="x" m={M.rubber} seg={12} />
          </group>
        );
      })}
      <Cyl r={2.6} h={seatY - 12} y={8 + (seatY - 12) / 2} m={M.handle} seg={12} />
      <Bx w={w - 12} h={8} d={d - 14} y={seatY - 4} z={2} m={f} />
      <Tube from={[0, seatY, -d / 2 + 10]} to={[0, seatY + 18, -d / 2 + 6]} r={1.8} m={b} />
      <Bx w={w - 16} h={h - seatY - 16} d={6} y={seatY + 14} z={-d / 2 + 6} m={f} />
      {[-1, 1].map((s) => (
        <Bx key={s} x={s * (w / 2 - 7)} y={seatY + 16} w={5} h={2.5} d={24} z={4} m={b} />
      ))}
      {[-1, 1].map((s) => (
        <Bx key={`p${s}`} x={s * (w / 2 - 7)} y={seatY} w={2.5} h={16} d={2.5} z={4} m={b} />
      ))}
    </group>
  );
}

function Monitor({ it }: { it: Item }) {
  const { width: w, height: h } = it;
  const st = 12;
  return (
    <group>
      <Bx w={22} h={1} d={16} m={color3('#202124', 0.4, 0.5)} />
      <Bx w={4} h={st + 4} d={2.5} z={-3} m={color3('#202124', 0.4, 0.5)} />
      <Bx w={w} h={h - st} d={2} y={st} m={color3('#151618', 0.4, 0.2)} />
      <Bx w={w - 1.4} h={h - st - 2.4} d={0.3} y={st + 1.6} z={1.1} m={M.display} />
    </group>
  );
}

/* --------------------------- Storage & garage -------------------------- */

const BOX_COLORS = ['#b48a5a', '#c9a473', '#9c7448', '#e3dccf', '#3d5a6c'];

function Shelving({ it, wood }: { it: Item; wood?: boolean }) {
  const { width: w, depth: d, height: h } = it;
  const m = mat3(wood ? it.materials.body : it.materials.finish);
  const levels = Math.max(3, Math.round(h / 38));
  const gap = (h - 6) / (levels - 1);
  return (
    <group>
      {wood
        ? [-1, 1].map((s) => <Bx key={s} x={s * (w / 2 - 1)} w={2} h={h} d={d} m={m} />)
        : [-1, 1].map((sx) => [-1, 1].map((sz) => <Bx key={`${sx}${sz}`} x={sx * (w / 2 - 1.5)} z={sz * (d / 2 - 1.5)} w={3} h={h} d={3} m={m} />))}
      {Array.from({ length: levels }, (_, i) => (
        <Bx key={i} y={3 + i * gap} w={w - (wood ? 4 : 0)} h={wood ? 2 : 1.5} d={d} m={m} grain="h" />
      ))}
      {Array.from({ length: levels - 1 }, (_, i) => {
        const y = 3 + i * gap + 2;
        const items: React.ReactNode[] = [];
        let x = -w / 2 + 6;
        let k = i * 7 + Math.round(w);
        while (x < w / 2 - 14) {
          k = (k * 9301 + 49297) % 233280;
          const r = k / 233280;
          if (wood && r < 0.55) {
            // Jars.
            const jr = 4 + r * 3;
            items.push(<Cyl key={x} x={x + jr} y={y + 8 + r * 4} r={jr} h={16 + r * 8} z={0} m={color3(r < 0.3 ? '#c8a26b' : '#a85c3a', 0.3, 0, { transparent: true, opacity: 0.85 })} seg={16} />);
            x += jr * 2 + 3;
          } else {
            const bw = 14 + r * 14;
            const bh = Math.min(gap - 6, 12 + r * 18);
            items.push(<Bx key={x} x={x + bw / 2} y={y} w={bw} h={bh} d={d * 0.75} m={color3(BOX_COLORS[Math.floor(r * BOX_COLORS.length)], 0.85)} />);
            x += bw + 4;
          }
        }
        return <group key={`c${i}`}>{items}</group>;
      })}
    </group>
  );
}

function UtilitySink({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const c = mat3(it.materials.finish);
  const basin = 30;
  return (
    <group>
      <Legs w={w} d={d} h={h - basin} m={M.handle} r={1.5} inset={5} />
      <Bx w={w} h={basin} d={d} y={h - basin} m={c} />
      <Bx w={w - 6} h={0.4} d={d - 10} y={h - 0.2} z={2} m={CERAMIC_DARK()} />
      <Tap y={h} z={-d / 2 + 4} m={M.handle} high />
    </group>
  );
}

function Car({ it }: { it: Item }) {
  const { width: L, depth: W, height: H } = it;
  const paint = mat3(it.materials.finish);
  const wr = Math.min(34, H * 0.24);
  const bodyY = wr * 0.7;
  const bodyH = H * 0.38;
  const cabinL = L * 0.48;
  const cabinH = H - bodyY - bodyH - 4;
  return (
    <group>
      <Bx w={L} h={bodyH} d={W} y={bodyY} m={paint} />
      <Bx w={L * 0.96} h={4} d={W * 0.96} y={bodyY - 4} m={color3('#1c1d1f', 0.7)} />
      {/* Cabin: glass with a roof and pillars. */}
      <Bx w={cabinL} h={cabinH} d={W - 14} x={-L * 0.06} y={bodyY + bodyH} m={M.darkGlass} />
      <Bx w={cabinL * 0.86} h={4} d={W - 16} x={-L * 0.06} y={bodyY + bodyH + cabinH} m={paint} />
      {[-1, 1].map((s) => (
        <Bx key={s} x={-L * 0.06 + s * (cabinL / 2 - 3)} w={6} h={cabinH} d={W - 13} y={bodyY + bodyH} m={paint} />
      ))}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`}>
            <Cyl x={sx * L * 0.32} z={sz * (W / 2 - 10)} y={wr} r={wr} h={20} axis="z" m={M.rubber} seg={28} />
            <Cyl x={sx * L * 0.32} z={sz * (W / 2 - 10 + 10.2)} y={wr} r={wr * 0.55} h={0.6} axis="z" m={M.handle} seg={20} />
          </group>
        )),
      )}
      {[-1, 1].map((sz) => (
        <group key={`l${sz}`}>
          <Bx x={L / 2 - 1} z={sz * (W / 2 - 22)} y={bodyY + bodyH - 16} w={2} h={8} d={30} m={color3('#ffffff', 0.2, 0, { emissive: '#fffbe8', emissiveIntensity: 0.6 })} />
          <Bx x={-L / 2 + 1} z={sz * (W / 2 - 22)} y={bodyY + bodyH - 16} w={2} h={8} d={30} m={color3('#8a1010', 0.3, 0, { emissive: '#ff2020', emissiveIntensity: 0.5 })} />
        </group>
      ))}
    </group>
  );
}

function Bike({ it }: { it: Item }) {
  const { width: L, height: H } = it;
  const m = mat3(it.materials.finish);
  const wr = Math.min(34, H * 0.34);
  const rear: P3 = [-L * 0.3, wr, 0];
  const front: P3 = [L * 0.3, wr, 0];
  const bb: P3 = [-2, wr - 4, 0];
  const seat: P3 = [-L * 0.1, H * 0.84, 0];
  const head: P3 = [L * 0.22, H * 0.86, 0];
  return (
    <group>
      {[rear, front].map((c, i) => (
        <group key={i}>
          <mesh position={c} castShadow>
            <torusGeometry args={[wr - 1.5, 1.6, 10, 40]} />
            <primitive object={M.rubber} attach="material" />
          </mesh>
          <Cyl x={c[0]} y={c[1]} r={2} h={4} axis="z" m={M.handle} seg={12} />
        </group>
      ))}
      <Tube from={rear} to={bb} r={1.2} m={m} />
      <Tube from={rear} to={seat} r={1.1} m={m} />
      <Tube from={bb} to={seat} r={1.6} m={m} />
      <Tube from={seat} to={head} r={1.6} m={m} />
      <Tube from={bb} to={head} r={1.9} m={m} />
      <Tube from={head} to={front} r={1.3} m={m} />
      <Tube from={[head[0] - 3, head[1] + 8, -22]} to={[head[0] - 3, head[1] + 8, 22]} r={1.2} m={M.rubber} />
      <Tube from={head} to={[head[0] - 3, head[1] + 8, 0]} r={1.4} m={m} />
      <Bx x={seat[0] - 3} y={seat[1] + 2} w={24} h={4} d={12} m={M.rubber} />
    </group>
  );
}

function Workbench({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const frame = mat3(it.materials.body);
  const top = 90;
  return (
    <group>
      <Legs w={w} d={d} h={top - 5} m={frame} r={2.5} inset={4} round={false} />
      <Bx w={w} h={5} d={d} y={top - 5} m={mat3(it.materials.top)} grain="h" />
      <Bx w={w - 8} h={2} d={d - 8} y={18} m={frame} />
      {h > top + 20 && (
        <>
          <Bx w={w} h={h - top - 5} d={1.6} y={top + 5} z={-d / 2 + 0.8} m={color3('#c8b496', 0.9)} />
          {[
            [-0.35, 0.3, 6, 22],
            [-0.2, 0.45, 3, 26],
            [-0.05, 0.25, 14, 4],
            [0.15, 0.5, 4, 18],
            [0.3, 0.3, 10, 10],
            [0.38, 0.6, 2, 24],
          ].map(([fx, fy, tw, th], i) => (
            <Bx key={i} x={fx * w} y={top + 5 + fy * (h - top - 5)} w={tw} h={th} d={3} z={-d / 2 + 3} m={color3(i % 2 ? '#c0392b' : '#2c3e50', 0.5, 0.3)} />
          ))}
        </>
      )}
    </group>
  );
}

function GarageCabinet({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const m = mat3(it.materials.finish);
  return (
    <group>
      <Bx w={w} h={h} d={d - 1.5} z={-0.75} m={m} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Bx x={(s * w) / 4} w={w / 2 - 0.6} h={h - 4} d={1} y={2} z={d / 2 - 0.5} m={m} />
          <Bx x={s * 3} w={1.4} h={24} d={2} y={h * 0.5} z={d / 2 + 0.5} m={M.handle} />
          {Array.from({ length: 4 }, (_, i) => (
            <Bx key={i} x={(s * w) / 4} y={h - 20 - i * 3} w={w * 0.3} h={1} d={0.3} z={d / 2 + 0.1} m={color3('#555', 0.6)} shadow={false} />
          ))}
        </group>
      ))}
    </group>
  );
}

/* --------------------------------- Gym --------------------------------- */

function Treadmill({ it }: { it: Item }) {
  const { width: L, depth: W, height: H } = it;
  const m = mat3(it.materials.finish);
  const deckW = W * 0.72;
  return (
    <group>
      <Bx w={L} h={12} d={deckW} y={3} m={m} />
      <Bx w={L - 30} h={0.6} d={deckW - 14} y={15} x={-6} m={M.rubber} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Tube from={[L / 2 - 22, 12, (s * deckW) / 2]} to={[L / 2 - 12, H - 18, (s * W) / 2.4]} r={2.5} m={m} />
          <Tube from={[L / 2 - 14, H - 30, (s * W) / 2.4]} to={[L / 2 - 50, H - 34, (s * W) / 2.4]} r={1.8} m={M.rubber} />
        </group>
      ))}
      <Bx x={L / 2 - 12} y={H - 18} w={16} h={12} d={W * 0.85} m={m} />
      <Bx x={L / 2 - 20} y={H - 12} w={1} h={8} d={W * 0.4} m={M.display} />
    </group>
  );
}

function ExerciseBike({ it }: { it: Item }) {
  const { width: L, depth: W, height: H } = it;
  const m = mat3(it.materials.finish);
  return (
    <group>
      {[-1, 1].map((s) => (
        <Bx key={s} x={(s * L) / 2 - s * 6} w={8} h={5} d={W} m={m} />
      ))}
      <Tube from={[-L / 2 + 6, 5, 0]} to={[L / 2 - 6, 5, 0]} r={2.5} m={m} />
      <Tube from={[-L * 0.15, 5, 0]} to={[-L * 0.2, 75, 0]} r={2.8} m={m} />
      <Tube from={[L * 0.2, 5, 0]} to={[L * 0.25, H - 10, 0]} r={2.8} m={m} />
      <Cyl x={L * 0.2} y={32} r={22} h={5} axis="z" m={color3('#2a2b2e', 0.4, 0.6)} seg={32} />
      <Bx x={-L * 0.2} y={75} w={26} h={6} d={20} m={M.rubber} />
      <Tube from={[L * 0.25, H - 10, -22]} to={[L * 0.25, H - 10, 22]} r={1.6} m={M.rubber} />
      <Bx x={L * 0.25} y={H - 6} w={10} h={6} d={14} m={m} />
    </group>
  );
}

function WeightBench({ it }: { it: Item }) {
  const { width: L, depth: W, height: H } = it;
  const pad = mat3(it.materials.fabric);
  const frame = mat3(it.materials.body);
  return (
    <group>
      <Bx w={L} h={8} d={30} y={H - 8} m={pad} />
      <Tube from={[-L / 2 + 10, 4, 0]} to={[L / 2 - 10, 4, 0]} r={3} m={frame} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Bx x={s * (L / 2 - 12)} y={0} w={6} h={4} d={W} m={frame} />
          <Bx x={s * (L / 2 - 12)} y={4} w={6} h={H - 12} d={6} m={frame} />
        </group>
      ))}
    </group>
  );
}

function Dumbbell({ x, y, z, s, m }: { x: number; y: number; z: number; s: number; m: Mat }) {
  return (
    <group position={[x, y, z]}>
      <Cyl r={1.4} h={12 + s * 2} axis="z" m={M.handle} seg={10} />
      {[-1, 1].map((k) => (
        <Cyl key={k} z={k * (5 + s)} r={4 + s} h={3 + s} axis="z" m={m} seg={18} />
      ))}
    </group>
  );
}

function DumbbellRack({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const m = mat3(it.materials.finish);
  const n = Math.max(3, Math.floor(w / 22));
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Bx x={s * (w / 2 - 3)} w={6} h={4} d={d} m={m} />
          <Tube from={[s * (w / 2 - 3), 4, d / 2 - 6]} to={[s * (w / 2 - 3), h - 4, -d / 2 + 14]} r={2.5} m={m} />
        </group>
      ))}
      {[0, 1].map((tier) => {
        const y = tier ? h - 14 : h * 0.45;
        const z = tier ? -d / 2 + 14 : d / 2 - 14;
        return (
          <group key={tier}>
            <Bx y={y - 3} z={z} w={w} h={3} d={14} m={m} />
            {Array.from({ length: n }, (_, i) => (
              <Dumbbell key={i} x={-w / 2 + 12 + i * ((w - 24) / (n - 1))} y={y + 6} z={z} s={(i + tier * n) / (n * 2)} m={color3('#26272a', 0.5, 0.6)} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

function PowerRack({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const m = mat3(it.materials.finish);
  const p = 7;
  return (
    <group>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Bx key={`${sx}${sz}`} x={sx * (w / 2 - p / 2)} z={sz * (d / 2 - p / 2)} w={p} h={h} d={p} m={m} />),
      )}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Bx x={sx * (w / 2 - p / 2)} y={h - p} w={p} h={p} d={d} m={m} />
          <Bx x={sx * (w / 2 - p / 2)} w={p} h={4} d={d} m={m} />
        </group>
      ))}
      {[-1, 1].map((sz) => (
        <Bx key={sz} z={sz * (d / 2 - p / 2)} y={h - p} w={w} h={p} d={p} m={m} />
      ))}
      {/* Barbell resting on the hooks. */}
      <Cyl y={140} z={d / 2 - p} r={1.5} h={w + 60} axis="x" m={M.handle} seg={12} />
      {[-1, 1].map((s) => (
        <Cyl key={s} x={s * (w / 2 + 18)} y={140} z={d / 2 - p} r={22} h={4} axis="x" m={color3('#1e1f22', 0.5, 0.3)} seg={32} />
      ))}
    </group>
  );
}

/* -------------------------------- Stairs ------------------------------- */

const RISER = () => color3('#ece9e3', 0.85);

function Step({ x, z, w, d, top, tread }: { x: number; z: number; w: number; d: number; top: number; tread: Mat }) {
  return (
    <group>
      <Bx x={x} z={z} w={w} h={Math.max(0.1, top - 4)} d={d} m={RISER()} />
      <Bx x={x} z={z} y={top - 4} w={w} h={4} d={d} m={tread} grain="h" />
    </group>
  );
}

function StraightStairs({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const tread = mat3(it.materials.body);
  const rail = mat3(it.materials.finish);
  const n = Math.max(3, Math.round(h / 18));
  const rh = h / n;
  const td = d / n;
  const rx = w / 2 - 4;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <Step key={i} x={0} z={d / 2 - td * (i + 0.5)} w={w} d={td + 0.01} top={rh * (i + 1)} tread={tread} />
      ))}
      {Array.from({ length: Math.ceil(n / 3) + 1 }, (_, k) => {
        const i = Math.min(n - 1, k * 3);
        return <Bx key={k} x={rx} z={d / 2 - td * (i + 0.5)} y={rh * (i + 1)} w={2.5} h={90} d={2.5} m={rail} />;
      })}
      <Tube from={[rx, rh + 90, d / 2 - td / 2]} to={[rx, h + 90, -d / 2 + td / 2]} r={2} m={rail} />
    </group>
  );
}

function LStairs({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const tread = mat3(it.materials.body);
  const rail = mat3(it.materials.finish);
  const sw = Math.min(100, w * 0.45, d * 0.45);
  const n = Math.max(5, Math.round(h / 18));
  const rh = h / n;
  const n1 = Math.floor((n - 1) / 2);
  const n2 = n - n1 - 1;
  const td1 = (d - sw) / n1;
  const td2 = (w - sw) / n2;
  const x1 = w / 2 - sw / 2;
  const z2 = -d / 2 + sw / 2;
  return (
    <group>
      {Array.from({ length: n1 }, (_, i) => (
        <Step key={`a${i}`} x={x1} z={d / 2 - td1 * (i + 0.5)} w={sw} d={td1 + 0.01} top={rh * (i + 1)} tread={tread} />
      ))}
      <Step x={x1} z={z2} w={sw} d={sw} top={rh * (n1 + 1)} tread={tread} />
      {Array.from({ length: n2 }, (_, i) => (
        <Step key={`b${i}`} x={w / 2 - sw - td2 * (i + 0.5)} z={z2} w={td2 + 0.01} d={sw} top={rh * (n1 + 2 + i)} tread={tread} />
      ))}
      <Tube from={[w / 2 - sw + 3, rh + 90, d / 2 - td1 / 2]} to={[w / 2 - sw + 3, rh * (n1 + 1) + 90, -d / 2 + sw - 3]} r={2} m={rail} />
      <Tube from={[w / 2 - sw + 3, rh * (n1 + 1) + 90, -d / 2 + sw - 3]} to={[-w / 2 + td2 / 2, h + 90, -d / 2 + sw - 3]} r={2} m={rail} />
      {[
        [w / 2 - sw + 3, d / 2 - td1 / 2, rh],
        [w / 2 - sw + 3, -d / 2 + sw - 3, rh * (n1 + 1)],
        [-w / 2 + td2 / 2, -d / 2 + sw - 3, h],
      ].map(([px, pz, py], i) => (
        <Bx key={i} x={px} z={pz} y={py} w={3} h={90} d={3} m={rail} />
      ))}
    </group>
  );
}

function SpiralStairs({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const tread = mat3(it.materials.body);
  const rail = mat3(it.materials.finish);
  const R = Math.min(w, d) / 2;
  const n = Math.max(8, Math.round(h / 19));
  const rh = h / n;
  const step = (Math.PI * 2) / 13;
  const tw = R * step * 1.15;
  const posts = Array.from({ length: n }, (_, i) => {
    const a = i * step;
    return [Math.cos(a) * (R - 3), rh * (i + 1), -Math.sin(a) * (R - 3)] as P3;
  });
  return (
    <group>
      <Cyl r={5} h={h + 90} y={(h + 90) / 2} m={rail} seg={20} />
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[0, i * step, 0]}>
          <Bx x={(R + 4) / 2} y={rh * (i + 1) - 4} w={R - 4} h={4} d={tw} m={tread} />
        </group>
      ))}
      {posts.map((p, i) => (
        <Bx key={i} x={p[0]} z={p[2]} y={p[1]} w={2} h={90} d={2} m={rail} />
      ))}
      {posts.slice(1).map((p, i) => (
        <Tube key={i} from={[posts[i][0], posts[i][1] + 90, posts[i][2]]} to={[p[0], p[1] + 90, p[2]]} r={1.6} m={rail} seg={8} />
      ))}
    </group>
  );
}

/* --------------------------------------------------------------------- */

const HOUSE_MODELS = new Set<ModelKind>([
  'sofa',
  'sofa-corner',
  'armchair',
  'coffee-table',
  'side-table',
  'tv-unit',
  'tv',
  'bookcase',
  'sideboard',
  'fireplace',
  'rug',
  'floor-lamp',
  'plant',
  'radiator',
  'bed',
  'crib',
  'nightstand',
  'wardrobe',
  'dresser',
  'toilet',
  'bidet',
  'vanity',
  'washbasin',
  'shower',
  'bathtub',
  'towel-rail',
  'mirror',
  'bath-cabinet',
  'desk',
  'office-chair',
  'filing-cabinet',
  'monitor',
  'shelving',
  'pantry-shelf',
  'utility-sink',
  'car',
  'bike',
  'workbench',
  'garage-cabinet',
  'treadmill',
  'exercise-bike',
  'weight-bench',
  'dumbbell-rack',
  'power-rack',
  'yoga-mat',
  'stairs-straight',
  'stairs-l',
  'stairs-spiral',
]);

export const isHouseModel = (m: ModelKind) => HOUSE_MODELS.has(m);

export function HouseModel({ it }: { it: Item }) {
  switch (getEntry(it.type).model) {
    case 'sofa':
      return <Sofa it={it} />;
    case 'sofa-corner':
      return <Sofa it={it} corner />;
    case 'armchair':
      return <Sofa it={it} armW={15} />;
    case 'coffee-table':
      return <CoffeeTable it={it} />;
    case 'side-table':
      return <SideTable it={it} />;
    case 'tv-unit':
      return <TvUnit it={it} />;
    case 'tv':
      return <Tv it={it} />;
    case 'bookcase':
      return <Bookcase it={it} />;
    case 'sideboard':
      return <Sideboard it={it} />;
    case 'fireplace':
      return <Fireplace it={it} />;
    case 'rug':
    case 'yoga-mat':
      return <Bx w={it.width} h={Math.max(0.6, it.height)} d={it.depth} m={mat3(it.materials.fabric)} shadow={false} />;
    case 'floor-lamp':
      return <FloorLamp it={it} />;
    case 'plant':
      return <Plant it={it} />;
    case 'radiator':
      return <Radiator it={it} />;
    case 'towel-rail':
      return <Radiator it={it} towel />;
    case 'bed':
      return <Bed it={it} />;
    case 'crib':
      return <Crib it={it} />;
    case 'nightstand':
      return <Nightstand it={it} />;
    case 'wardrobe':
      return <Wardrobe it={it} />;
    case 'dresser':
      return <Dresser it={it} />;
    case 'filing-cabinet':
      return <Dresser it={it} rows={3} casters />;
    case 'toilet':
      return <Toilet it={it} />;
    case 'bidet':
      return <Toilet it={it} bidet />;
    case 'vanity':
      return <Vanity it={it} />;
    case 'washbasin':
      return <Washbasin it={it} />;
    case 'shower':
      return <Shower it={it} />;
    case 'bathtub':
      return <Bathtub it={it} />;
    case 'mirror':
      return <Mirror it={it} />;
    case 'bath-cabinet':
      return <BathCabinet it={it} />;
    case 'desk':
      return <Desk it={it} />;
    case 'office-chair':
      return <OfficeChair it={it} />;
    case 'monitor':
      return <Monitor it={it} />;
    case 'shelving':
      return <Shelving it={it} />;
    case 'pantry-shelf':
      return <Shelving it={it} wood />;
    case 'utility-sink':
      return <UtilitySink it={it} />;
    case 'car':
      return <Car it={it} />;
    case 'bike':
      return <Bike it={it} />;
    case 'workbench':
      return <Workbench it={it} />;
    case 'garage-cabinet':
      return <GarageCabinet it={it} />;
    case 'treadmill':
      return <Treadmill it={it} />;
    case 'exercise-bike':
      return <ExerciseBike it={it} />;
    case 'weight-bench':
      return <WeightBench it={it} />;
    case 'dumbbell-rack':
      return <DumbbellRack it={it} />;
    case 'power-rack':
      return <PowerRack it={it} />;
    case 'stairs-straight':
      return <StraightStairs it={it} />;
    case 'stairs-l':
      return <LStairs it={it} />;
    case 'stairs-spiral':
      return <SpiralStairs it={it} />;
    default:
      return <Bx w={it.width} h={it.height} d={it.depth} m={mat3(it.materials.body)} />;
  }
}
