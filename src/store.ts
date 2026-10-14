import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getEntry } from './catalog';
import { getWalls, roomCenter, stackElevation, v } from './geometry';
import type { Item, Opening, Project, Room, Selection, Tool, Vec2, ViewMode } from './types';

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
  return { version: 1, name: 'Cozinha exemplo', room, items, openings };
}

export function emptyProject(room?: Room): Project {
  return { version: 1, name: 'A minha cozinha', room: room ?? rectRoom(400, 300), items: [], openings: [] };
}

export interface Settings {
  grid: number;
  snap: boolean;
  ortho: boolean;
  showDims: boolean;
  wallsMode: 'auto' | 'full' | 'low';
}

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
}

const MAX_HISTORY = 120;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      project: exampleProject(),
      past: [],
      future: [],
      selection: null,
      viewMode: '2d',
      tool: 'select',
      draft: [],
      settings: { grid: 5, snap: true, ortho: true, showDims: true, wallsMode: 'auto' },
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
        if (e.opening) {
          const walls = getWalls(project.room);
          if (!walls.length) return null;
          // Default: the longest wall, centred, unless a position was given.
          let wall = walls.reduce((a, b) => (b.length > a.length ? b : a));
          let offset = wall.length / 2;
          if (at) {
            let best = Infinity;
            for (const w of walls) {
              const t = Math.max(0, Math.min(1, ((at.x - w.a.x) * w.dir.x + (at.y - w.a.y) * w.dir.y) / w.length));
              const px = w.a.x + w.dir.x * t * w.length;
              const py = w.a.y + w.dir.y * t * w.length;
              const d = Math.hypot(px - at.x, py - at.y);
              if (d < best) {
                best = d;
                wall = w;
                offset = t * w.length;
              }
            }
          }
          offset = Math.max(e.width / 2, Math.min(wall.length - e.width / 2, offset));
          const op: Opening = { id: uid(), kind: e.opening, wallIndex: wall.index, offset, width: e.width, height: e.height, elevation: e.elevation, flip: false, swingOut: false };
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
        } else return;
        set({ selection: null });
      },
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
    },
  ),
);

function validSel(sel: Selection, p: Project): Selection {
  if (!sel) return null;
  if (sel.kind === 'item') return p.items.some((i) => i.id === sel.id) ? sel : null;
  if (sel.kind === 'opening') return p.openings.some((o) => o.id === sel.id) ? sel : null;
  if (sel.kind === 'vertex') return sel.index < p.room.points.length ? sel : null;
  if (sel.kind === 'wall') return sel.index < p.room.points.length ? sel : null;
  return null;
}

/** Removing vertex i merges walls i-1 and i; openings on later walls shift down one index. */
function fixOpeningsAfterVertexRemoval(ops: Opening[], index: number, count: number): Opening[] {
  return ops
    .filter((o) => o.wallIndex !== index && o.wallIndex !== (index - 1 + count) % count)
    .map((o) => (o.wallIndex > index ? { ...o, wallIndex: o.wallIndex - 1 } : o));
}

/** Splitting wall i at its midpoint inserts a vertex at i+1. */
export function fixOpeningsAfterSplit(ops: Opening[], wallIndex: number, firstLength: number): Opening[] {
  return ops.map((o) => {
    if (o.wallIndex > wallIndex) return { ...o, wallIndex: o.wallIndex + 1 };
    if (o.wallIndex === wallIndex && o.offset > firstLength) return { ...o, wallIndex: wallIndex + 1, offset: o.offset - firstLength };
    return o;
  });
}

export const useSelectedItem = () =>
  useStore((s) => (s.selection?.kind === 'item' ? s.project.items.find((i) => i.id === (s.selection as { id: string }).id) ?? null : null));

export const useSelectedOpening = () =>
  useStore((s) => (s.selection?.kind === 'opening' ? s.project.openings.find((o) => o.id === (s.selection as { id: string }).id) ?? null : null));
