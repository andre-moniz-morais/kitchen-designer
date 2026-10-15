import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEntry } from '../catalog';
import {
  add,
  clearances,
  dist,
  dot,
  faceAt,
  fitOpening,
  fmtCm,
  getWalls,
  hostOf,
  interiorHost,
  mul,
  normAngle,
  outerPolygon,
  pointInItem,
  polygonArea,
  projectBounds,
  projectOnSegment,
  rad2deg,
  roomFaces,
  rotate,
  round1,
  snap,
  snapDrawPoint,
  snapItem,
  snapWallPoint,
  snapWalls,
  sub,
  v,
  wallAnchors,
  wallHosts,
  wallLines,
  type WallHost,
} from '../geometry';
import { endsAt, fixOpeningsAfterSplit, useStore } from '../store';
import type { InteriorWall, Item, Opening, Vec2, Zone } from '../types';
import { ZONE_KINDS } from '../zones';
import { PlanSymbol } from './PlanSymbol';

interface View {
  tx: number;
  ty: number;
  scale: number;
}

type End = { id: string; end: 'a' | 'b' };

type Drag =
  | { kind: 'pan'; start: Vec2; view: View; moved: boolean }
  | { kind: 'item'; id: string; start: Vec2; orig: Vec2; moved: boolean; wasSelected: boolean; under: string[] }
  | { kind: 'rotate'; id: string; moved: boolean }
  | { kind: 'vertex'; index: number; moved: boolean }
  | { kind: 'wall'; index: number; start: Vec2; a: Vec2; b: Vec2; moved: boolean }
  | { kind: 'opening'; id: string; moved: boolean }
  | { kind: 'draw'; start: Vec2; view: View; moved: boolean }
  | { kind: 'iwall-end'; ends: End[]; other: Vec2; moved: boolean }
  | { kind: 'iwall'; id: string; start: Vec2; a: Vec2; b: Vec2; endsA: End[]; endsB: End[]; moved: boolean }
  | { kind: 'zone'; id: string; start: Vec2; orig: Vec2; moved: boolean };

interface Hover {
  point: Vec2;
  guides: { a: Vec2; b: Vec2 }[];
  closing: boolean;
  onWall?: boolean;
}

const pathOf = (pts: Vec2[], close = true) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('') + (close ? 'Z' : '');

/** Outline of an interior wall (extended by half its thickness at each end so corners close). */
function iwallPoly(w: InteriorWall): Vec2[] {
  const h = interiorHost(w);
  const e = mul(h.dir, w.thickness / 2);
  const n = mul(h.out, w.thickness / 2);
  const a = sub(w.a, e);
  const b = add(w.b, e);
  return [add(a, n), add(b, n), sub(b, n), sub(a, n)];
}

export function PlanEditor() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const draft = useStore((s) => s.draft);
  const settings = useStore((s) => s.settings);
  const fitToken = useStore((s) => s.fitToken);
  const { room, items, openings } = project;
  const iwalls = useMemo(() => project.interiorWalls ?? [], [project.interiorWalls]);
  const zones = project.zones ?? [];

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ tx: 60, ty: 60, scale: 1.5 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Vec2>());
  const pinch = useRef<{ d: number; mid: Vec2; view: View } | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [dropGhost, setDropGhost] = useState<Vec2 | null>(null);

  const walls = useMemo(() => getWalls(room), [room]);
  const outer = useMemo(() => outerPolygon(room), [room]);
  const hosts = useMemo(() => wallHosts({ room, interiorWalls: iwalls }), [room, iwalls]);
  const faceWalls = useMemo(() => snapWalls({ room, interiorWalls: iwalls }), [room, iwalls]);
  const faces = useMemo(() => roomFaces({ room, interiorWalls: iwalls }), [room, iwalls]);

  // Track container size.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitView = useCallback(() => {
    const b = projectBounds(useStore.getState().project);
    const pad = room.wallThickness + 70;
    const bw = b.maxX - b.minX + pad * 2;
    const bh = b.maxY - b.minY + pad * 2;
    const scale = Math.max(0.15, Math.min(8, Math.min(size.w / bw, size.h / bh)));
    setView({ scale, tx: size.w / 2 - ((b.minX + b.maxX) / 2) * scale, ty: size.h / 2 - ((b.minY + b.maxY) / 2) * scale });
  }, [size.w, size.h, room.wallThickness]);

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

  // Leaving a drawing tool clears its preview.
  useEffect(() => setHover(null), [tool]);

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
      const scale = Math.max(0.1, Math.min(12, vw.scale * k));
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

  const drawSnap = (p: Vec2, e: { shiftKey: boolean }): Hover =>
    snapDrawPoint(p, draft, { grid: snapOn(e) ? settings.grid : 0, ortho: settings.ortho && !e.shiftKey, threshold: snapOn(e) ? threshold : 0 });

  const wallSnap = (p: Vec2, e: { shiftKey: boolean }, last: Vec2 | undefined, exclude?: { ends: Set<string>; walls: Set<string> }): Hover => {
    const r = snapWallPoint(p, last, wallAnchors({ room, interiorWalls: iwalls }, exclude?.ends), wallLines({ room, interiorWalls: iwalls }, exclude?.walls), {
      grid: snapOn(e) ? settings.grid : 0,
      ortho: settings.ortho && !e.shiftKey,
      threshold: snapOn(e) ? threshold : 0,
    });
    return { ...r, closing: false };
  };

  const st = useStore.getState;

  const onPointerDown = (e: React.PointerEvent) => {
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
    if (tool === 'draw' || tool === 'wall') {
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
    if (kind === 'iwall-end') {
      const w = iwalls.find((x) => x.id === t!.dataset.id);
      if (!w) return;
      const end = t!.dataset.end as 'a' | 'b';
      drag.current = { kind: 'iwall-end', ends: endsAt(w[end], iwalls), other: end === 'a' ? w.b : w.a, moved: false };
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
    if (kind === 'zone') {
      const z = zones.find((x) => x.id === t!.dataset.id);
      if (!z) return;
      st().select({ kind: 'zone', id: z.id });
      drag.current = { kind: 'zone', id: z.id, start: p, orig: v(z.x, z.y), moved: false };
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
    if (kind === 'iwall') {
      const w = iwalls.find((x) => x.id === t!.dataset.id);
      if (!w) return;
      st().select({ kind: 'iwall', id: w.id });
      const others = iwalls.filter((x) => x.id !== w.id);
      drag.current = { kind: 'iwall', id: w.id, start: p, a: w.a, b: w.b, endsA: endsAt(w.a, others), endsB: endsAt(w.b, others), moved: false };
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
      const scale = Math.max(0.1, Math.min(12, (pv.scale * d) / pinch.current.d));
      const m0 = v(pinch.current.mid.x - r.left, pinch.current.mid.y - r.top);
      const planMid = v((m0.x - pv.tx) / pv.scale, (m0.y - pv.ty) / pv.scale);
      setView({ scale, tx: mid.x - r.left - planMid.x * scale, ty: mid.y - r.top - planMid.y * scale });
      return;
    }
    const p = toPlan(e.clientX, e.clientY);
    const dg = drag.current;
    if (!dg || !dg.moved) {
      if (tool === 'draw') setHover(drawSnap(p, e));
      else if (tool === 'wall') setHover(wallSnap(p, e, draft[draft.length - 1]));
    }
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
      if ((dg.kind === 'item' || dg.kind === 'iwall' || dg.kind === 'zone') && dist(p, dg.start) * viewRef.current.scale < 3) return;
      dg.moved = true;
      st().checkpoint();
    }
    if (dg.kind === 'item') {
      const it = items.find((i) => i.id === dg.id);
      if (!it) return;
      const moved = { ...it, x: dg.orig.x + p.x - dg.start.x, y: dg.orig.y + p.y - dg.start.y };
      if (snapOn(e)) {
        const s = snapItem(moved, faceWalls, items, { grid: settings.grid, threshold, snapToWalls: getEntry(it.type).snapToWall, snapToItems: true });
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
    } else if (dg.kind === 'iwall-end') {
      const exclude = { ends: new Set(dg.ends.map((x) => `${x.id}:${x.end}`)), walls: new Set(dg.ends.map((x) => x.id)) };
      const q = wallSnap(p, e, dg.other, exclude).point;
      st().moveWallEnds(dg.ends.map((x) => ({ ...x, to: q })));
    } else if (dg.kind === 'iwall') {
      const w = iwalls.find((x) => x.id === dg.id);
      if (!w) return;
      const nrm = interiorHost({ ...w, a: dg.a, b: dg.b }).out;
      let k = dot(sub(p, dg.start), nrm);
      if (snapOn(e)) k = snap(k, settings.grid);
      const a = round(add(dg.a, mul(nrm, k)));
      const b = round(add(dg.b, mul(nrm, k)));
      // Walls joined at either end stretch to follow.
      st().moveWallEnds([{ id: w.id, end: 'a', to: a }, { id: w.id, end: 'b', to: b }, ...dg.endsA.map((x) => ({ ...x, to: a })), ...dg.endsB.map((x) => ({ ...x, to: b }))]);
    } else if (dg.kind === 'zone') {
      st().updateZone(dg.id, { x: round1(dg.orig.x + p.x - dg.start.x), y: round1(dg.orig.y + p.y - dg.start.y) }, false);
    } else if (dg.kind === 'opening') {
      const op = openings.find((o) => o.id === dg.id);
      if (!op) return;
      let best: { d: number; host: WallHost | null; t: number } = { d: Infinity, host: null, t: 0 };
      for (const h of hosts) {
        const pr = projectOnSegment(p, h.a, h.b);
        if (pr.distance < best.d) best = { d: pr.distance, host: h, t: pr.t };
      }
      if (!best.host) return;
      let offset = best.t * best.host.length;
      if (snapOn(e)) offset = snap(offset, settings.grid);
      // Openings stay on a wall and never overlap each other; if it doesn't fit there, it stays put.
      const fitted = fitOpening(op, offset, best.host.key, best.host.length, openings);
      if (fitted !== null) st().updateOpening(op.id, { wallIndex: best.host.outerIndex ?? 0, interiorWallId: best.host.interiorId, offset: fitted }, false);
    }
  };

  const finishOutline = () => {
    st().setProject({ ...project, room: { ...room, points: draft, closed: true }, openings: openings.filter((o) => o.interiorWallId) });
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
      if (tool === 'draw') {
        const h = drawSnap(p, e);
        if (h.closing) {
          finishOutline();
          setHover(null);
        } else {
          const last = draft[draft.length - 1];
          if (!last || dist(last, h.point) > 1) st().setDraft([...draft, h.point]);
        }
      } else if (tool === 'wall') {
        const last = draft[draft.length - 1];
        const h = wallSnap(p, e, last);
        if (!last) st().setDraft([h.point]);
        else if (dist(last, h.point) > 1) {
          st().addInteriorWall(last, h.point);
          // Reaching an existing wall ends the chain; otherwise keep drawing from here.
          st().setDraft(h.onWall ? [] : [h.point]);
        }
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
      const s = snapItem(it, faceWalls, items, { grid: settings.grid, threshold: 25 / view.scale, snapToWalls: getEntry(type).snapToWall, snapToItems: true });
      st().updateItem(it.id, { x: s.x, y: s.y, rotation: s.rotation }, false);
    }
  };

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.elevation + a.height / 2 - (b.elevation + b.height / 2)), [items]);
  const selItem = selection?.kind === 'item' ? items.find((i) => i.id === selection.id) : undefined;
  const selWall = selection?.kind === 'iwall' ? iwalls.find((w) => w.id === selection.id) : undefined;
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

  const drawing = tool === 'draw' || tool === 'wall';
  const cursor = drawing ? 'crosshair' : spaceDown ? 'grab' : 'default';

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
        onPointerLeave={() => drawing && !drag.current && setHover(null)}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => {
          if (tool === 'draw' && draft.length >= 3) finishOutline();
          if (tool === 'wall') st().setDraft([]);
        }}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {grid.map((g, i) => (
            <path key={i} d={g.d} stroke={g.major ? 'var(--grid-major)' : 'var(--grid-minor)'} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" />
          ))}

          {room.closed && room.points.length >= 3 && <path d={pathOf(room.points)} fill="var(--floor)" />}

          {/* Room tints for labelled spaces. */}
          {zones.map((z) => {
            const f = faceAt(v(z.x, z.y), faces);
            return f ? <path key={`t${z.id}`} d={pathOf(f)} fill={ZONE_KINDS[z.kind]?.tint ?? '#eee'} opacity={0.75} pointerEvents="none" /> : null;
          })}

          {/* Outer walls */}
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

          {/* Interior walls */}
          {iwalls.map((w) =>
            dist(w.a, w.b) < 1 ? null : (
              <path
                key={w.id}
                data-kind={tool === 'select' ? 'iwall' : undefined}
                data-id={w.id}
                d={pathOf(iwallPoly(w))}
                fill={selWall?.id === w.id ? 'var(--accent)' : w.height ? '#6b7079' : 'var(--wall)'}
                style={{ cursor: tool === 'select' ? 'move' : undefined }}
              />
            ),
          )}

          {/* Openings */}
          {openings.map((op) => (
            <OpeningSymbol key={op.id} op={op} host={hostOf(op, hosts)} selected={selection?.kind === 'opening' && selection.id === op.id} k={k} />
          ))}

          {/* Items */}
          {sortedItems.map((it) => (
            <g key={it.id} transform={`translate(${it.x} ${it.y}) rotate(${it.rotation})`} style={{ cursor: tool === 'select' ? 'move' : undefined }}>
              <PlanSymbol item={it} scale={view.scale} selected={it.id === selItem?.id} />
            </g>
          ))}

          {/* Wall dimensions */}
          {settings.showDims && room.points.length > 1 && walls.map((w) => <WallDim key={`d${w.index}`} w={w} off={room.wallThickness + 22 * k} k={k} />)}
          {settings.showDims &&
            iwalls.map((w) => {
              if (dist(w.a, w.b) < 20) return null;
              const h = interiorHost(w);
              const off = mul(h.out, w.thickness / 2 + 12 * k);
              return <DimLine key={`dw${w.id}`} a={add(w.a, off)} b={add(w.b, off)} k={k} label={fmtCm(h.length)} color="var(--dim)" />;
            })}

          {/* Selected item: dimensions and clearances */}
          {selItem && settings.showDims && (
            <g pointerEvents="none">
              {clearances(selItem, faceWalls).map((c, i) => (
                <DimLine key={i} a={c.from} b={c.to} k={k} color="var(--accent-2)" label={`${fmtCm(c.d)}`} dashed />
              ))}
            </g>
          )}
          {selItem && tool === 'select' && <RotateHandle it={selItem} k={k} />}

          {/* Room labels */}
          {zones.map((z) => (
            <ZoneLabel key={z.id} z={z} faces={faces} k={k} selected={selection?.kind === 'zone' && selection.id === z.id} />
          ))}

          {/* Outer corners */}
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
          {/* Ends of the selected interior wall */}
          {tool === 'select' &&
            selWall &&
            (['a', 'b'] as const).map((end) => (
              <g key={end} data-kind="iwall-end" data-id={selWall.id} data-end={end} style={{ cursor: 'grab' }}>
                <circle cx={selWall[end].x} cy={selWall[end].y} r={14 * k} fill="transparent" />
                <circle cx={selWall[end].x} cy={selWall[end].y} r={6.5 * k} fill="#fff" stroke="var(--accent)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
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

          {dropGhost && <circle cx={dropGhost.x} cy={dropGhost.y} r={6 * k} fill="var(--accent)" opacity={0.6} pointerEvents="none" />}

          {/* Drawing */}
          {tool === 'draw' && <DraftLayer draft={draft} hover={hover} k={k} />}
          {tool === 'wall' && <WallDraftLayer start={draft[draft.length - 1]} hover={hover} k={k} thickness={settings.iwallThickness ?? 10} anchors={wallAnchors({ room, interiorWalls: iwalls })} />}
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

function ZoneLabel({ z, faces, k, selected }: { z: Zone; faces: Vec2[][]; k: number; selected: boolean }) {
  const f = faceAt(v(z.x, z.y), faces);
  const area = f ? Math.abs(polygonArea(f)) / 10000 : null;
  const fs = 13 * k;
  const name = z.name || ZONE_KINDS[z.kind]?.label || 'Divisão';
  const sub2 = area !== null ? `${area.toFixed(1).replace('.', ',')} m²` : 'fora de uma divisão fechada';
  const w = Math.max(name.length * fs * 0.6, sub2.length * fs * 0.48) + 16 * k;
  return (
    <g data-kind="zone" data-id={z.id} transform={`translate(${z.x} ${z.y})`} style={{ cursor: 'move' }}>
      <rect x={-w / 2} y={-fs * 1.25} width={w} height={fs * 2.6} rx={5 * k} fill="var(--label-bg)" stroke={selected ? 'var(--accent)' : 'rgba(0,0,0,0.12)'} strokeWidth={selected ? 2 : 1} vectorEffect="non-scaling-stroke" />
      <text y={-fs * 0.1} fontSize={fs} textAnchor="middle" fontWeight={700} fill="#2b2f36">
        {name}
      </text>
      <text y={fs * 1.05} fontSize={fs * 0.82} textAnchor="middle" fill={area !== null ? '#5b616b' : '#b3541e'}>
        {sub2}
      </text>
    </g>
  );
}

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

function DraftLayer({ draft, hover, k }: { draft: Vec2[]; hover: Hover | null; k: number }) {
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
      {p && <Crosshair p={p} k={k} />}
    </g>
  );
}

function Crosshair({ p, k, ring }: { p: Vec2; k: number; ring?: boolean }) {
  return (
    <g>
      {ring && <circle cx={p.x} cy={p.y} r={10 * k} fill="none" stroke="var(--accent-2)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      <circle cx={p.x} cy={p.y} r={5 * k} fill={ring ? 'var(--accent-2)' : 'var(--accent)'} />
      <path d={`M${p.x - 14 * k} ${p.y}H${p.x + 14 * k}M${p.x} ${p.y - 14 * k}V${p.y + 14 * k}`} stroke="var(--accent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

/** Preview while drawing interior walls: attach points, the wall being drawn and its length. */
function WallDraftLayer({ start, hover, k, thickness, anchors }: { start: Vec2 | undefined; hover: Hover | null; k: number; thickness: number; anchors: Vec2[] }) {
  const p = hover?.point;
  return (
    <g pointerEvents="none">
      {anchors.map((a, i) => (
        <circle key={i} cx={a.x} cy={a.y} r={3 * k} fill="var(--accent-2)" opacity={0.55} />
      ))}
      {hover?.guides.map((g, i) => (
        <line key={i} x1={g.a.x} y1={g.a.y} x2={g.b.x} y2={g.b.y} stroke="var(--accent-2)" strokeDasharray="5 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {start && p && dist(start, p) > 0.5 && (
        <>
          <line x1={start.x} y1={start.y} x2={p.x} y2={p.y} stroke="var(--accent)" strokeOpacity={0.45} strokeWidth={thickness} strokeLinecap="square" />
          <line x1={start.x} y1={start.y} x2={p.x} y2={p.y} stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="6 4" />
          <DimLine a={start} b={p} k={k} label={`${fmtCm(dist(start, p))} cm`} color="var(--accent)" />
        </>
      )}
      {start && <circle cx={start.x} cy={start.y} r={5 * k} fill="#fff" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      {p && <Crosshair p={p} k={k} ring={hover?.onWall} />}
    </g>
  );
}

function OpeningSymbol({ op, host: w, selected, k }: { op: Opening; host: WallHost | undefined; selected: boolean; k: number }) {
  if (!w) return null;
  const c = add(w.base, mul(w.dir, op.offset));
  const hw = op.width / 2;
  const a = add(c, mul(w.dir, -hw));
  const b = add(c, mul(w.dir, hw));
  const o = mul(w.out, w.thickness);
  const stroke = selected ? 'var(--accent)' : '#2f343b';
  const els: React.ReactNode[] = [];
  const ext = op.kind === 'door-ext';
  if (op.kind === 'door' || ext) {
    const hinge = op.flip ? b : a;
    const closed = op.flip ? a : b;
    const side = op.swingOut ? w.out : w.in;
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
  const end = add(w.base, mul(w.dir, w.length));
  return (
    <g data-kind="opening" data-id={op.id} style={{ cursor: 'move' }}>
      <path d={pathOf([a, b, add(b, o), add(a, o)])} fill={op.kind === 'window' ? '#dfeaf2' : 'var(--floor)'} stroke={stroke} strokeWidth={selected ? 2 : 1} vectorEffect="non-scaling-stroke" />
      {els}
      <path d={pathOf([a, b, add(b, o), add(a, o)])} fill="transparent" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" />
      {selected && (
        <g pointerEvents="none">
          {[
            [w.base, a],
            [a, b],
            [b, end],
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
