import type { InteriorWall, Item, Opening, Project, Room, Vec2, Zone } from './types';

export const v = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
export const len = (a: Vec2) => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: Vec2): Vec2 => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const snap = (x: number, step: number) => (step > 0 ? Math.round(x / step) * step : x);
export const normAngle = (deg: number) => ((Math.round(deg * 1000) / 1000) % 360 + 360) % 360;

/** Rotate a local vector by `deg` (clockwise on screen, since y grows down). */
export function rotate(p: Vec2, deg: number): Vec2 {
  const r = deg2rad(deg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function polygonArea(pts: Vec2[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pointInPolygon(p: Vec2, pts: Vec2[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export interface Wall {
  index: number;
  a: Vec2;
  b: Vec2;
  dir: Vec2;
  /** Unit normal pointing out of the room. */
  out: Vec2;
  /** Unit normal pointing into the room. */
  in: Vec2;
  length: number;
  /** Plan angle of the wall direction in degrees. */
  angle: number;
}

export function getWalls(room: Room): Wall[] {
  const pts = room.points;
  if (pts.length < 2) return [];
  const n = room.closed ? pts.length : pts.length - 1;
  // Sign of the area tells us on which side of each edge the interior lies.
  const ccw = polygonArea(pts) > 0;
  const walls: Wall[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const d = norm(sub(b, a));
    // With y down, positive area means clockwise on screen; interior is to the right of d → (-d.y, d.x).
    let inn = ccw ? v(-d.y, d.x) : v(d.y, -d.x);
    if (!room.closed) inn = v(-d.y, d.x);
    walls.push({
      index: i,
      a,
      b,
      dir: d,
      in: inn,
      out: mul(inn, -1),
      length: dist(a, b),
      angle: rad2deg(Math.atan2(d.y, d.x)),
    });
  }
  return walls;
}

/** Outer outline of the walls (inner polygon offset outwards by the wall thickness, mitred). */
export function outerPolygon(room: Room): Vec2[] {
  const walls = getWalls(room);
  const t = room.wallThickness;
  const pts = room.points;
  if (!room.closed || walls.length < 3) return [];
  return pts.map((p, i) => {
    const w1 = walls[(i - 1 + walls.length) % walls.length];
    const w2 = walls[i];
    return miter(p, w1.out, w2.out, t);
  });
}

export function miter(p: Vec2, n1: Vec2, n2: Vec2, t: number): Vec2 {
  const k = 1 + dot(n1, n2);
  if (k < 0.15) return add(p, mul(norm(add(n1, n2)), t)); // extremely sharp corner
  return add(p, mul(add(n1, n2), t / k));
}

export function projectOnSegment(p: Vec2, a: Vec2, b: Vec2) {
  const ab = sub(b, a);
  const l2 = dot(ab, ab) || 1;
  const tRaw = dot(sub(p, a), ab) / l2;
  const t = clamp(tRaw, 0, 1);
  const point = add(a, mul(ab, t));
  return { t, tRaw, point, distance: dist(p, point) };
}

/** Ray (origin o, unit dir d) against segment a-b. Returns distance along the ray or null. */
export function raySegment(o: Vec2, d: Vec2, a: Vec2, b: Vec2): number | null {
  const e = sub(b, a);
  const den = cross(d, e);
  if (Math.abs(den) < 1e-9) return null;
  const ao = sub(a, o);
  const t = cross(ao, e) / den;
  const u = cross(ao, d) / den;
  if (t >= -1e-6 && u >= -1e-6 && u <= 1 + 1e-6) return t;
  return null;
}

export function itemCorners(it: Pick<Item, 'x' | 'y' | 'width' | 'depth' | 'rotation'>): Vec2[] {
  const hw = it.width / 2;
  const hd = it.depth / 2;
  return [v(-hw, -hd), v(hw, -hd), v(hw, hd), v(-hw, hd)].map((p) => add(rotate(p, it.rotation), v(it.x, it.y)));
}

/** Separating-axis overlap test for two rotated footprints (touching does not count). */
export function footprintsOverlap(a: Item, b: Item, tolerance = 0.5) {
  const ca = itemCorners(a);
  const cb = itemCorners(b);
  const axes = [rotate(v(1, 0), a.rotation), rotate(v(0, 1), a.rotation), rotate(v(1, 0), b.rotation), rotate(v(0, 1), b.rotation)];
  for (const ax of axes) {
    const pa = ca.map((p) => dot(p, ax));
    const pb = cb.map((p) => dot(p, ax));
    if (Math.max(...pa) - tolerance <= Math.min(...pb) || Math.max(...pb) - tolerance <= Math.min(...pa)) return false;
  }
  return true;
}

export function pointInItem(p: Vec2, it: Item, pad = 0) {
  const local = rotate(sub(p, v(it.x, it.y)), -it.rotation);
  return Math.abs(local.x) <= it.width / 2 + pad && Math.abs(local.y) <= it.depth / 2 + pad;
}

export function roomBounds(room: Room) {
  const pts = room.points.length ? room.points : [v(0, 0), v(400, 300)];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

export function roomCenter(room: Room): Vec2 {
  const b = roomBounds(room);
  return v((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2);
}

/** The item directly below `it` (overlapping footprint, top at or below its bottom), if any. */
export function itemBelow(it: Item, items: Item[]): Item | null {
  let best: Item | null = null;
  for (const o of items) {
    if (o.id === it.id) continue;
    const top = o.elevation + o.height;
    if (top > it.elevation + 0.5) continue;
    if (!footprintsOverlap(it, o)) continue;
    if (!best || top > best.elevation + best.height) best = o;
  }
  return best;
}

/** Highest top among items whose footprint overlaps `it` and whose centre is below its centre. */
export function stackElevation(it: Item, items: Item[]): number {
  let top = 0;
  const myMid = it.elevation + it.height / 2;
  for (const o of items) {
    if (o.id === it.id) continue;
    if (o.elevation + o.height / 2 >= myMid && it.elevation > 0.5) continue;
    if (!footprintsOverlap(it, o)) continue;
    top = Math.max(top, o.elevation + o.height);
  }
  return top;
}

export interface SnapOptions {
  grid: number;
  threshold: number;
  snapToWalls: boolean;
  snapToItems: boolean;
}

export interface SnapResult {
  x: number;
  y: number;
  rotation: number;
  wall: number | null;
}

/**
 * Snap a footprint that is being dragged: to the grid, against walls (back to the wall,
 * rotated to face the room, sides flush with neighbouring walls) and against other items.
 */
export function snapItem(it: Item, walls: Wall[], others: Item[], o: SnapOptions): SnapResult {
  let x = o.grid > 0 ? snap(it.x, o.grid) : it.x;
  let y = o.grid > 0 ? snap(it.y, o.grid) : it.y;
  let rotation = it.rotation;
  let wallIdx: number | null = null;

  if (o.snapToWalls && walls.length) {
    let best: { w: Wall; d: number } | null = null;
    const c = v(it.x, it.y);
    for (const w of walls) {
      const pr = projectOnSegment(c, w.a, w.b);
      if (pr.tRaw < -0.05 || pr.tRaw > 1.05) continue;
      const signed = dot(sub(c, w.a), w.in);
      if (signed < -o.threshold) continue;
      // Depth this item would expose if rotated to face this wall.
      const gap = Math.abs(signed - it.depth / 2);
      if (gap < o.threshold * 1.6 && (!best || gap < best.d)) best = { w, d: gap };
    }
    if (best) {
      const w = best.w;
      wallIdx = w.index;
      rotation = normAngle(rad2deg(Math.atan2(-w.in.x, w.in.y)));
      const along = dot(sub(v(x, y), w.a), w.dir);
      let pos = add(add(w.a, mul(w.dir, along)), mul(w.in, it.depth / 2));
      // Slide along the wall so the sides sit flush with neighbouring walls.
      const corners = itemCorners({ ...it, x: pos.x, y: pos.y, rotation });
      let shift = 0;
      for (const w2 of walls) {
        if (w2.index === w.index) continue;
        const k = dot(w.dir, w2.in);
        if (Math.abs(k) < 0.3) continue;
        const ds = corners.map((p) => dot(sub(p, w2.a), w2.in));
        const minD = Math.min(...ds);
        const corner = corners[ds.indexOf(minD)];
        const pr = projectOnSegment(corner, w2.a, w2.b);
        if (pr.tRaw < -0.1 || pr.tRaw > 1.1) continue;
        if (minD < o.threshold && minD > -it.width) {
          shift = -minD / k;
          break;
        }
      }
      pos = add(pos, mul(w.dir, shift));
      x = pos.x;
      y = pos.y;
    }
  }

  if (o.snapToItems) {
    const ax = rotate(v(1, 0), rotation);
    const ay = rotate(v(0, 1), rotation);
    let bestX: number | null = null;
    let bestY: number | null = null;
    for (const other of others) {
      if (other.id === it.id) continue;
      const rel = normAngle(other.rotation - rotation);
      const quarter = Math.round(rel / 90);
      if (Math.abs(rel - quarter * 90) > 0.5) continue;
      const swap = quarter % 2 === 1;
      const ow = swap ? other.depth : other.width;
      const od = swap ? other.width : other.depth;
      const d = sub(v(other.x, other.y), v(x, y));
      const lx = dot(d, ax);
      const ly = dot(d, ay);
      const hw = it.width / 2;
      const hd = it.depth / 2;
      const nearY = Math.abs(ly) < hd + od / 2 + o.threshold;
      const nearX = Math.abs(lx) < hw + ow / 2 + o.threshold;
      if (nearY) {
        for (const delta of [lx - ow / 2 - hw, lx + ow / 2 + hw, lx - ow / 2 + hw, lx + ow / 2 - hw]) {
          if (Math.abs(delta) < o.threshold && (bestX === null || Math.abs(delta) < Math.abs(bestX))) bestX = delta;
        }
      }
      if (nearX && wallIdx === null) {
        for (const delta of [ly - od / 2 - hd, ly + od / 2 + hd, ly - od / 2 + hd, ly + od / 2 - hd]) {
          if (Math.abs(delta) < o.threshold && (bestY === null || Math.abs(delta) < Math.abs(bestY))) bestY = delta;
        }
      }
    }
    if (bestX !== null) {
      x += ax.x * bestX;
      y += ax.y * bestX;
    }
    if (bestY !== null) {
      x += ay.x * bestY;
      y += ay.y * bestY;
    }
  }
  return { x: round1(x), y: round1(y), rotation, wall: wallIdx };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Distances from each side of the item to the nearest wall, measured along the item axes. */
export function clearances(it: Item, walls: Wall[]) {
  const res: { from: Vec2; to: Vec2; d: number }[] = [];
  const sides: [Vec2, Vec2][] = [
    [v(0, -it.depth / 2), v(0, -1)],
    [v(0, it.depth / 2), v(0, 1)],
    [v(-it.width / 2, 0), v(-1, 0)],
    [v(it.width / 2, 0), v(1, 0)],
  ];
  for (const [p, d] of sides) {
    const from = add(rotate(p, it.rotation), v(it.x, it.y));
    const dir = rotate(d, it.rotation);
    let best: number | null = null;
    for (const w of walls) {
      const t = raySegment(from, dir, w.a, w.b);
      if (t !== null && t > 0.5 && (best === null || t < best)) best = t;
    }
    if (best !== null && best < 2000) res.push({ from, to: add(from, mul(dir, best)), d: best });
  }
  return res;
}

/** Snap a point while drawing: grid, orthogonal to the previous point, and alignment with existing points. */
export function snapDrawPoint(
  p: Vec2,
  pts: Vec2[],
  o: { grid: number; ortho: boolean; threshold: number; close?: boolean },
): { point: Vec2; guides: { a: Vec2; b: Vec2 }[]; closing: boolean } {
  const guides: { a: Vec2; b: Vec2 }[] = [];
  if (o.close !== false && pts.length >= 3 && dist(p, pts[0]) < o.threshold * 1.5) return { point: pts[0], guides, closing: true };
  let q = o.grid > 0 ? v(snap(p.x, o.grid), snap(p.y, o.grid)) : { ...p };
  const last = pts[pts.length - 1];
  let lockedX = false;
  let lockedY = false;
  if (last && o.ortho) {
    const d = sub(p, last);
    const ang = Math.abs(rad2deg(Math.atan2(d.y, d.x))) % 180;
    if (ang < 8 || ang > 172) {
      q.y = last.y;
      lockedY = true;
    } else if (Math.abs(ang - 90) < 8) {
      q.x = last.x;
      lockedX = true;
    }
  }
  for (const r of pts) {
    if (r === last) continue;
    if (!lockedX && Math.abs(p.x - r.x) < o.threshold) {
      q.x = r.x;
      lockedX = true;
      guides.push({ a: r, b: q });
    }
    if (!lockedY && Math.abs(p.y - r.y) < o.threshold) {
      q.y = r.y;
      lockedY = true;
      guides.push({ a: r, b: q });
    }
  }
  q = v(round1(q.x), round1(q.y));
  // Re-anchor guides to the final point.
  return { point: q, guides: guides.map((g) => ({ a: g.a, b: q })), closing: false };
}

export function fmtCm(n: number) {
  return `${Math.round(n * 10) / 10}`.replace('.', ',');
}

const verticalOverlap = (a: Item, b: Item) => a.elevation < b.elevation + b.height - 0.5 && b.elevation < a.elevation + a.height - 0.5;

/** First free position against a wall (walls in order, left to right) for a wall-mounted item. */
export function findFreeWallSpot(it: Item, room: Room, items: Item[]): SnapResult | null {
  const walls = room.closed ? getWalls(room) : [];
  const others = items.filter((o) => o.id !== it.id && verticalOverlap(it, o));
  for (const w of walls) {
    if (w.length < it.width) continue;
    const rotation = normAngle(rad2deg(Math.atan2(-w.in.x, w.in.y)));
    for (let t = it.width / 2; t <= w.length - it.width / 2 + 0.01; t += 5) {
      const c = add(add(w.a, mul(w.dir, t)), mul(w.in, it.depth / 2));
      const cand = { ...it, x: c.x, y: c.y, rotation };
      if (!pointInPolygon(c, room.points)) continue;
      if (others.some((o) => footprintsOverlap(cand, o))) continue;
      // Stay clear of the other walls too (e.g. at a concave corner).
      if (itemCorners(cand).some((p) => walls.some((w2) => w2.index !== w.index && dot(sub(p, w2.a), w2.in) < -0.5 && projectOnSegment(p, w2.a, w2.b).distance < room.wallThickness))) continue;
      return { x: round1(c.x), y: round1(c.y), rotation, wall: w.index };
    }
  }
  return null;
}

/**
 * Clamp an opening's centre so it stays on its wall. Returns null when it would overlap
 * another opening on the same wall (with a 5 cm minimum pier between them).
 */
export function fitOpening(op: Opening, offset: number, wallKey: string, wallLength: number, all: Opening[], pier = 5): number | null {
  const half = op.width / 2;
  if (wallLength < op.width) return null;
  const c = clamp(offset, half, wallLength - half);
  for (const o of all) {
    if (o.id === op.id || hostKey(o) !== wallKey) continue;
    if (Math.abs(o.offset - c) < half + o.width / 2 + pier) return null;
  }
  return round1(c);
}

/* ------------------------------------------------------------------ */
/* Interior walls, wall hosts for openings, and room (face) detection */
/* ------------------------------------------------------------------ */

/** Identifies the wall an opening sits on: "o<index>" for outer walls, the interior wall id otherwise. */
export const hostKey = (op: Pick<Opening, 'wallIndex' | 'interiorWallId'>) => op.interiorWallId ?? `o${op.wallIndex}`;

/**
 * A wall that can hold doors and windows. Offsets run along `dir` from `base`; the wall's solid
 * part spans from `base` (one face) to `base + out * thickness` (the other face).
 */
export interface WallHost {
  key: string;
  outerIndex?: number;
  interiorId?: string;
  /** Reference line: inner face for outer walls, centreline for interior walls. */
  a: Vec2;
  b: Vec2;
  base: Vec2;
  dir: Vec2;
  out: Vec2;
  in: Vec2;
  length: number;
  thickness: number;
  /** Height of the wall; undefined = full room height. */
  height?: number;
}

export function interiorHost(w: InteriorWall): WallHost {
  const dir = norm(sub(w.b, w.a));
  const out = v(-dir.y, dir.x);
  return {
    key: w.id,
    interiorId: w.id,
    a: w.a,
    b: w.b,
    base: add(w.a, mul(out, -w.thickness / 2)),
    dir,
    out,
    in: mul(out, -1),
    length: dist(w.a, w.b),
    thickness: w.thickness,
    height: w.height,
  };
}

export function wallHosts(p: Pick<Project, 'room' | 'interiorWalls'>): WallHost[] {
  const hosts: WallHost[] = p.room.closed
    ? getWalls(p.room).map((w) => ({ key: `o${w.index}`, outerIndex: w.index, a: w.a, b: w.b, base: w.a, dir: w.dir, out: w.out, in: w.in, length: w.length, thickness: p.room.wallThickness }))
    : [];
  for (const w of p.interiorWalls ?? []) if (dist(w.a, w.b) > 1) hosts.push(interiorHost(w));
  return hosts;
}

export function hostOf(op: Opening, hosts: WallHost[]): WallHost | undefined {
  const k = hostKey(op);
  return hosts.find((h) => h.key === k);
}

/** Both faces of an interior wall, as walls whose inward normal points away from the wall. */
export function interiorFaces(w: InteriorWall, index: number): Wall[] {
  const h = interiorHost(w);
  const t = w.thickness / 2;
  const f1a = add(w.a, mul(h.out, t));
  const f1b = add(w.b, mul(h.out, t));
  const f2a = add(w.b, mul(h.in, t));
  const f2b = add(w.a, mul(h.in, t));
  const mk = (a: Vec2, b: Vec2, inn: Vec2, idx: number): Wall => {
    const d = norm(sub(b, a));
    return { index: idx, a, b, dir: d, in: inn, out: mul(inn, -1), length: dist(a, b), angle: rad2deg(Math.atan2(d.y, d.x)) };
  };
  return [mk(f1a, f1b, h.out, 1000 + index * 2), mk(f2a, f2b, h.in, 1001 + index * 2)];
}

/** Every wall face furniture can be pushed against. */
export function snapWalls(p: Pick<Project, 'room' | 'interiorWalls'>): Wall[] {
  const res = p.room.closed ? getWalls(p.room) : [];
  (p.interiorWalls ?? []).forEach((w, i) => {
    if (dist(w.a, w.b) > 1) res.push(...interiorFaces(w, i));
  });
  return res;
}

/** Points a new interior wall can attach to: outer corners and interior wall ends. */
export function wallAnchors(p: Pick<Project, 'room' | 'interiorWalls'>, exclude?: Set<string>): Vec2[] {
  const pts = [...p.room.points];
  for (const w of p.interiorWalls ?? []) {
    if (!exclude?.has(`${w.id}:a`)) pts.push(w.a);
    if (!exclude?.has(`${w.id}:b`)) pts.push(w.b);
  }
  return pts;
}

/** Lines a new interior wall can end on: outer inner faces and interior centrelines. */
export function wallLines(p: Pick<Project, 'room' | 'interiorWalls'>, exclude?: Set<string>): { a: Vec2; b: Vec2 }[] {
  const lines = getWalls(p.room).map((w) => ({ a: w.a, b: w.b }));
  for (const w of p.interiorWalls ?? []) if (!exclude?.has(w.id)) lines.push({ a: w.a, b: w.b });
  return lines;
}

export interface WallSnap {
  point: Vec2;
  guides: { a: Vec2; b: Vec2 }[];
  /** The point lies on an existing wall or corner (a chain of new walls can end here). */
  onWall: boolean;
}

/**
 * Snap a point while drawing interior walls: corners and wall ends first, then a point on an
 * existing wall (keeping a horizontal/vertical lock if one applies), then grid/ortho/alignment.
 */
export function snapWallPoint(
  p: Vec2,
  last: Vec2 | undefined,
  anchors: Vec2[],
  lines: { a: Vec2; b: Vec2 }[],
  o: { grid: number; ortho: boolean; threshold: number },
): WallSnap {
  if (o.threshold > 0) {
    let best: Vec2 | null = null;
    for (const r of anchors) if (dist(p, r) < o.threshold * 1.2 && (!best || dist(p, r) < dist(p, best))) best = r;
    if (best) return { point: best, guides: [], onWall: true };
  }
  const base = snapDrawPoint(p, last ? [...anchors, last] : anchors, { ...o, close: false });
  if (o.threshold > 0) {
    const lockH = !!last && Math.abs(base.point.y - last.y) < 1e-6 && o.ortho;
    const lockV = !!last && Math.abs(base.point.x - last.x) < 1e-6 && o.ortho;
    let bestD = o.threshold;
    let hit: Vec2 | null = null;
    for (const l of lines) {
      const pr = projectOnSegment(p, l.a, l.b);
      if (pr.distance >= bestD) continue;
      // Slide along the wall from the grid-snapped point, so the attach point stays on the grid.
      let q = projectOnSegment(base.point, l.a, l.b).point;
      if (dist(q, p) > o.threshold * 2) q = pr.point;
      // Keep the horizontal/vertical lock by meeting the wall where the locked line crosses it.
      if ((lockH || lockV) && last) {
        const axis = lockH ? v(1, 0) : v(0, 1);
        const along = dot(sub(p, last), axis) >= 0 ? axis : mul(axis, -1);
        const t = raySegment(last, along, l.a, l.b);
        if (t !== null) {
          const cand = add(last, mul(along, t));
          if (dist(cand, p) < o.threshold * 2) q = cand;
        }
      }
      bestD = pr.distance;
      hit = q;
    }
    if (hit) return { point: v(round1(hit.x), round1(hit.y)), guides: base.guides, onWall: true };
  }
  return { point: base.point, guides: base.guides, onWall: false };
}

/**
 * Closed spaces formed by the outer outline and the interior walls (by centreline). Each face is
 * a polygon; dangling walls are allowed. Areas are measured to wall centrelines / inner faces.
 */
export function roomFaces(p: Pick<Project, 'room' | 'interiorWalls'>): Vec2[][] {
  const segs: [Vec2, Vec2][] = [];
  if (p.room.closed) for (const w of getWalls(p.room)) segs.push([w.a, w.b]);
  for (const w of p.interiorWalls ?? []) if (dist(w.a, w.b) > 1) segs.push([w.a, w.b]);
  const tol = 0.6;
  // 1. Split every segment where others cross or touch it.
  const pieces: [Vec2, Vec2][] = [];
  segs.forEach(([a, b], i) => {
    const r = sub(b, a);
    const L = len(r);
    const ts = [0, 1];
    segs.forEach(([c, d], j) => {
      if (i === j) return;
      const s2 = sub(d, c);
      const den = cross(r, s2);
      if (Math.abs(den) > 1e-9) {
        const t = cross(sub(c, a), s2) / den;
        const u = cross(sub(c, a), r) / den;
        const eu = tol / Math.max(len(s2), 1e-6);
        const et = tol / L;
        if (t >= -et && t <= 1 + et && u >= -eu && u <= 1 + eu) ts.push(clamp(t, 0, 1));
      }
      for (const q of [c, d]) {
        const pr = projectOnSegment(q, a, b);
        if (pr.distance < tol) ts.push(pr.t);
      }
    });
    ts.sort((x, y) => x - y);
    const uniq = ts.filter((t, k) => k === 0 || (t - ts[k - 1]) * L > tol);
    if ((1 - uniq[uniq.length - 1]) * L <= tol) uniq[uniq.length - 1] = 1;
    for (let k = 0; k + 1 < uniq.length; k++) pieces.push([add(a, mul(r, uniq[k])), add(a, mul(r, uniq[k + 1]))]);
  });
  // 2. Merge nearby points into vertices.
  const verts: Vec2[] = [];
  const vid = (q: Vec2) => {
    for (let k = 0; k < verts.length; k++) if (dist(verts[k], q) < tol) return k;
    verts.push(q);
    return verts.length - 1;
  };
  const adj = new Map<number, Set<number>>();
  for (const [a, b] of pieces) {
    const ia = vid(a);
    const ib = vid(b);
    if (ia === ib) continue;
    if (!adj.has(ia)) adj.set(ia, new Set());
    if (!adj.has(ib)) adj.set(ib, new Set());
    adj.get(ia)!.add(ib);
    adj.get(ib)!.add(ia);
  }
  // 3. Neighbours sorted by angle; walk faces by always taking the next edge around each vertex.
  const sorted = new Map<number, number[]>();
  for (const [k, ns] of adj) {
    sorted.set(
      k,
      [...ns].sort((x, y) => Math.atan2(verts[x].y - verts[k].y, verts[x].x - verts[k].x) - Math.atan2(verts[y].y - verts[k].y, verts[y].x - verts[k].x)),
    );
  }
  const seen = new Set<string>();
  const faces: Vec2[][] = [];
  for (const [u, ns] of sorted) {
    for (const w of ns) {
      if (seen.has(`${u}>${w}`)) continue;
      const poly: number[] = [];
      let a = u;
      let b = w;
      for (let guard = 0; guard < 10000; guard++) {
        seen.add(`${a}>${b}`);
        poly.push(a);
        const around = sorted.get(b)!;
        const idx = around.indexOf(a);
        const next = around[(idx - 1 + around.length) % around.length];
        a = b;
        b = next;
        if (a === u && b === w) break;
      }
      const pts = poly.map((k) => verts[k]);
      // With this walk, bounded faces have positive signed area (y grows down); the outside is negative.
      if (polygonArea(pts) > 1) faces.push(pts);
    }
  }
  return faces;
}

/** The smallest closed space that contains `pt`. */
export function faceAt(pt: Vec2, faces: Vec2[][]): Vec2[] | null {
  let best: Vec2[] | null = null;
  let bestA = Infinity;
  for (const f of faces) {
    if (!pointInPolygon(pt, f)) continue;
    const a = Math.abs(polygonArea(f));
    if (a < bestA) {
      bestA = a;
      best = f;
    }
  }
  return best;
}

export function zoneArea(z: Zone, faces: Vec2[][]): number | null {
  const f = faceAt(v(z.x, z.y), faces);
  return f ? Math.abs(polygonArea(f)) / 10000 : null;
}

/** Bounds of everything drawn: outer outline and interior walls. */
export function projectBounds(p: Pick<Project, 'room' | 'interiorWalls'>) {
  const pts = [...p.room.points];
  for (const w of p.interiorWalls ?? []) pts.push(w.a, w.b);
  if (!pts.length) pts.push(v(0, 0), v(400, 300));
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
