import { describe, expect, it } from 'vitest';
import { visibleSlots } from './catalog';
import { clearances, findFreeWallSpot, fitOpening, hostKey, polygonArea, roomFaces, snapWallPoint, snapWalls, wallAnchors, wallHosts, wallLines, zoneArea, getWalls, itemBelow, outerPolygon, snapDrawPoint, snapItem, stackElevation } from './geometry';
import { createItem, rectRoom } from './store';

const room = rectRoom(400, 300);
const opts = { grid: 5, threshold: 15, snapToWalls: true, snapToItems: true };

describe('walls', () => {
  it('computes inward normals for a rectangle', () => {
    const w = getWalls(room);
    expect(w).toHaveLength(4);
    expect(w[0].in.x).toBeCloseTo(0); // top wall faces down into the room
    expect(w[0].in.y).toBeCloseTo(1);
    expect(w[1].in.x).toBeCloseTo(-1);
    expect(w[0].length).toBe(400);
  });

  it('offsets the outer outline by the wall thickness', () => {
    const o = outerPolygon(room);
    expect(o[0].x).toBeCloseTo(-15);
    expect(o[0].y).toBeCloseTo(-15);
    expect(o[2].x).toBeCloseTo(415);
  });
});

describe('snapItem', () => {
  it('pushes a cabinet against the nearest wall and rotates it to face the room', () => {
    const it = createItem('base-60', 385, 150, 0);
    const r = snapItem(it, getWalls(room), [it], opts);
    expect(r.wall).toBe(1);
    expect(r.x).toBe(370);
    expect(r.rotation).toBe(90);
  });

  it('slides a cabinet into the corner when close to a perpendicular wall', () => {
    const it = createItem('base-60', 38, 32, 0);
    const r = snapItem(it, getWalls(room), [it], opts);
    expect(r.y).toBe(30);
    expect(r.x).toBe(30);
  });

  it('butts a cabinet against its neighbour', () => {
    const a = createItem('base-60', 30, 30, 0);
    const b = createItem('base-60', 96, 30, 0);
    const r = snapItem(b, getWalls(room), [a, b], opts);
    expect(r.x).toBe(90);
  });

  it('does not snap islands to walls', () => {
    const it = createItem('island-180', 200, 70, 0);
    const r = snapItem(it, getWalls(room), [it], { ...opts, snapToWalls: false });
    expect(r.wall).toBeNull();
  });
});

describe('stacking', () => {
  it('finds the item below and its gap (ceiling unit 100 cm above the island)', () => {
    const island = createItem('island-180', 200, 150, 0);
    const hanging = createItem('ceiling-120', 200, 150, 0, { elevation: 190 });
    const below = itemBelow(hanging, [island, hanging]);
    expect(below?.id).toBe(island.id);
    expect(hanging.elevation - (below!.elevation + below!.height)).toBe(100);
  });

  it('places a microwave on top of an oven', () => {
    const oven = createItem('oven', 100, 30, 0, { elevation: 80 });
    const mw = createItem('microwave', 100, 30, 0);
    expect(stackElevation({ ...mw, elevation: 1e6 }, [oven, mw])).toBe(140);
  });
});

describe('drawing', () => {
  it('locks nearly horizontal segments', () => {
    const r = snapDrawPoint({ x: 203, y: 7 }, [{ x: 0, y: 0 }], { grid: 5, ortho: true, threshold: 10 });
    expect(r.point).toEqual({ x: 205, y: 0 });
  });

  it('closes the outline on the first point', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    expect(snapDrawPoint({ x: 3, y: 4 }, pts, { grid: 5, ortho: true, threshold: 10 }).closing).toBe(true);
  });
});

describe('placement helpers', () => {
  it('finds a free spot next to existing cabinets', () => {
    const a = createItem('base-60', 30, 30, 0);
    const b = createItem('base-60', 0, 0, 0);
    const r = findFreeWallSpot(b, room, [a, b]);
    expect(r).toMatchObject({ x: 90, y: 30, rotation: 0 });
  });

  it('measures clearances to the walls', () => {
    const it = createItem('base-60', 100, 30, 0);
    const c = clearances(it, getWalls(room)).map((x) => Math.round(x.d)).sort((p, q) => p - q);
    expect(c).toEqual([70, 240, 270]);
  });
});

describe('openings', () => {
  const base = { kind: 'door' as const, height: 210, elevation: 0, flip: false, swingOut: false };
  const a = { ...base, id: 'a', wallIndex: 0, offset: 100, width: 80 };
  const b = { ...base, id: 'b', wallIndex: 0, offset: 300, width: 80 };

  it('keeps an opening inside its wall', () => {
    expect(fitOpening(a, -50, 'o0', 400, [a])).toBe(40);
    expect(fitOpening(a, 999, 'o0', 400, [a])).toBe(360);
  });

  it('refuses to overlap another opening on the same wall', () => {
    expect(fitOpening(a, 250, 'o0', 400, [a, b])).toBeNull();
    expect(fitOpening(a, 200, 'o0', 400, [a, b])).toBe(200);
    // Other walls don't matter.
    expect(fitOpening(a, 300, 'o1', 400, [a, b])).toBe(300);
  });
});

describe('item options', () => {
  it('shows the right material slots for built-in and freestanding dishwashers', () => {
    expect(visibleSlots({ type: 'dishwasher', options: { builtIn: true } })).toEqual(['front', 'top']);
    expect(visibleSlots({ type: 'dishwasher', options: { builtIn: false } })).toEqual(['finish']);
  });

  it('gives the fridge and freezer columns opposite hinges by default', () => {
    expect(createItem('fridge-tower', 0, 0).options?.hinge).toBe('left');
    expect(createItem('freezer-tower', 0, 0).options?.hinge).toBe('right');
  });
});

describe('interior walls', () => {
  const wall = (id: string, a: [number, number], b: [number, number]) => ({ id, a: { x: a[0], y: a[1] }, b: { x: b[0], y: b[1] }, thickness: 10 });
  const areas = (iw: ReturnType<typeof wall>[]) =>
    roomFaces({ room, interiorWalls: iw })
      .map((f) => Math.round(Math.abs(polygonArea(f))))
      .sort((p, q) => p - q);

  it('splits the house into rooms, including T-junctions, and ignores dangling walls', () => {
    expect(areas([])).toEqual([120000]);
    expect(areas([wall('a', [150, 0], [150, 300])])).toEqual([45000, 75000]);
    expect(areas([wall('a', [150, 0], [150, 300]), wall('b', [150, 120], [400, 120]), wall('c', [50, 200], [100, 200])])).toEqual([30000, 45000, 45000]);
  });

  it('finds the room around a label and its area', () => {
    const faces = roomFaces({ room, interiorWalls: [wall('a', [150, 0], [150, 300])] });
    expect(zoneArea({ id: 'z', kind: 'bedroom', name: 'Quarto', x: 300, y: 100 }, faces)).toBeCloseTo(7.5);
    expect(zoneArea({ id: 'z', kind: 'bedroom', name: 'Quarto', x: 900, y: 100 }, faces)).toBeNull();
  });

  it('snaps a new wall to a point on an existing wall, keeping it horizontal', () => {
    const anchors = wallAnchors({ room, interiorWalls: [] });
    const lines = wallLines({ room, interiorWalls: [] });
    // Starting in the middle of the room and heading right, the wall ends on the right wall.
    const r = snapWallPoint({ x: 396, y: 152 }, { x: 200, y: 150 }, anchors, lines, { grid: 5, ortho: true, threshold: 10 });
    expect(r.point).toEqual({ x: 400, y: 150 });
    expect(r.onWall).toBe(true);
    // Near a corner, the corner wins.
    expect(snapWallPoint({ x: 6, y: 5 }, undefined, anchors, lines, { grid: 5, ortho: true, threshold: 10 }).point).toEqual({ x: 0, y: 0 });
    // In open space it is a free point.
    expect(snapWallPoint({ x: 201, y: 98 }, undefined, anchors, lines, { grid: 5, ortho: true, threshold: 10 }).onWall).toBe(false);
  });

  it('lets furniture snap against either face of an interior wall', () => {
    const iw = [wall('a', [200, 0], [200, 300])];
    const faces = snapWalls({ room, interiorWalls: iw });
    const it = createItem('base-60', 240, 150, 0);
    const r = snapItem(it, faces, [it], opts);
    // Wall face at x = 205; a 60 cm deep cabinet centres 30 cm from it, facing +x.
    expect(r.x).toBe(235);
    expect(r.rotation).toBe(270);
  });

  it('keeps openings on interior walls separate from outer walls', () => {
    const iw = wall('a', [200, 0], [200, 300]);
    const hosts = wallHosts({ room, interiorWalls: [iw] });
    expect(hosts.map((h) => h.key)).toEqual(['o0', 'o1', 'o2', 'o3', 'a']);
    const door = { id: 'd', kind: 'door' as const, wallIndex: 0, interiorWallId: 'a', offset: 100, width: 80, height: 210, elevation: 0, flip: false, swingOut: false };
    const outerDoor = { ...door, id: 'e', interiorWallId: undefined };
    expect(hostKey(door)).toBe('a');
    // A door on outer wall 0 at the same offset doesn't block one on the interior wall.
    expect(fitOpening(door, 100, 'a', 300, [door, outerDoor])).toBe(100);
  });
});
