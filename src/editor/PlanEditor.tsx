import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEntry } from '../catalog';
import {
  add,
  clearances,
  fitOpening,
  dist,
  dot,
  fmtCm,
  getWalls,
  mul,
  normAngle,
  outerPolygon,
  pointInItem,
  projectOnSegment,
  rad2deg,
  rotate,
  roomBounds,
  round1,
  snap,
  snapDrawPoint,
  snapItem,
  sub,
  v,
} from '../geometry';
import { fixOpeningsAfterSplit, useStore } from '../store';
import type { Item, Opening, Vec2 } from '../types';
import { PlanSymbol } from './PlanSymbol';

interface View {
  tx: number;
  ty: number;
  scale: number;
}

type Drag =
  | { kind: 'pan'; start: Vec2; view: View; moved: boolean }
  | { kind: 'item'; id: string; start: Vec2; orig: Vec2; moved: boolean; wasSelected: boolean; under: string[] }
  | { kind: 'rotate'; id: string; moved: boolean }
  | { kind: 'vertex'; index: number; moved: boolean }
  | { kind: 'wall'; index: number; start: Vec2; a: Vec2; b: Vec2; moved: boolean }
  | { kind: 'opening'; id: string; moved: boolean }
  | { kind: 'draw'; start: Vec2; view: View; moved: boolean };

const pathOf = (pts: Vec2[], close = true) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('') + (close ? 'Z' : '');

export function PlanEditor() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const draft = useStore((s) => s.draft);
  const settings = useStore((s) => s.settings);
  const fitToken = useStore((s) => s.fitToken);
  const { room, items, openings } = project;

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ tx: 60, ty: 60, scale: 1.5 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Vec2>());
  const pinch = useRef<{ d: number; mid: Vec2; view: View } | null>(null);
  const [hover, setHover] = useState<{ point: Vec2; guides: { a: Vec2; b: Vec2 }[]; closing: boolean } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [dropGhost, setDropGhost] = useState<Vec2 | null>(null);

  const walls = useMemo(() => getWalls(room), [room]);
  const outer = useMemo(() => outerPolygon(room), [room]);

  // Track container size.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitView = useCallback(() => {
    const b = roomBounds(room);
    const pad = room.wallThickness + 70;
    const bw = b.maxX - b.minX + pad * 2;
    const bh = b.maxY - b.minY + pad * 2;
    const scale = Math.max(0.2, Math.min(8, Math.min(size.w / bw, size.h / bh)));
    setView({ scale, tx: size.w / 2 - ((b.minX + b.maxX) / 2) * scale, ty: size.h / 2 - ((b.minY + b.maxY) / 2) * scale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.points.length, size.w, size.h, room.wallThickness]);

  const fittedOnce = useRef(false);
  useEffect(() => {
    if (size.w < 50) return;
    if (!fittedOnce.current) {
      fittedOnce.current = true;
      fitView();
    }
  }, [size, fitView]);
  useEffect(() => {
    if (fitToken) fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const toPlan = useCallback((clientX: number, clientY: number): Vec2 => {
    const r = svgRef.current!.getBoundingClientRect();
    const vw = viewRef.current;
    return v((clientX - r.left - vw.tx) / vw.scale, (clientY - r.top - vw.ty) / vw.scale);
  }, []);

  const threshold = 12 / view.scale;
  const snapOn = (e: { shiftKey: boolean }) => settings.snap && !e.shiftKey;

  // Wheel zoom (needs a non-passive listener).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const vw = viewRef.current;
      const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      const scale = Math.max(0.15, Math.min(12, vw.scale * k));
      setView({ scale, tx: mx - ((mx - vw.tx) / vw.scale) * scale, ty: my - ((my - vw.ty) / vw.scale) * scale });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const itemsUnder = (p: Vec2) =>
    [...items]
      .sort((a, b) => b.elevation + b.height - (a.elevation + a.height))
      .filter((it) => pointInItem(p, it, 2 / viewRef.current.scale))
      .map((it) => it.id);

  const drawSnap = (p: Vec2, e: { shiftKey: boolean }) =>
    snapDrawPoint(p, draft, { grid: snapOn(e) ? settings.grid : 0, ortho: settings.ortho && !e.shiftKey, threshold: snapOn(e) ? threshold : 0 });

  const st = useStore.getState;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    svgRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, v(e.clientX, e.clientY));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: dist(a, b), mid: mul(add(a, b), 0.5), view: viewRef.current };
      drag.current = null;
      return;
    }
    const p = toPlan(e.clientX, e.clientY);
    if (e.button === 1 || spaceDown || e.button === 2) {
      drag.current = { kind: 'pan', start: v(e.clientX, e.clientY), view: viewRef.current, moved: true };
      return;
    }
    if (tool === 'draw') {
      drag.current = { kind: 'draw', start: v(e.clientX, e.clientY), view: viewRef.current, moved: false };
      return;
    }
    const t = (e.target as Element).closest('[data-kind]') as HTMLElement | null;
    const kind = t?.dataset.kind;
    if (kind === 'rotate') {
      drag.current = { kind: 'rotate', id: t!.dataset.id!, moved: false };
      return;
    }
    if (kind === 'vertex') {
      const index = Number(t!.dataset.index);
      st().select({ kind: 'vertex', index });
      drag.current = { kind: 'vertex', index, moved: false };
      return;
    }
    if (kind === 'split') {
      const index = Number(t!.dataset.index);
      const w = walls[index];
      const mid = mul(add(w.a, w.b), 0.5);
      st().mutate((pr) => {
        const pts = [...pr.room.points];
        pts.splice(index + 1, 0, v(round1(mid.x), round1(mid.y)));
        return { ...pr, room: { ...pr.room, points: pts }, openings: fixOpeningsAfterSplit(pr.openings, index, w.length / 2) };
      });
      st().select({ kind: 'vertex', index: index + 1 });
      drag.current = { kind: 'vertex', index: index + 1, moved: false };
      return;
    }
    if (kind === 'opening') {
      st().select({ kind: 'opening', id: t!.dataset.id! });
      drag.current = { kind: 'opening', id: t!.dataset.id!, moved: false };
      return;
    }
    const under = itemsUnder(p);
    if (under.length) {
      const selId = selection?.kind === 'item' ? selection.id : null;
      const id = selId && under.includes(selId) ? selId : under[0];
      const it = items.find((i) => i.id === id)!;
      st().select({ kind: 'item', id });
      drag.current = { kind: 'item', id, start: p, orig: v(it.x, it.y), moved: false, wasSelected: id === selId, under };
      return;
    }
    if (kind === 'wall') {
      const index = Number(t!.dataset.index);
      st().select({ kind: 'wall', index });
      const w = walls[index];
      drag.current = { kind: 'wall', index, start: p, a: w.a, b: w.b, moved: false };
      return;
    }
    drag.current = { kind: 'pan', start: v(e.clientX, e.clientY), view: viewRef.current, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, v(e.clientX, e.clientY));
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = dist(a, b);
      const mid = mul(add(a, b), 0.5);
      const pv = pinch.current.view;
      const r = svgRef.current!.getBoundingClientRect();
      const scale = Math.max(0.15, Math.min(12, (pv.scale * d) / pinch.current.d));
      const m0 = v(pinch.current.mid.x - r.left, pinch.current.mid.y - r.top);
      const planMid = v((m0.x - pv.tx) / pv.scale, (m0.y - pv.ty) / pv.scale);
      setView({ scale, tx: mid.x - r.left - planMid.x * scale, ty: mid.y - r.top - planMid.y * scale });
      return;
    }
    const p = toPlan(e.clientX, e.clientY);
    const dg = drag.current;
    if (tool === 'draw' && (!dg || !dg.moved)) setHover(drawSnap(p, e));
    if (!dg) return;

    if (dg.kind === 'pan' || dg.kind === 'draw') {
      const dx = e.clientX - dg.start.x;
      const dy = e.clientY - dg.start.y;
      if (!dg.moved && Math.hypot(dx, dy) < 5) return;
      dg.moved = true;
      setView({ ...dg.view, tx: dg.view.tx + dx, ty: dg.view.ty + dy });
      return;
    }
    if (!dg.moved) {
      if (dg.kind === 'item' && dist(p, dg.start) * viewRef.current.scale < 3) return;
      dg.moved = true;
      st().checkpoint();
    }
    if (dg.kind === 'item') {
      const it = items.find((i) => i.id === dg.id);
      if (!it) return;
      const moved = { ...it, x: dg.orig.x + p.x - dg.start.x, y: dg.orig.y + p.y - dg.start.y };
      if (snapOn(e)) {
        const s = snapItem(moved, room, items, { grid: settings.grid, threshold, snapToWalls: getEntry(it.type).snapToWall, snapToItems: true });
        st().updateItem(it.id, { x: s.x, y: s.y, rotation: s.rotation }, false);
      } else st().updateItem(it.id, { x: round1(moved.x), y: round1(moved.y) }, false);
    } else if (dg.kind === 'rotate') {
      const it = items.find((i) => i.id === dg.id);
      if (!it) return;
      let ang = rad2deg(Math.atan2(p.y - it.y, p.x - it.x)) + 90;
      ang = snapOn(e) ? snap(ang, 15) : Math.round(ang);
      st().updateItem(it.id, { rotation: normAngle(ang) }, false);
    } else if (dg.kind === 'vertex') {
      const others = room.points.filter((_, i) => i !== dg.index);
      let q = snapOn(e) ? v(snap(p.x, settings.grid), snap(p.y, settings.grid)) : v(round1(p.x), round1(p.y));
      if (snapOn(e)) {
        for (const o of others) {
          if (Math.abs(p.x - o.x) < threshold) q = v(o.x, q.y);
          if (Math.abs(p.y - o.y) < threshold) q = v(q.x, o.y);
        }
      }
      st().mutate((pr) => ({ ...pr, room: { ...pr.room, points: pr.room.points.map((pt, i) => (i === dg.index ? q : pt)) } }), false);
    } else if (dg.kind === 'wall') {
      const w = walls[dg.index];
      if (!w) return;
      let k = dot(sub(p, dg.start), w.in);
      if (snapOn(e)) k = snap(k, settings.grid);
      const off = mul(w.in, k);
      const n = room.points.length;
      st().mutate(
        (pr) => ({
          ...pr,
          room: {
            ...pr.room,
            points: pr.room.points.map((pt, i) => (i === dg.index ? round(add(dg.a, off)) : i === (dg.index + 1) % n ? round(add(dg.b, off)) : pt)),
          },
        }),
        false,
      );
    } else if (dg.kind === 'opening') {
      const op = openings.find((o) => o.id === dg.id);
      if (!op) return;
      let best = { d: Infinity, wall: walls[0], t: 0 };
      for (const w of walls) {
        const pr = projectOnSegment(p, w.a, w.b);
        if (pr.distance < best.d) best = { d: pr.distance, wall: w, t: pr.t };
      }
      if (!best.wall) return;
      let offset = best.t * best.wall.length;
      if (snapOn(e)) offset = snap(offset, settings.grid);
      // Openings stay on a wall and never overlap each other; if it doesn't fit there, it stays put.
      const fitted = fitOpening(op, offset, best.wall.index, best.wall.length, openings);
      if (fitted !== null) st().updateOpening(op.id, { wallIndex: best.wall.index, offset: fitted }, false);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      drag.current = null;
      return;
    }
    const dg = drag.current;
    drag.current = null;
    if (!dg) return;
    if (dg.kind === 'pan' && !dg.moved) st().select(null);
    if (dg.kind === 'draw' && !dg.moved) {
      const p = toPlan(e.clientX, e.clientY);
      const h = drawSnap(p, e);
      if (h.closing) {
        st().setProject({ ...project, room: { ...room, points: draft, closed: true }, openings: [] });
        st().setTool('select');
        setHover(null);
      } else {
        const last = draft[draft.length - 1];
        if (!last || dist(last, h.point) > 1) st().setDraft([...draft, h.point]);
      }
    }
    // Clicking again on stacked items cycles through them (e.g. wall unit above a base unit).
    if (dg.kind === 'item' && !dg.moved && dg.wasSelected && dg.under.length > 1) {
      const i = dg.under.indexOf(dg.id);
      st().select({ kind: 'item', id: dg.under[(i + 1) % dg.under.length] });
    }
  };

  // Drag & drop from the catalog.
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('text/kitchen-item')) {
      e.preventDefault();
      setDropGhost(toPlan(e.clientX, e.clientY));
    }
  };
  const onDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData('text/kitchen-item');
    setDropGhost(null);
    if (!type) return;
    e.preventDefault();
    const p = toPlan(e.clientX, e.clientY);
    const it = st().addItem(type, p);
    if (it) {
      const s = snapItem(it, room, items, { grid: settings.grid, threshold: 25 / view.scale, snapToWalls: getEntry(type).snapToWall, snapToItems: true });
      st().updateItem(it.id, { x: s.x, y: s.y, rotation: s.rotation }, false);
    }
  };

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.elevation + a.height / 2 - (b.elevation + b.height / 2)), [items]);
  const selItem = selection?.kind === 'item' ? items.find((i) => i.id === selection.id) : undefined;
  const k = 1 / view.scale; // one screen pixel in cm

  // Visible grid lines.
  const grid = useMemo(() => {
    const x0 = -view.tx / view.scale;
    const y0 = -view.ty / view.scale;
    const x1 = x0 + size.w / view.scale;
    const y1 = y0 + size.h / view.scale;
    const minor = settings.grid * view.scale >= 7 ? settings.grid : settings.grid * 2 * view.scale >= 7 ? settings.grid * 2 : 0;
    const lines: { d: string; major: boolean }[] = [];
    const build = (step: number, major: boolean) => {
      let d = '';
      for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) d += `M${x} ${y0}V${y1}`;
      for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) d += `M${x0} ${y}H${x1}`;
      lines.push({ d, major });
    };
    if (minor && minor < 100) build(minor, false);
    build(100, true);
    return lines;
  }, [view, size, settings.grid]);

  const cursor = tool === 'draw' ? 'crosshair' : spaceDown ? 'grab' : 'default';

  return (
    <div ref={wrapRef} className="plan-wrap" onDragOver={onDragOver} onDragLeave={() => setDropGhost(null)} onDrop={onDrop}>
      <svg
        ref={svgRef}
        className="plan-svg"
        width={size.w}
        height={size.h}
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => tool === 'draw' && !drag.current && setHover(null)}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => {
          if (tool === 'draw' && draft.length >= 3) {
            st().setProject({ ...project, room: { ...room, points: draft, closed: true }, openings: [] });
          }
        }}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {grid.map((g, i) => (
            <path key={i} d={g.d} stroke={g.major ? 'var(--grid-major)' : 'var(--grid-minor)'} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" />
          ))}

          {room.closed && room.points.length >= 3 && <path d={pathOf(room.points)} fill="var(--floor)" />}

          {/* Walls */}
          {room.closed && outer.length >= 3 ? (
            <path d={pathOf(outer) + pathOf([...room.points].reverse())} fill="var(--wall)" fillRule="evenodd" />
          ) : (
            room.points.length > 1 && <path d={pathOf(room.points, false)} stroke="var(--wall)" strokeWidth={room.wallThickness} fill="none" strokeLinejoin="miter" />
          )}
          {tool === 'select' &&
            walls.map((w) => {
              const sel = selection?.kind === 'wall' && selection.index === w.index;
              const o = mul(w.out, room.wallThickness);
              return (
                <path
                  key={`w${w.index}`}
                  data-kind="wall"
                  data-index={w.index}
                  d={pathOf([w.a, w.b, add(w.b, o), add(w.a, o)])}
                  fill={sel ? 'var(--accent)' : 'transparent'}
                  opacity={sel ? 0.55 : 1}
                  style={{ cursor: 'move' }}
                />
              );
            })}

          {/* Openings */}
          {openings.map((op) => (
            <OpeningSymbol key={op.id} op={op} walls={walls} thickness={room.wallThickness} selected={selection?.kind === 'opening' && selection.id === op.id} k={k} />
          ))}

          {/* Items */}
          {sortedItems.map((it) => (
            <g key={it.id} transform={`translate(${it.x} ${it.y}) rotate(${it.rotation})`} style={{ cursor: tool === 'select' ? 'move' : undefined }}>
              <PlanSymbol item={it} scale={view.scale} selected={it.id === selItem?.id} />
            </g>
          ))}

          {/* Wall dimensions */}
          {settings.showDims && room.points.length > 1 && walls.map((w) => <WallDim key={`d${w.index}`} w={w} off={room.wallThickness + 22 * k} k={k} />)}

          {/* Selected item: dimensions and clearances */}
          {selItem && settings.showDims && (
            <g pointerEvents="none">
              {clearances(selItem, room).map((c, i) => (
                <DimLine key={i} a={c.from} b={c.to} k={k} color="var(--accent-2)" label={`${fmtCm(c.d)}`} dashed />
              ))}
            </g>
          )}
          {selItem && tool === 'select' && <RotateHandle it={selItem} k={k} />}

          {/* Room vertices */}
          {tool === 'select' &&
            room.points.map((p, i) => {
              const sel = selection?.kind === 'vertex' && selection.index === i;
              return (
                <circle
                  key={`v${i}`}
                  data-kind="vertex"
                  data-index={i}
                  cx={p.x}
                  cy={p.y}
                  r={(sel ? 7 : 5.5) * k}
                  fill={sel ? 'var(--accent)' : '#fff'}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: 'grab' }}
                />
              );
            })}
          {tool === 'select' && selection?.kind === 'wall' && walls[selection.index] && (
            <g data-kind="split" data-index={selection.index} style={{ cursor: 'copy' }}>
              {(() => {
                const w = walls[selection.index];
                const m = add(mul(add(w.a, w.b), 0.5), mul(w.out, room.wallThickness / 2));
                return (
                  <>
                    <circle cx={m.x} cy={m.y} r={9 * k} fill="var(--accent)" stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                    <path d={`M${m.x - 4 * k} ${m.y}H${m.x + 4 * k}M${m.x} ${m.y - 4 * k}V${m.y + 4 * k}`} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  </>
                );
              })()}
            </g>
          )}

          {dropGhost && (
            <circle cx={dropGhost.x} cy={dropGhost.y} r={6 * k} fill="var(--accent)" opacity={0.6} pointerEvents="none" />
          )}

          {/* Drawing */}
          {tool === 'draw' && <DraftLayer draft={draft} hover={hover} k={k} />}
        </g>
      </svg>
      <div className="plan-scale">
        <div className="plan-scale-bar" style={{ width: 100 * view.scale > 160 ? 50 * view.scale : 100 * view.scale }} />
        <span>{100 * view.scale > 160 ? '50 cm' : '1 m'}</span>
      </div>
    </div>
  );
}

const round = (p: Vec2) => v(round1(p.x), round1(p.y));

function RotateHandle({ it, k }: { it: Item; k: number }) {
  const back = add(v(it.x, it.y), rotate(v(0, -it.depth / 2 - 22 * k), it.rotation));
  const edge = add(v(it.x, it.y), rotate(v(0, -it.depth / 2), it.rotation));
  return (
    <g>
      <line x1={edge.x} y1={edge.y} x2={back.x} y2={back.y} stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
      <g data-kind="rotate" data-id={it.id} style={{ cursor: 'grab' }}>
        <circle cx={back.x} cy={back.y} r={14 * k} fill="transparent" />
        <circle cx={back.x} cy={back.y} r={7.5 * k} fill="#fff" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <path
          d={`M${back.x - 3.5 * k} ${back.y - 1 * k}a${3.5 * k} ${3.5 * k} 0 1 1 ${1 * k} ${3.2 * k}`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </g>
  );
}

function WallDim({ w, off, k }: { w: ReturnType<typeof getWalls>[number]; off: number; k: number }) {
  const a = add(w.a, mul(w.out, off));
  const b = add(w.b, mul(w.out, off));
  return <DimLine a={a} b={b} k={k} label={fmtCm(w.length)} ticks color="var(--dim)" />;
}

function DimLine({ a, b, k, label, color, dashed, ticks }: { a: Vec2; b: Vec2; k: number; label: string; color: string; dashed?: boolean; ticks?: boolean }) {
  const l = dist(a, b);
  if (l < 1) return null;
  const d = mul(sub(b, a), 1 / l);
  const n = v(-d.y, d.x);
  let ang = rad2deg(Math.atan2(d.y, d.x));
  if (ang > 90 || ang <= -90) ang += 180;
  const m = mul(add(a, b), 0.5);
  const fs = 11 * k;
  const tw = label.length * fs * 0.62 + 8 * k;
  const fits = l > tw + 6 * k;
  const t = 5 * k;
  return (
    <g pointerEvents="none">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray={dashed ? '4 3' : undefined} />
      {ticks && (
        <path
          d={`M${a.x + (n.x - d.x) * t} ${a.y + (n.y - d.y) * t}L${a.x - (n.x - d.x) * t} ${a.y - (n.y - d.y) * t}M${b.x + (n.x - d.x) * t} ${b.y + (n.y - d.y) * t}L${b.x - (n.x - d.x) * t} ${b.y - (n.y - d.y) * t}`}
          stroke={color}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {(fits || !dashed) && (
        <g transform={`translate(${m.x} ${m.y}) rotate(${ang})`}>
          <rect x={-tw / 2} y={-fs * 0.75} width={tw} height={fs * 1.5} rx={3 * k} fill="var(--label-bg)" />
          <text y={fs * 0.36} fontSize={fs} textAnchor="middle" fill={color} fontWeight={600}>
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function DraftLayer({ draft, hover, k }: { draft: Vec2[]; hover: { point: Vec2; guides: { a: Vec2; b: Vec2 }[]; closing: boolean } | null; k: number }) {
  const last = draft[draft.length - 1];
  const p = hover?.point;
  return (
    <g pointerEvents="none">
      {draft.length > 1 && <path d={pathOf(draft, false)} stroke="var(--wall)" strokeWidth={4} vectorEffect="non-scaling-stroke" fill="none" />}
      {draft.slice(1).map((pt, i) => (
        <DimLine key={i} a={draft[i]} b={pt} k={k} label={fmtCm(dist(draft[i], pt))} color="var(--dim)" />
      ))}
      {hover?.guides.map((g, i) => (
        <line key={i} x1={g.a.x} y1={g.a.y} x2={g.b.x} y2={g.b.y} stroke="var(--accent-2)" strokeDasharray="5 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {last && p && (
        <>
          <line x1={last.x} y1={last.y} x2={p.x} y2={p.y} stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeDasharray="8 5" />
          <DimLine a={last} b={p} k={k} label={`${fmtCm(dist(last, p))} cm`} color="var(--accent)" />
        </>
      )}
      {draft.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={(i === 0 && hover?.closing ? 9 : 4.5) * k} fill={i === 0 ? 'var(--accent)' : '#fff'} stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
      {p && (
        <g>
          <circle cx={p.x} cy={p.y} r={5 * k} fill="var(--accent)" />
          <path d={`M${p.x - 14 * k} ${p.y}H${p.x + 14 * k}M${p.x} ${p.y - 14 * k}V${p.y + 14 * k}`} stroke="var(--accent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  );
}

function OpeningSymbol({ op, walls, thickness, selected, k }: { op: Opening; walls: ReturnType<typeof getWalls>; thickness: number; selected: boolean; k: number }) {
  const w = walls[op.wallIndex];
  if (!w) return null;
  const c = add(w.a, mul(w.dir, op.offset));
  const hw = op.width / 2;
  const a = add(c, mul(w.dir, -hw));
  const b = add(c, mul(w.dir, hw));
  const o = mul(w.out, thickness);
  const stroke = selected ? 'var(--accent)' : '#2f343b';
  const els: React.ReactNode[] = [];
  const ext = op.kind === 'door-ext';
  if (op.kind === 'door' || ext) {
    const hinge = op.flip ? b : a;
    const closed = op.flip ? a : b;
    const side = op.swingOut ? add(w.out, v(0, 0)) : w.in;
    const base = op.swingOut ? add(hinge, o) : hinge;
    const closedPt = op.swingOut ? add(closed, o) : closed;
    const open = add(base, mul(side, op.width));
    const sweep = cross2(sub(closedPt, base), sub(open, base)) > 0 ? 1 : 0;
    els.push(<line key="leaf" x1={base.x} y1={base.y} x2={open.x} y2={open.y} stroke={stroke} strokeWidth={ext ? 4.5 : 2} vectorEffect="non-scaling-stroke" />);
    if (ext) {
      // Exterior doors get a threshold on the outer face of the wall.
      const t1 = add(a, o);
      const t2 = add(b, o);
      els.push(<line key="sill" x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke={stroke} strokeWidth={3.5} vectorEffect="non-scaling-stroke" />);
    }
    els.push(
      <path key="arc" d={`M${open.x} ${open.y}A${op.width} ${op.width} 0 0 ${sweep} ${closedPt.x} ${closedPt.y}`} fill="none" stroke={stroke} strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />,
    );
  } else if (op.kind === 'window') {
    [0.35, 0.65].forEach((f) => {
      const p1 = add(a, mul(o, f));
      const p2 = add(b, mul(o, f));
      els.push(<line key={f} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    });
  }
  return (
    <g data-kind="opening" data-id={op.id} style={{ cursor: 'move' }}>
      <path d={pathOf([a, b, add(b, o), add(a, o)])} fill={op.kind === 'window' ? '#dfeaf2' : 'var(--floor)'} stroke={stroke} strokeWidth={selected ? 2 : 1} vectorEffect="non-scaling-stroke" />
      {els}
      <path d={pathOf([a, b, add(b, o), add(a, o)])} fill="transparent" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" />
      {selected && (
        <g pointerEvents="none">
          {[
            [w.a, a],
            [a, b],
            [b, w.b],
          ].map(([p1, p2], i) => {
            const off = mul(w.in, 26 * k);
            return <DimLine key={i} a={add(p1, off)} b={add(p2, off)} k={k} ticks label={fmtCm(dist(p1, p2))} color={i === 1 ? 'var(--accent)' : 'var(--accent-2)'} />;
          })}
        </g>
      )}
    </g>
  );
}

const cross2 = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
