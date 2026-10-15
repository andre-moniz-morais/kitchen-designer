import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getEntry } from './catalog';
import { dist, fitOpening, projectOnSegment, roomCenter, stackElevation, v, wallHosts } from './geometry';
import type { InteriorWall, Item, Opening, Project, Room, Selection, Tool, Vec2, ViewMode, Zone } from './types';
import { ZONE_KINDS } from './zones';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function rectRoom(w: number, l: number, base?: Partial<Room>): Room {
  return {
    points: [v(0, 0), v(w, 0), v(w, l), v(0, l)],
    closed: true,
    wallThickness: base?.wallThickness ?? 15,
    wallHeight: base?.wallHeight ?? 260,
    floorMaterial: base?.floorMaterial ?? 'floor-oak-planks',
    wallColor: base?.wallColor ?? '#f2f0eb',
  };
}

export function lRoom(w: number, l: number, cutW: number, cutL: number, base?: Partial<Room>): Room {
  return {
    ...rectRoom(w, l, base),
    points: [v(0, 0), v(w, 0), v(w, l - cutL), v(w - cutW, l - cutL), v(w - cutW, l), v(0, l)],
  };
}

export function createItem(type: string, x: number, y: number, rotation = 0, patch: Partial<Item> = {}): Item {
  const e = getEntry(type);
  return {
    id: uid(),
    type,
    name: e.name,
    x,
    y,
    rotation,
    width: e.width,
    depth: e.depth,
    height: e.height,
    elevation: e.elevation,
    materials: { ...e.defaults },
    ...(e.options ? { options: { ...e.options } } : {}),
    ...patch,
  };
}

export function exampleProject(): Project {
  const room = rectRoom(460, 380);
  const top = (type: string, left: number, patch: Partial<Item> = {}) => {
    const e = getEntry(type);
    const w = patch.width ?? e.width;
    const d = patch.depth ?? e.depth;
    return createItem(type, left + w / 2, d / 2, 0, patch);
  };
  const items: Item[] = [
    top('fridge', 0, { depth: 60 }),
    top('oven-tower', 60),
    top('base-60', 120),
    top('sink-base-90', 180),
    top('dishwasher', 270),
    top('drawers-60', 330),
    top('base-60', 390, { width: 70 }),
    top('wall-60', 120, { elevation: 150 }),
    top('wall-60', 270, { elevation: 150 }),
    top('wall-60', 390, { width: 70, elevation: 150 }),
    createItem('cooktop-induction', 360, 30, 0),
    top('hood-wall', 315, { elevation: 155 }),
    createItem('island-180', 230, 230, 180),
    createItem('ceiling-120', 230, 220, 0, { width: 140, elevation: 190 }),
    createItem('stool', 180, 300, 180),
    createItem('stool', 230, 300, 180),
    createItem('stool', 280, 300, 180),
  ];
  // A coordinated palette: sage lower units, white wall units, oak island and Calacatta tops.
  for (const it of items) {
    const e = getEntry(it.type);
    if (e.category === 'furniture') continue;
    if (e.slots.includes('top')) it.materials.top = 'calacatta';
    if (e.slots.includes('front')) it.materials.front = e.category === 'wall' ? 'white-matt' : 'sage';
  }
  for (const it of items) if (it.type === 'island-180' || it.type === 'ceiling-120') it.materials.front = 'oak-natural';
  const openings: Opening[] = [
    { id: uid(), kind: 'window', wallIndex: 0, offset: 225, width: 100, height: 70, elevation: 150, flip: false, swingOut: false },
    { id: uid(), kind: 'door', wallIndex: 3, offset: 90, width: 80, height: 210, elevation: 0, flip: false, swingOut: false },
  ];
  return { version: 1, name: 'Cozinha exemplo', room, items, openings, interiorWalls: [], zones: [] };
}

/** A small single-storey house: kitchen, living room, hall, bedroom, bathroom and office. */
export function houseExample(): Project {
  const room = rectRoom(1000, 800, { floorMaterial: 'floor-oak-planks' });
  const wall = (a: [number, number], b: [number, number]): InteriorWall => ({ id: uid(), a: v(a[0], a[1]), b: v(b[0], b[1]), thickness: 10 });
  const wKitchen = wall([420, 0], [420, 420]);
  const wTop = wall([0, 420], [1000, 420]);
  const wBottom = wall([0, 540], [1000, 540]);
  const wBed = wall([380, 540], [380, 800]);
  const wBath = wall([600, 540], [600, 800]);
  const interiorWalls = [wKitchen, wTop, wBottom, wBed, wBath];
  const op = (kind: Opening['kind'], at: { outer?: number; inner?: string }, offset: number, width: number, height: number, elevation = 0, extra: Partial<Opening> = {}): Opening => ({
    id: uid(),
    kind,
    wallIndex: at.outer ?? 0,
    ...(at.inner ? { interiorWallId: at.inner } : {}),
    offset,
    width,
    height,
    elevation,
    flip: false,
    swingOut: false,
    ...extra,
  });
  const openings: Opening[] = [
    op('window', { outer: 0 }, 225, 100, 70, 150),
    op('window', { outer: 0 }, 710, 220, 220, 0),
    op('door-ext', { outer: 1 }, 480, 100, 215),
    op('window', { outer: 2 }, 810, 140, 120, 95),
    op('window', { outer: 2 }, 510, 60, 60, 150),
    op('window', { outer: 2 }, 200, 140, 120, 95),
    op('door', { inner: wTop.id }, 300, 80, 210),
    op('passage', { inner: wTop.id }, 710, 160, 210),
    op('door', { inner: wBottom.id }, 190, 80, 210, 0, { flip: true }),
    op('door', { inner: wBottom.id }, 490, 70, 210),
    op('door', { inner: wBottom.id }, 800, 80, 210, 0, { flip: true }),
  ];
  const zone = (kind: Zone['kind'], x: number, y: number): Zone => ({ id: uid(), kind, name: ZONE_KINDS[kind].label, x, y, floorMaterial: ZONE_KINDS[kind].floor });
  const zones = [zone('kitchen', 270, 330), zone('living', 640, 170), zone('hall', 300, 480), zone('bedroom', 290, 600), zone('bathroom', 490, 720), zone('office', 700, 600)];
  const top = (type: string, left: number, patch: Partial<Item> = {}) => {
    const e = getEntry(type);
    return createItem(type, left + (patch.width ?? e.width) / 2, (patch.depth ?? e.depth) / 2, 0, patch);
  };
  const items: Item[] = [
    // Kitchen (0–415 × 0–415)
    top('fridge-tower', 0, { materials: { front: 'sage', body: 'white-matt' } }),
    top('oven-tower', 60, { materials: { front: 'sage', body: 'white-matt', finish: 'steel' } }),
    top('base-60', 120, { materials: { front: 'sage', body: 'white-matt', top: 'calacatta' } }),
    top('sink-base-90', 180, { materials: { front: 'sage', body: 'white-matt', top: 'calacatta', finish: 'steel' } }),
    top('dishwasher', 270, { materials: { front: 'sage', top: 'calacatta', finish: 'steel' } }),
    top('drawers-60', 330, { materials: { front: 'sage', body: 'white-matt', top: 'calacatta' } }),
    createItem('cooktop-induction', 360, 30, 0),
    top('hood-wall', 315, { elevation: 155 }),
    top('base-60', 390, { width: 25, materials: { front: 'sage', body: 'white-matt', top: 'calacatta' } }),
    createItem('island-180', 210, 280, 180, { width: 160, materials: { front: 'oak-natural', body: 'white-matt', top: 'calacatta' } }),
    createItem('stool', 165, 345, 180),
    createItem('stool', 255, 345, 180),
    // Living room (425–1000 × 0–415)
    createItem('rug', 800, 210, 90, { width: 200, depth: 260 }),
    createItem('sofa-3', 700, 210, 270),
    createItem('coffee-table', 820, 210, 90),
    createItem('tv-unit', 979, 210, 90),
    createItem('tv', 979, 210, 90, { elevation: 50 }),
    createItem('armchair', 820, 345, 0),
    createItem('floor-lamp', 690, 80, 0),
    createItem('table-round', 530, 300, 0),
    createItem('chair', 530, 240, 0),
    createItem('chair', 530, 360, 180),
    createItem('plant', 470, 380, 0),
    // Hall (0–1000 × 425–535)
    createItem('plant-small', 960, 515, 0),
    // Bedroom (0–375 × 545–800)
    createItem('bed-160', 106, 672.5, 270),
    createItem('nightstand', 20, 567.5, 270),
    createItem('nightstand', 20, 777.5, 270),
    createItem('wardrobe-3', 290, 770, 180),
    createItem('rug-small', 250, 660, 90, { width: 120, depth: 180 }),
    // Bathroom (385–595 × 545–800)
    createItem('toilet', 425, 766, 180),
    createItem('vanity', 525, 777, 180),
    createItem('mirror', 525, 798.5, 180, { elevation: 120 }),
    createItem('shower', 550, 590, 0),
    createItem('towel-rail', 390, 640, 90),
    // Office (605–1000 × 545–800)
    createItem('desk', 800, 765, 180),
    createItem('office-chair', 800, 700, 180),
    createItem('monitor', 800, 785, 180, { elevation: 75 }),
    createItem('bookcase', 982.5, 640, 90),
    createItem('plant', 640, 770, 0),
  ];
  return { version: 1, name: 'Casa exemplo', room, items, openings, interiorWalls, zones };
}

export function emptyProject(room?: Room): Project {
  return { version: 1, name: 'A minha casa', room: room ?? rectRoom(400, 300), items: [], openings: [], interiorWalls: [], zones: [] };
}

export interface Settings {
  grid: number;
  snap: boolean;
  ortho: boolean;
  showDims: boolean;
  wallsMode: 'auto' | 'full' | 'low';
  /** Thickness for new interior walls, cm. */
  iwallThickness: number;
}

const DEFAULT_SETTINGS: Settings = { grid: 5, snap: true, ortho: true, showDims: true, wallsMode: 'auto', iwallThickness: 10 };

interface State {
  project: Project;
  past: Project[];
  future: Project[];
  selection: Selection;
  viewMode: ViewMode;
  tool: Tool;
  draft: Vec2[];
  settings: Settings;
  welcomed: boolean;
  /** Bumped when the 2D view should re-fit the room. */
  fitToken: number;

  checkpoint: () => void;
  mutate: (fn: (p: Project) => Project, record?: boolean) => void;
  undo: () => void;
  redo: () => void;
  setProject: (p: Project) => void;
  select: (s: Selection) => void;
  setViewMode: (m: ViewMode) => void;
  setTool: (t: Tool) => void;
  setDraft: (d: Vec2[]) => void;
  setSettings: (s: Partial<Settings>) => void;
  setWelcomed: () => void;
  fit: () => void;

  addItem: (type: string, at?: Vec2) => Item | null;
  updateItem: (id: string, patch: Partial<Item>, record?: boolean) => void;
  updateOpening: (id: string, patch: Partial<Opening>, record?: boolean) => void;
  setRoom: (patch: Partial<Room>, record?: boolean) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  applyMaterialToAll: (slot: string, material: string) => void;
  addInteriorWall: (a: Vec2, b: Vec2) => string;
  updateInteriorWall: (id: string, patch: Partial<InteriorWall>, record?: boolean) => void;
  /** Move wall ends (several at once, so connected walls stay joined). */
  moveWallEnds: (moves: { id: string; end: 'a' | 'b'; to: Vec2 }[], record?: boolean) => void;
  updateZone: (id: string, patch: Partial<Zone>, record?: boolean) => void;
}

const MAX_HISTORY = 120;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      project: houseExample(),
      past: [],
      future: [],
      selection: null,
      viewMode: '2d',
      tool: 'select',
      draft: [],
      settings: DEFAULT_SETTINGS,
      welcomed: false,
      fitToken: 0,

      checkpoint: () => set((s) => ({ past: [...s.past.slice(-MAX_HISTORY), s.project], future: [] })),
      mutate: (fn, record = true) =>
        set((s) => ({
          project: fn(s.project),
          ...(record ? { past: [...s.past.slice(-MAX_HISTORY), s.project], future: [] } : {}),
        })),
      undo: () =>
        set((s) => {
          if (!s.past.length) return {};
          const prev = s.past[s.past.length - 1];
          return { project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future], selection: validSel(s.selection, prev) };
        }),
      redo: () =>
        set((s) => {
          if (!s.future.length) return {};
          const next = s.future[0];
          return { project: next, future: s.future.slice(1), past: [...s.past, s.project], selection: validSel(s.selection, next) };
        }),
      setProject: (p) => {
        get().checkpoint();
        set((s) => ({ project: p, selection: null, draft: [], tool: 'select', fitToken: s.fitToken + 1 }));
      },
      select: (selection) => set({ selection }),
      setViewMode: (viewMode) => set({ viewMode, tool: 'select', draft: [] }),
      setTool: (tool) => set({ tool, draft: [], selection: null }),
      setDraft: (draft) => set({ draft }),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setWelcomed: () => set({ welcomed: true }),
      fit: () => set((s) => ({ fitToken: s.fitToken + 1 })),

      addItem: (type, at) => {
        const e = getEntry(type);
        const { project } = get();
        if (e.zone) {
          const c = at ?? roomCenter(project.room);
          const z: Zone = { id: uid(), kind: e.zone, name: ZONE_KINDS[e.zone].label, x: Math.round(c.x), y: Math.round(c.y), floorMaterial: ZONE_KINDS[e.zone].floor };
          get().mutate((p) => ({ ...p, zones: [...(p.zones ?? []), z] }));
          set({ selection: { kind: 'zone', id: z.id } });
          return null;
        }
        if (e.opening) {
          const hosts = wallHosts(project);
          if (!hosts.length) return null;
          // Default: the longest wall, centred, unless a position was given (then the nearest wall).
          let host = hosts.reduce((a, b) => (b.length > a.length ? b : a));
          let offset = host.length / 2;
          if (at) {
            let best = Infinity;
            for (const h of hosts) {
              const pr = projectOnSegment(at, h.a, h.b);
              if (pr.distance < best) {
                best = pr.distance;
                host = h;
                offset = pr.t * h.length;
              }
            }
          }
          const op: Opening = { id: uid(), kind: e.opening, wallIndex: host.outerIndex ?? 0, offset, width: e.width, height: e.height, elevation: e.elevation, flip: false, swingOut: false };
          if (host.interiorId) op.interiorWallId = host.interiorId;
          // Openings never overlap: fall back to the nearest free stretch of wall.
          let placed = fitOpening(op, offset, host.key, host.length, project.openings);
          if (placed === null) {
            search: for (const h of [host, ...hosts.filter((x) => x !== host)]) {
              for (let t = e.width / 2; t <= h.length - e.width / 2; t += 5) {
                const f = fitOpening(op, t, h.key, h.length, project.openings);
                if (f !== null) {
                  op.wallIndex = h.outerIndex ?? 0;
                  if (h.interiorId) op.interiorWallId = h.interiorId;
                  else delete op.interiorWallId;
                  placed = f;
                  break search;
                }
              }
            }
          }
          if (placed === null) return null;
          op.offset = placed;
          get().mutate((p) => ({ ...p, openings: [...p.openings, op] }));
          set({ selection: { kind: 'opening', id: op.id } });
          return null;
        }
        const c = at ?? roomCenter(project.room);
        const it = createItem(type, Math.round(c.x), Math.round(c.y));
        // Ceiling-anchored items keep their default gap to the ceiling, whatever the room height.
        if (e.anchor === 'ceiling') it.elevation = Math.max(0, project.room.wallHeight - it.height - Math.max(0, 260 - e.elevation - e.height));
        if (e.anchor === 'counter') {
          const st = stackElevation({ ...it, elevation: 999 }, project.items);
          if (st > 0) it.elevation = st;
        }
        get().mutate((p) => ({ ...p, items: [...p.items, it] }));
        set({ selection: { kind: 'item', id: it.id } });
        return it;
      },
      updateItem: (id, patch, record = true) =>
        get().mutate((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }), record),
      updateOpening: (id, patch, record = true) =>
        get().mutate((p) => ({ ...p, openings: p.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) }), record),
      setRoom: (patch, record = true) => get().mutate((p) => ({ ...p, room: { ...p.room, ...patch } }), record),
      deleteSelection: () => {
        const s = get().selection;
        if (!s) return;
        if (s.kind === 'item') get().mutate((p) => ({ ...p, items: p.items.filter((i) => i.id !== s.id) }));
        else if (s.kind === 'opening') get().mutate((p) => ({ ...p, openings: p.openings.filter((o) => o.id !== s.id) }));
        else if (s.kind === 'vertex') {
          const { room } = get().project;
          if (room.points.length <= 3) return;
          get().mutate((p) => ({
            ...p,
            room: { ...p.room, points: p.room.points.filter((_, i) => i !== s.index) },
            openings: fixOpeningsAfterVertexRemoval(p.openings, s.index, p.room.points.length),
          }));
        } else if (s.kind === 'iwall') {
          get().mutate((p) => ({
            ...p,
            interiorWalls: (p.interiorWalls ?? []).filter((w) => w.id !== s.id),
            openings: p.openings.filter((o) => o.interiorWallId !== s.id),
          }));
        } else if (s.kind === 'zone') {
          get().mutate((p) => ({ ...p, zones: (p.zones ?? []).filter((z) => z.id !== s.id) }));
        } else return;
        set({ selection: null });
      },
      addInteriorWall: (a, b) => {
        const w: InteriorWall = { id: uid(), a, b, thickness: get().settings.iwallThickness ?? 10 };
        get().mutate((p) => ({ ...p, interiorWalls: [...(p.interiorWalls ?? []), w] }));
        return w.id;
      },
      updateInteriorWall: (id, patch, record = true) =>
        get().mutate((p) => ({ ...p, interiorWalls: (p.interiorWalls ?? []).map((w) => (w.id === id ? { ...w, ...patch } : w)) }), record),
      moveWallEnds: (moves, record = false) =>
        get().mutate(
          (p) => ({
            ...p,
            interiorWalls: (p.interiorWalls ?? []).map((w) => {
              let nw = w;
              for (const m of moves) if (m.id === w.id) nw = { ...nw, [m.end]: m.to };
              return nw;
            }),
            // Doors and windows keep their distance from the wall start but stay within the wall.
            openings: p.openings.map((o) => {
              const w = (p.interiorWalls ?? []).find((x) => x.id === o.interiorWallId);
              if (!w || !moves.some((m) => m.id === w.id)) return o;
              let a = w.a;
              let b = w.b;
              for (const m of moves) if (m.id === w.id) m.end === 'a' ? (a = m.to) : (b = m.to);
              const L = dist(a, b);
              return { ...o, offset: Math.max(o.width / 2, Math.min(L - o.width / 2, o.offset)) };
            }),
          }),
          record,
        ),
      updateZone: (id, patch, record = true) => get().mutate((p) => ({ ...p, zones: (p.zones ?? []).map((z) => (z.id === id ? { ...z, ...patch } : z)) }), record),
      duplicateSelection: () => {
        const s = get().selection;
        if (s?.kind !== 'item') return;
        const it = get().project.items.find((i) => i.id === s.id);
        if (!it) return;
        // Place the copy right next to the original, along its width.
        const r = (it.rotation * Math.PI) / 180;
        const copy = { ...it, id: uid(), x: it.x + Math.cos(r) * it.width, y: it.y + Math.sin(r) * it.width, materials: { ...it.materials } };
        get().mutate((p) => ({ ...p, items: [...p.items, copy] }));
        set({ selection: { kind: 'item', id: copy.id } });
      },
      applyMaterialToAll: (slot, material) =>
        get().mutate((p) => ({
          ...p,
          items: p.items.map((i) => (getEntry(i.type).slots.includes(slot as never) ? { ...i, materials: { ...i.materials, [slot]: material } } : i)),
        })),
    }),
    {
      name: 'kitchen-designer-v1',
      version: 1,
      partialize: (s) => ({ project: s.project, settings: s.settings, welcomed: s.welcomed }),
      // Keep defaults for settings added after the project was saved.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

function validSel(sel: Selection, p: Project): Selection {
  if (!sel) return null;
  if (sel.kind === 'item') return p.items.some((i) => i.id === sel.id) ? sel : null;
  if (sel.kind === 'opening') return p.openings.some((o) => o.id === sel.id) ? sel : null;
  if (sel.kind === 'vertex') return sel.index < p.room.points.length ? sel : null;
  if (sel.kind === 'wall') return sel.index < p.room.points.length ? sel : null;
  if (sel.kind === 'iwall') return (p.interiorWalls ?? []).some((w) => w.id === sel.id) ? sel : null;
  if (sel.kind === 'zone') return (p.zones ?? []).some((z) => z.id === sel.id) ? sel : null;
  return null;
}

/** Removing vertex i merges walls i-1 and i; openings on later walls shift down one index. */
function fixOpeningsAfterVertexRemoval(ops: Opening[], index: number, count: number): Opening[] {
  return ops
    .filter((o) => o.interiorWallId || (o.wallIndex !== index && o.wallIndex !== (index - 1 + count) % count))
    .map((o) => (!o.interiorWallId && o.wallIndex > index ? { ...o, wallIndex: o.wallIndex - 1 } : o));
}

/** Splitting wall i at its midpoint inserts a vertex at i+1. */
export function fixOpeningsAfterSplit(ops: Opening[], wallIndex: number, firstLength: number): Opening[] {
  return ops.map((o) => {
    if (o.interiorWallId) return o;
    if (o.wallIndex > wallIndex) return { ...o, wallIndex: o.wallIndex + 1 };
    if (o.wallIndex === wallIndex && o.offset > firstLength) return { ...o, wallIndex: wallIndex + 1, offset: o.offset - firstLength };
    return o;
  });
}

export const useSelectedItem = () =>
  useStore((s) => (s.selection?.kind === 'item' ? s.project.items.find((i) => i.id === (s.selection as { id: string }).id) ?? null : null));

export const useSelectedOpening = () =>
  useStore((s) => (s.selection?.kind === 'opening' ? s.project.openings.find((o) => o.id === (s.selection as { id: string }).id) ?? null : null));

export const useSelectedWall = () =>
  useStore((s) => (s.selection?.kind === 'iwall' ? (s.project.interiorWalls ?? []).find((w) => w.id === (s.selection as { id: string }).id) ?? null : null));

export const useSelectedZone = () =>
  useStore((s) => (s.selection?.kind === 'zone' ? (s.project.zones ?? []).find((z) => z.id === (s.selection as { id: string }).id) ?? null : null));

/** Wall ends sitting on the same spot as `p` (so dragging one corner drags every wall joined there). */
export function endsAt(p: Vec2, walls: InteriorWall[], tol = 0.6): { id: string; end: 'a' | 'b' }[] {
  const res: { id: string; end: 'a' | 'b' }[] = [];
  for (const w of walls) {
    if (dist(w.a, p) < tol) res.push({ id: w.id, end: 'a' });
    if (dist(w.b, p) < tol) res.push({ id: w.id, end: 'b' });
  }
  return res;
}

