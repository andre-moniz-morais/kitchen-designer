import { useMemo } from 'react';
import * as THREE from 'three';
import { getEntry, itemOptions } from '../catalog';
import type { Item } from '../types';
import { boxGeometry, color3, M, mat3 } from './materials3d';

type Mat = THREE.Material;

interface BxProps {
  /** Centre x/z, bottom y (cm, item-local). */
  x?: number;
  y?: number;
  z?: number;
  w: number;
  h: number;
  d: number;
  m: Mat;
  grain?: 'v' | 'h';
  rx?: number;
  shadow?: boolean;
}

/** A box positioned by its bottom centre, with real-size UVs. */
function Bx({ x = 0, y = 0, z = 0, w, h, d, m, grain = 'v', rx, shadow = true }: BxProps) {
  const geo = useMemo(() => boxGeometry(Math.max(w, 0.01), Math.max(h, 0.01), Math.max(d, 0.01), grain), [w, h, d, grain]);
  if (w <= 0 || h <= 0 || d <= 0) return null;
  return <mesh geometry={geo} material={m} position={[x, y + h / 2, z]} rotation={rx ? [rx, 0, 0] : undefined} castShadow={shadow} receiveShadow />;
}

function Cyl({ x = 0, y = 0, z = 0, r, r2, h, m, seg = 24, axis = 'y', open }: { x?: number; y?: number; z?: number; r: number; r2?: number; h: number; m: Mat; seg?: number; axis?: 'x' | 'y' | 'z'; open?: boolean }) {
  const rot: [number, number, number] = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={[x, y, z]} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[r2 ?? r, r, h, seg, 1, open]} />
      <primitive object={m} attach="material" />
    </mesh>
  );
}

const GAP = 0.3;
const FRONT_T = 1.8;
const TOP_T = 4;
const PLINTH = 10;

/** A door or drawer front with an optional bar handle. */
function Front({ x, y, w, h, z, m, handle = 'v', handlePos = 'tr', handleLen, handleY }: { x: number; y: number; w: number; h: number; z: number; m: Mat; handle?: 'v' | 'h' | 'none'; handlePos?: 'tr' | 'tl' | 'br' | 'bl' | 'tc' | 'bc'; handleLen?: number; handleY?: number }) {
  const fw = w - GAP * 2;
  const fh = h - GAP * 2;
  let hx = 0;
  let hy = fh / 2;
  const inset = 5;
  const hl = handleLen ?? (handle === 'v' ? Math.min(20, fh * 0.4) : Math.min(fw * 0.5, 30));
  if (handlePos.includes('r')) hx = fw / 2 - inset;
  if (handlePos.includes('l')) hx = -fw / 2 + inset;
  if (handlePos.startsWith('t')) hy = fh - inset - (handle === 'v' ? hl / 2 : 0);
  if (handlePos.startsWith('b')) hy = inset + (handle === 'v' ? hl / 2 : 0);
  if (handleY !== undefined) hy = handleY;
  return (
    <group position={[x, y + GAP, z]}>
      <Bx w={fw} h={fh} d={FRONT_T} m={m} z={FRONT_T / 2} />
      {handle !== 'none' && (
        <group position={[hx, hy, FRONT_T + 1.4]}>
          <Bx w={handle === 'v' ? 1.2 : hl} h={handle === 'v' ? hl : 1.2} d={1} m={M.handle} y={handle === 'v' ? -hl / 2 : -0.6} />
          <Bx w={1} h={1} d={1.4} m={M.handle} x={handle === 'h' ? -hl / 2 + 1 : 0} y={handle === 'v' ? hl / 2 - 1.5 : -0.5} z={-1.1} />
          <Bx w={1} h={1} d={1.4} m={M.handle} x={handle === 'h' ? hl / 2 - 1 : 0} y={handle === 'v' ? -hl / 2 + 0.5 : -0.5} z={-1.1} />
        </group>
      )}
    </group>
  );
}

/** Splits a width into door fronts. */
function doorRow(w: number) {
  const n = w <= 60 ? 1 : w <= 120 ? 2 : Math.ceil(w / 60);
  const dw = w / n;
  return Array.from({ length: n }, (_, i) => ({ x: -w / 2 + dw * (i + 0.5), w: dw, pos: (n === 1 ? 'tr' : i < n / 2 ? 'tr' : 'tl') as 'tr' | 'tl' }));
}

interface ModelProps {
  it: Item;
  /** Distance from the top of the item to the ceiling (cm). */
  ceilingGap: number;
}

function BaseUnit({ it, kind }: { it: Item; kind: 'doors' | 'drawers' | 'sink' | 'dishwasher' }) {
  const { width: w, depth: d, height: h } = it;
  const front = mat3(it.materials.front);
  const body = mat3(it.materials.body);
  const top = mat3(it.materials.top);
  const plinth = Math.min(PLINTH, h * 0.15);
  const ch = h - plinth - TOP_T; // carcass height
  const zf = d / 2 - 2.2 - FRONT_T; // front face plane
  return (
    <group>
      <Bx w={w - 1} h={plinth} d={d - 8} z={-4} m={color3('#2a2b2e', 0.7)} />
      {kind !== 'dishwasher' && <Bx w={w} h={ch} d={d - 4.2} z={-2.1} y={plinth} m={body} />}
      {kind === 'dishwasher' && <Bx w={w - 1} h={ch} d={d - 6} z={-3} y={plinth} m={color3('#9a9da1', 0.4, 0.6)} />}
      {kind === 'sink' ? <SinkTop it={it} y={h - TOP_T} /> : <Bx w={w} h={TOP_T} d={d} y={h - TOP_T} m={top} grain="h" />}
      {kind === 'doors' && doorRow(w).map((dr, i) => <Front key={i} x={dr.x} y={plinth} w={dr.w} h={ch} z={zf} m={front} handlePos={dr.pos} />)}
      {kind === 'sink' && doorRow(w).map((dr, i) => <Front key={i} x={dr.x} y={plinth} w={dr.w} h={ch} z={zf} m={front} handlePos={dr.pos} />)}
      {kind === 'dishwasher' && <Front x={0} y={plinth} w={w} h={ch} z={zf} m={front} handle="h" handlePos="tc" />}
      {kind === 'drawers' &&
        (() => {
          const hs = [0.27, 0.33, 0.4].map((f) => f * ch);
          let y = plinth;
          return hs
            .slice()
            .reverse()
            .map((fh, i) => {
              const el = <Front key={i} x={0} y={y} w={w} h={fh} z={zf} m={front} handle="h" handlePos="tc" />;
              y += fh;
              return el;
            });
        })()}
    </group>
  );
}

/** Countertop with a real cut-out, a recessed basin and a tap. */
function SinkTop({ it, y }: { it: Item; y: number }) {
  const { width: w, depth: d } = it;
  const top = mat3(it.materials.top);
  const steel = mat3(it.materials.finish ?? 'steel');
  const bw = Math.min(w - 20, w * 0.75);
  const bd = Math.min(d * 0.68, 42);
  const bz = d * 0.06;
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -d / 2);
    s.lineTo(w / 2, -d / 2);
    s.lineTo(w / 2, d / 2);
    s.lineTo(-w / 2, d / 2);
    s.closePath();
    const hole = new THREE.Path();
    const r = 4;
    const x0 = -bw / 2;
    const y0 = -bz - bd / 2;
    hole.moveTo(x0 + r, y0);
    hole.lineTo(x0 + bw - r, y0);
    hole.quadraticCurveTo(x0 + bw, y0, x0 + bw, y0 + r);
    hole.lineTo(x0 + bw, y0 + bd - r);
    hole.quadraticCurveTo(x0 + bw, y0 + bd, x0 + bw - r, y0 + bd);
    hole.lineTo(x0 + r, y0 + bd);
    hole.quadraticCurveTo(x0, y0 + bd, x0, y0 + bd - r);
    hole.lineTo(x0, y0 + r);
    hole.quadraticCurveTo(x0, y0, x0 + r, y0);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: TOP_T, bevelEnabled: false, curveSegments: 6 });
    // Shape lies in XY; turn it so it lies in XZ with thickness going up.
    g.rotateX(-Math.PI / 2);
    return g;
  }, [w, d, bw, bd, bz]);
  const bh = 18;
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geo} material={top} castShadow receiveShadow />
      <group position={[0, 0, bz]}>
        {/* Basin: floor and four walls. */}
        <Bx w={bw} h={0.6} d={bd} y={TOP_T - bh} m={steel} />
        <Bx w={bw} h={bh} d={0.6} z={-bd / 2 + 0.3} y={TOP_T - bh} m={steel} />
        <Bx w={bw} h={bh} d={0.6} z={bd / 2 - 0.3} y={TOP_T - bh} m={steel} />
        <Bx w={0.6} h={bh} d={bd} x={-bw / 2 + 0.3} y={TOP_T - bh} m={steel} />
        <Bx w={0.6} h={bh} d={bd} x={bw / 2 - 0.3} y={TOP_T - bh} m={steel} />
        <Cyl r={2.2} h={0.4} y={TOP_T - bh + 0.8} m={M.ring} />
      </group>
      <Tap y={TOP_T} z={bz - bd / 2 - 5} m={steel} />
    </group>
  );
}

function Tap({ y, z, m }: { y: number; z: number; m: Mat }) {
  return (
    <group position={[0, y, z]}>
      <Cyl r={2.4} h={3} y={1.5} m={m} />
      <Cyl r={1.3} h={30} y={18} m={m} />
      <Cyl r={1.2} h={20} y={33} z={8.5} axis="z" m={m} />
      <Cyl r={1.4} h={5} y={30.5} z={18} m={m} />
      <Bx w={1} h={1} d={8} x={3} y={20} z={2} m={m} />
    </group>
  );
}

function WallUnit({ it, ceilingGap, ceiling }: { it: Item; ceilingGap: number; ceiling?: boolean }) {
  const { width: w, depth: d, height: h } = it;
  const front = mat3(it.materials.front);
  const body = mat3(it.materials.body);
  const zf = d / 2 - FRONT_T;
  const rods = ceiling && ceilingGap > 0.5;
  const rodMat = mat3(it.materials.finish ?? 'black-matt');
  return (
    <group>
      <Bx w={w} h={h} d={d - FRONT_T} z={-FRONT_T / 2} m={body} />
      {doorRow(w).map((dr, i) => (
        <Front key={i} x={dr.x} y={0} w={dr.w} h={h} z={zf} m={front} handlePos={dr.pos === 'tr' ? 'br' : 'bl'} />
      ))}
      {ceiling && (
        <group rotation={[0, Math.PI, 0]}>
          {doorRow(w).map((dr, i) => (
            <Front key={i} x={dr.x} y={0} w={dr.w} h={h} z={zf - FRONT_T} m={front} handle="none" />
          ))}
        </group>
      )}
      {rods &&
        [-1, 1].map((sx) =>
          [-1, 1].map((sz) => <Bx key={`${sx}${sz}`} x={sx * (w / 2 - 6)} z={sz * (d / 2 - 6)} y={h} w={1.4} h={ceilingGap} d={1.4} m={rodMat} />),
        )}
      {rods && [-1, 1].map((sx) => <Bx key={`c${sx}`} x={sx * (w / 2 - 6)} y={h + ceilingGap - 1} w={8} h={1} d={d - 6} m={rodMat} />)}
    </group>
  );
}

function TallUnit({ it, variant }: { it: Item; variant: 'pantry' | 'oven' | 'fridge' | 'freezer' }) {
  const { width: w, depth: d, height: h } = it;
  const front = mat3(it.materials.front);
  const body = mat3(it.materials.body);
  const finish = mat3(it.materials.finish ?? 'steel');
  const plinth = PLINTH;
  const zf = d / 2 - FRONT_T - 0.4;
  const ch = h - plinth;
  return (
    <group>
      <Bx w={w - 1} h={plinth} d={d - 8} z={-4} m={color3('#2a2b2e', 0.7)} />
      <Bx w={w} h={ch} d={d - FRONT_T - 0.4} z={-(FRONT_T + 0.4) / 2} y={plinth} m={body} />
      {variant === 'pantry' && (
        <>
          <Front x={0} y={plinth} w={w} h={ch * 0.62} z={zf} m={front} handlePos="tr" />
          <Front x={0} y={plinth + ch * 0.62} w={w} h={ch * 0.38} z={zf} m={front} handlePos="br" />
        </>
      )}
      {(variant === 'fridge' || variant === 'freezer') && (
        <>
          {/* One full-height door; the handle sits on the side opposite the hinges. */}
          <Front
            x={0}
            y={plinth}
            w={w}
            h={ch}
            z={zf}
            m={front}
            handlePos={itemOptions(it).hinge === 'right' ? 'tl' : 'tr'}
            handleLen={Math.min(60, ch * 0.35)}
            handleY={Math.min(ch - 10, 100 - plinth)}
          />
          {/* Ventilation grille in the plinth, as on real integrated appliances. */}
          {Array.from({ length: 6 }, (_, i) => (
            <Bx key={i} w={w - 12} h={0.6} d={0.4} y={2 + i * 1.3} z={d / 2 - 7.8} m={color3("#111214", 0.6)} />
          ))}
        </>
      )}
      {variant === 'oven' &&
        (() => {
          const ovenY = Math.min(80, h - 120);
          const microY = ovenY + 60;
          const topY = microY + 38;
          return (
            <>
              <Front x={0} y={plinth} w={w} h={ovenY - plinth} z={zf} m={front} handle="h" handlePos="tc" />
              <group position={[0, ovenY, zf]}>
                <OvenFront w={w} h={60} m={finish} />
              </group>
              <group position={[0, microY, zf]}>
                <MicroFront w={w} h={38} m={finish} />
              </group>
              <Front x={0} y={topY} w={w} h={h - topY} z={zf} m={front} handle="h" handlePos="bc" />
            </>
          );
        })()}
    </group>
  );
}

function OvenFront({ w, h, m }: { w: number; h: number; m: Mat }) {
  const fw = w - 1;
  return (
    <group>
      <Bx w={fw} h={h - 0.6} d={2} y={0.3} z={1} m={m} />
      <Bx w={fw - 6} h={h * 0.62} d={0.6} y={4} z={2.1} m={M.blackGlass} />
      <Bx w={fw} h={h * 0.2} d={0.6} y={h - h * 0.2 - 0.3} z={2.1} m={M.blackGlass} />
      <Bx w={8} h={2} d={0.3} y={h - h * 0.13} z={2.5} m={M.display} />
      {[-1, 1].map((s) => (
        <Cyl key={s} x={s * fw * 0.33} y={h - h * 0.1} z={3} r={1.8} h={2} axis="z" m={M.handle} />
      ))}
      <Bx w={fw * 0.8} h={1.6} d={1.6} y={h * 0.62 + 2.4} z={4.5} m={M.handle} />
    </group>
  );
}

function MicroFront({ w, h, m }: { w: number; h: number; m: Mat }) {
  const fw = w - 1;
  return (
    <group>
      <Bx w={fw} h={h - 0.6} d={2} y={0.3} z={1} m={m} />
      <Bx w={fw * 0.68} h={h - 7} d={0.6} x={-fw * 0.13} y={3.5} z={2.1} m={M.blackGlass} />
      <Bx w={fw * 0.2} h={h - 7} d={0.6} x={fw * 0.37} y={3.5} z={2.1} m={M.blackGlass} />
      <Bx w={6} h={1.6} d={0.3} x={fw * 0.37} y={h - 9} z={2.5} m={M.display} />
    </group>
  );
}

function Fridge({ it, kind }: { it: Item; kind: 'combi' | 'american' | 'freezer' }) {
  const { width: w, depth: d, height: h } = it;
  const m = mat3(it.materials.finish);
  const bodyD = d - 6;
  const doors: { x: number; y: number; w: number; h: number; hx: number }[] = [];
  if (kind === 'combi') {
    const split = h * 0.36;
    doors.push({ x: 0, y: 0, w, h: split, hx: -w / 2 + 4 });
    doors.push({ x: 0, y: split, w, h: h - split, hx: -w / 2 + 4 });
  } else if (kind === 'american') {
    doors.push({ x: -w / 4, y: 0, w: w / 2, h, hx: w / 4 - 4 });
    doors.push({ x: w / 4, y: 0, w: w / 2, h, hx: -w / 4 + 4 });
  } else doors.push({ x: 0, y: 0, w, h, hx: -w / 2 + 4 });
  return (
    <group>
      <Bx w={w - 0.5} h={h - 1} d={bodyD} z={-3} y={1} m={color3('#d9dadc', 0.5, 0.2)} />
      {doors.map((dr, i) => (
        <group key={i} position={[dr.x, dr.y, d / 2 - 6]}>
          <Bx w={dr.w - 0.6} h={dr.h - 0.6} d={5} y={0.3} z={2.5} m={m} />
          <Bx w={2} h={Math.min(dr.h * 0.55, 60)} d={2.4} x={dr.hx} y={dr.h / 2 - Math.min(dr.h * 0.55, 60) / 2 + (kind === 'combi' && i === 0 ? 8 : 0)} z={6.2} m={M.handle} />
        </group>
      ))}
      {kind === 'american' && <Bx w={20} h={30} d={0.5} x={-w / 4} y={h * 0.55} z={d / 2 - 0.5} m={M.blackGlass} />}
    </group>
  );
}

function Appliance({ it, ceilingGap }: ModelProps) {
  const e = getEntry(it.type);
  const { width: w, depth: d, height: h } = it;
  const fin = mat3(it.materials.finish ?? 'steel');
  switch (e.model) {
    case 'fridge':
      return <Fridge it={it} kind="combi" />;
    case 'fridge-american':
      return <Fridge it={it} kind="american" />;
    case 'freezer':
      return <Fridge it={it} kind="freezer" />;
    case 'chest-freezer':
      return (
        <group>
          <Bx w={w} h={h - 6} d={d} m={fin} />
          <Bx w={w + 1} h={6} d={d + 1} y={h - 6} m={fin} />
          <Bx w={30} h={2} d={2} y={h - 8} z={d / 2 + 1} m={M.plastic} />
          <Bx w={w} h={4} d={d - 1} m={M.rubber} />
        </group>
      );
    case 'oven':
      return (
        <group>
          <Bx w={w - 2} h={h - 1} d={d - 3} z={-1.5} m={color3('#333', 0.6)} />
          <group position={[0, 0, d / 2 - 3]}>
            <OvenFront w={w} h={h} m={fin} />
          </group>
        </group>
      );
    case 'microwave':
      return (
        <group>
          <Bx w={w - 1} h={h} d={d - 2.5} z={-1.25} m={fin} />
          <group position={[0, 0, d / 2 - 2.5]}>
            <MicroFront w={w} h={h} m={fin} />
          </group>
        </group>
      );
    case 'cooktop-induction': {
      const r = Math.min(w, d) * 0.17;
      return (
        <group>
          <Bx w={w} h={Math.max(h, 0.6)} d={d} m={M.blackGlass} />
          {[
            [-0.24, -0.22, 1],
            [0.24, -0.22, 0.8],
            [-0.24, 0.22, 0.8],
            [0.24, 0.22, 1],
          ].map(([cx, cz, s], i) => (
            <mesh key={i} position={[cx * w, Math.max(h, 0.6) + 0.05, cz * d]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r * s - 0.5, r * s, 48]} />
              <primitive object={M.ring} attach="material" />
            </mesh>
          ))}
          <Bx w={14} h={0.1} d={3} y={Math.max(h, 0.6)} z={d / 2 - 4} m={M.display} />
        </group>
      );
    }
    case 'cooktop-gas':
    case 'range': {
      const isRange = e.model === 'range';
      const base = isRange ? h - 3 : 0;
      const slabH = isRange ? 3 : Math.max(h, 1);
      const cols = !isRange && w > 70 ? [-0.3, 0, 0.3] : [-0.24, 0.24];
      return (
        <group>
          {isRange && (
            <>
              <Bx w={w} h={h - 3} d={d - 2} z={-1} m={fin} />
              <group position={[0, 8, d / 2 - 2]}>
                <OvenFront w={w} h={h - 22} m={fin} />
              </group>
              <Bx w={w} h={10} d={1} y={h - 13} z={d / 2 - 1.5} m={fin} />
              {[-0.36, -0.18, 0.18, 0.36].map((kx, i) => (
                <Cyl key={i} x={kx * w} y={h - 8} z={d / 2 - 0.5} r={1.8} h={2.4} axis="z" m={M.rubber} />
              ))}
            </>
          )}
          <Bx w={w} h={slabH} d={d} y={base} m={fin} />
          {cols.map((cx, i) =>
            [-0.22, 0.22].map((cz, j) => {
              if (cols.length === 3 && i === 1 && j === 0) return null;
              const r = Math.min(w, d) * (i + j === 1 ? 0.12 : 0.15);
              return (
                <group key={`${i}${j}`} position={[cx * w, base + slabH, cz * d + (isRange ? 2 : 0)]}>
                  <Cyl r={r} h={1.6} y={0.8} m={M.rubber} />
                  <Cyl r={r * 0.45} h={0.8} y={2} m={color3('#7b7f86', 0.4, 0.6)} />
                  <Bx w={r * 2.6} h={1} d={1} y={2} m={M.rubber} />
                  <Bx w={1} h={1} d={r * 2.6} y={2} m={M.rubber} />
                </group>
              );
            }),
          )}
        </group>
      );
    }
    case 'hood-wall':
    case 'hood-island': {
      const island = e.model === 'hood-island';
      const cw = Math.min(30, w * 0.4);
      const cd = Math.min(25, d * 0.5);
      return (
        <group>
          <Bx w={w} h={h * 0.4} d={d} m={fin} />
          <group position={[0, h * 0.4 + (h * 0.6) / 2, 0]} scale={[w, h * 0.6, d]}>
            <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
              <cylinderGeometry args={[Math.SQRT1_2 * 0.4, Math.SQRT1_2, 1, 4, 1]} />
              <primitive object={fin} attach="material" />
            </mesh>
          </group>
          <Bx w={cw} h={Math.max(0, ceilingGap)} d={cd} y={h} z={island ? 0 : -d / 2 + cd / 2 + 2} m={fin} />
          <Bx w={w - 6} h={0.4} d={d - 6} y={-0.2} m={color3('#55585c', 0.5, 0.8)} />
          <Bx w={6} h={1} d={0.4} y={1} z={d / 2} m={M.display} />
        </group>
      );
    }
    case 'sink': {
      const bw = Math.max(10, w - 6);
      const bd = Math.max(10, d - 8);
      return (
        <group>
          <Bx w={w} h={0.8} d={d} m={fin} />
          <Bx w={bw} h={0.1} d={bd} y={0.8} z={2} m={color3('#5a5f66', 0.35, 0.9)} />
          <Cyl r={2.2} h={0.2} y={0.95} z={2} m={M.rubber} />
          <Tap y={0.8} z={-d / 2 + 3} m={fin} />
        </group>
      );
    }
    case 'washer':
    case 'dryer': {
      const r = Math.min(w, h) * 0.3;
      return (
        <group>
          <Bx w={w} h={h} d={d} m={fin} />
          <Bx w={w - 1} h={10} d={0.4} y={h - 11} z={d / 2} m={color3('#dcdcdc', 0.4)} />
          <Bx w={10} h={4} d={0.3} x={w * 0.2} y={h - 8} z={d / 2 + 0.3} m={M.display} />
          <Cyl x={-w * 0.3} y={h - 6} z={d / 2 + 0.5} r={2.4} h={2} axis="z" m={M.handle} />
          <Cyl y={h * 0.45} z={d / 2 + 1} r={r} h={2} axis="z" m={M.handle} seg={40} />
          <Cyl y={h * 0.45} z={d / 2 + 2} r={r * 0.78} h={0.6} axis="z" m={e.model === 'washer' ? M.darkGlass : color3('#cfd3d6', 0.3, 0.2)} seg={40} />
        </group>
      );
    }
    case 'wine':
      return (
        <group>
          <Bx w={w} h={h} d={d - 3} z={-1.5} m={fin} />
          <Bx w={w - 4} h={h - 6} d={0.6} y={4} z={d / 2 - 1} m={M.darkGlass} />
          {Array.from({ length: 6 }, (_, i) => (
            <Bx key={i} w={w - 8} h={0.5} d={1} y={8 + i * ((h - 14) / 6)} z={d / 2 - 2.5} m={color3('#8a6a4a', 0.6)} />
          ))}
          <Bx w={1.4} h={h * 0.5} d={2} x={w / 2 - 4} y={h * 0.25} z={d / 2 + 0.5} m={M.handle} />
        </group>
      );
    default:
      return <Bx w={w} h={h} d={d} m={fin} />;
  }
}

function Furniture({ it, ceilingGap }: ModelProps) {
  const e = getEntry(it.type);
  const { width: w, depth: d, height: h } = it;
  const body = mat3(it.materials.body);
  const top = mat3(it.materials.top);
  switch (e.model) {
    case 'table':
      return (
        <group>
          <Bx w={w} h={3.5} d={d} y={h - 3.5} m={top} grain="h" />
          {[-1, 1].map((sx) => [-1, 1].map((sz) => <Bx key={`${sx}${sz}`} x={sx * (w / 2 - 6)} z={sz * (d / 2 - 6)} w={4} h={h - 3.5} d={4} m={body} />))}
        </group>
      );
    case 'table-round':
    case 'table-oval':
      return <PedestalTable it={it} />;
    case 'chair': {
      const seat = h * 0.53;
      return (
        <group>
          {[-1, 1].map((sx) => [-1, 1].map((sz) => <Bx key={`${sx}${sz}`} x={sx * (w / 2 - 2.5)} z={sz * (d / 2 - 2.5)} w={2.5} h={seat} d={2.5} m={body} />))}
          <Bx w={w} h={3} d={d} y={seat} m={top} />
          {[-1, 1].map((sx) => <Bx key={sx} x={sx * (w / 2 - 2.5)} z={-d / 2 + 1.5} y={seat + 3} w={2.5} h={h - seat - 3} d={2.5} m={body} />)}
          <Bx w={w} h={14} d={2} y={h - 16} z={-d / 2 + 1.5} m={top} />
        </group>
      );
    }
    case 'stool': {
      const r = Math.min(w, d) / 2;
      return (
        <group>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            return <Cyl key={i} x={Math.cos(a) * r * 0.62} z={Math.sin(a) * r * 0.62} r={1.1} r2={1.1} h={h - 4} y={(h - 4) / 2} m={body} seg={10} />;
          })}
          <mesh position={[0, h * 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.62, 0.8, 8, 32]} />
            <primitive object={body} attach="material" />
          </mesh>
          <Cyl r={r} h={4} y={h - 2} m={top} seg={32} />
        </group>
      );
    }
    case 'pendant': {
      const fin = mat3(it.materials.finish ?? 'brass');
      const r = Math.min(w, d) / 2;
      return (
        <group>
          <Cyl r={0.3} h={Math.max(0, ceilingGap)} y={h + ceilingGap / 2} m={M.rubber} seg={6} />
          <Cyl r={4} h={1} y={h + ceilingGap - 0.5} m={fin} />
          <Cyl r={r} r2={3} h={h} y={h / 2} m={fin} seg={32} open />
          <mesh position={[0, 3, 0]}>
            <sphereGeometry args={[4, 16, 12]} />
            <primitive object={M.bulb} attach="material" />
          </mesh>
          <pointLight position={[0, -2, 0]} intensity={2500} distance={260} decay={2} color="#ffe2b0" />
        </group>
      );
    }
    default:
      return <Bx w={w} h={h} d={d} m={body} />;
  }
}

/** Freestanding dishwasher: its own worktop, control strip and door. */
function FreestandingDishwasher({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const fin = mat3(it.materials.finish ?? 'steel');
  const panel = 10;
  return (
    <group>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} x={sx * (w / 2 - 4)} z={sz * (d / 2 - 5)} r={1.6} h={1.5} y={0.75} m={M.rubber} seg={10} />))}
      <Bx w={w - 0.4} h={h - 3.5} d={d - 2} y={1.5} z={-1} m={fin} />
      <Bx w={w} h={2} d={d} y={h - 2} m={fin} />
      {/* Door with a recessed grip below the control strip. */}
      <Bx w={w - 1} h={h - panel - 5} d={1.2} y={2} z={d / 2 - 0.6} m={fin} />
      <Bx w={w * 0.5} h={1.6} d={0.4} y={h - panel - 5.5} z={d / 2 + 0.1} m={color3('#1b1c1f', 0.5)} />
      <Bx w={w - 1} h={panel - 1} d={1} y={h - panel - 2} z={d / 2 - 0.5} m={M.blackGlass} />
      <Bx w={9} h={2.4} d={0.3} x={w * 0.22} y={h - panel + 1.5} z={d / 2 + 0.1} m={M.display} />
      {[-0.32, -0.22, -0.12].map((bx, i) => (
        <Cyl key={i} x={bx * w} y={h - panel + 2.7} z={d / 2 + 0.2} r={1} h={0.6} axis="z" m={M.handle} seg={12} />
      ))}
    </group>
  );
}

/** Round or oval table on a single tapered pedestal (wider at the floor than under the top). */
function PedestalTable({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const top = mat3(it.materials.top);
  const body = mat3(it.materials.body);
  const T = 3.5;
  const topGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.absellipse(0, 0, w / 2, d / 2, 0, Math.PI * 2, false, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: T - 1, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3, curveSegments: 64 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [w, d]);
  const small = Math.min(w, d);
  const rTop = Math.max(4, small * 0.06);
  const rBottom = Math.max(rTop + 6, small * 0.24);
  const stemH = h - T - 2;
  // Oval tables get a pedestal stretched along the long side.
  const stretch = Math.min(1.6, Math.max(1, w / d));
  const stemGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(rTop, rBottom, stemH, 48, 1);
    // UVs in cm so wood/stone textures keep their size around the cone.
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * (rTop + rBottom), uv.getY(i) * stemH);
    return g;
  }, [rTop, rBottom, stemH]);
  return (
    <group>
      <group scale={[stretch, 1, 1]}>
        <mesh geometry={stemGeo} material={body} position={[0, stemH / 2, 0]} castShadow receiveShadow />
        <mesh position={[0, stemH + 1, 0]} material={body} castShadow>
          <cylinderGeometry args={[rTop * 2.2, rTop * 1.2, 2, 32]} />
        </mesh>
      </group>
      <mesh geometry={topGeo} material={top} position={[0, h - T + 0.5, 0]} castShadow receiveShadow />
    </group>
  );
}

function Island({ it }: { it: Item }) {
  const { width: w, depth: d, height: h } = it;
  const front = mat3(it.materials.front);
  const body = mat3(it.materials.body);
  const top = mat3(it.materials.top);
  const over = Math.min(30, d * 0.3);
  const cd = d - over; // cabinet depth
  const cz = d / 2 - cd / 2; // cabinets towards the front (+z)
  const ch = h - PLINTH - TOP_T;
  return (
    <group>
      <Bx w={w - 2} h={PLINTH} d={cd - 8} z={cz - 2} m={color3('#2a2b2e', 0.7)} />
      <Bx w={w} h={ch} d={cd - 2.2 - FRONT_T} z={cz - (2.2 + FRONT_T) / 2} y={PLINTH} m={body} />
      {/* Side panels down to the floor give the island a furniture look. */}
      {[-1, 1].map((s) => (
        <Bx key={s} x={s * (w / 2 - 1.5)} w={3} h={h - TOP_T} d={d} m={top} />
      ))}
      <Bx w={w} h={TOP_T} d={d} y={h - TOP_T} m={top} grain="h" />
      {doorRow(w - 6).map((dr, i) => (
        <Front key={i} x={dr.x} y={PLINTH} w={dr.w} h={ch} z={d / 2 - 2.2 - FRONT_T} m={front} handlePos={dr.pos} />
      ))}
    </group>
  );
}

export function ItemModel({ it, ceilingGap }: ModelProps) {
  const e = getEntry(it.type);
  switch (e.model) {
    case 'base':
      return <BaseUnit it={it} kind="doors" />;
    case 'drawers':
      return <BaseUnit it={it} kind="drawers" />;
    case 'sink-base':
      return <BaseUnit it={it} kind="sink" />;
    case 'dishwasher':
      return itemOptions(it).builtIn === false ? <FreestandingDishwasher it={it} /> : <BaseUnit it={it} kind="dishwasher" />;
    case 'wall':
      return <WallUnit it={it} ceilingGap={ceilingGap} />;
    case 'ceiling':
      return <WallUnit it={it} ceilingGap={ceilingGap} ceiling />;
    case 'shelf':
      return <Bx w={it.width} h={it.height} d={it.depth} m={mat3(it.materials.body)} grain="h" />;
    case 'tall':
      return <TallUnit it={it} variant="pantry" />;
    case 'oven-tower':
      return <TallUnit it={it} variant="oven" />;
    case 'fridge-tower':
      return <TallUnit it={it} variant="fridge" />;
    case 'freezer-tower':
      return <TallUnit it={it} variant="freezer" />;
    case 'island':
      return <Island it={it} />;
    case 'countertop':
      return <Bx w={it.width} h={it.height} d={it.depth} m={mat3(it.materials.top)} grain="h" />;
    case 'table':
    case 'table-round':
    case 'table-oval':
    case 'chair':
    case 'stool':
    case 'pendant':
      return <Furniture it={it} ceilingGap={ceilingGap} />;
    default:
      return <Appliance it={it} ceilingGap={ceilingGap} />;
  }
}
