export interface Vec2 {
  x: number;
  y: number;
}

/** Room outline. Points describe the INNER face of the walls, in cm (plan coordinates, y grows down). */
export interface Room {
  points: Vec2[];
  closed: boolean;
  wallThickness: number;
  wallHeight: number;
  floorMaterial: string;
  wallColor: string;
}

export type OpeningKind = 'door' | 'door-ext' | 'window' | 'passage';

export const isDoor = (k: OpeningKind) => k === 'door' || k === 'door-ext';

export interface Opening {
  id: string;
  kind: OpeningKind;
  /** Outer wall index (ignored when the opening sits on an interior wall). */
  wallIndex: number;
  /** Set when the opening sits on an interior wall. */
  interiorWallId?: string;
  /** Distance (cm) from the wall's start point to the opening centre. */
  offset: number;
  width: number;
  height: number;
  elevation: number;
  /** Door hinge on the other side. */
  flip: boolean;
  /** Door swings to the outside of the room. */
  swingOut: boolean;
}

/** A free-standing wall segment (centreline a→b), inside or outside the outer outline. */
export interface InteriorWall {
  id: string;
  a: Vec2;
  b: Vec2;
  thickness: number;
  /** Wall height in cm; undefined means full height (up to the ceiling). */
  height?: number;
}

export type ZoneKind =
  | 'kitchen'
  | 'living'
  | 'dining'
  | 'bedroom'
  | 'bathroom'
  | 'office'
  | 'pantry'
  | 'laundry'
  | 'garage'
  | 'gym'
  | 'hall'
  | 'stairs'
  | 'other';

/** A named room label. Its area and floor come from the space enclosed by walls around it. */
export interface Zone {
  id: string;
  kind: ZoneKind;
  name: string;
  x: number;
  y: number;
  floorMaterial?: string;
}

export type MaterialSlot = 'front' | 'body' | 'top' | 'finish' | 'fabric';

export interface ItemOptions {
  /** Dishwasher: integrated behind a cabinet front (true) or freestanding (false). */
  builtIn?: boolean;
  /** Single-door appliances: side of the hinges, as seen from the front. */
  hinge?: 'left' | 'right';
}

export interface Item {
  id: string;
  /** Catalog entry id. */
  type: string;
  name: string;
  /** Centre of the footprint, cm. */
  x: number;
  y: number;
  /** Degrees, clockwise in plan view. 0 = front faces +y (down on screen). */
  rotation: number;
  width: number;
  depth: number;
  height: number;
  /** Distance from the floor to the bottom of the item, cm. */
  elevation: number;
  materials: Partial<Record<MaterialSlot, string>>;
  options?: ItemOptions;
}

export interface Project {
  version: 1;
  name: string;
  room: Room;
  items: Item[];
  openings: Opening[];
  interiorWalls?: InteriorWall[];
  zones?: Zone[];
}

export type Selection =
  | { kind: 'item'; id: string }
  | { kind: 'opening'; id: string }
  | { kind: 'wall'; index: number }
  | { kind: 'vertex'; index: number }
  | { kind: 'iwall'; id: string }
  | { kind: 'zone'; id: string }
  | null;

/** select · draw the outer outline · draw interior walls */
export type Tool = 'select' | 'draw' | 'wall';
export type ViewMode = '2d' | '3d';
