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

export type OpeningKind = 'door' | 'window' | 'passage';

export interface Opening {
  id: string;
  kind: OpeningKind;
  wallIndex: number;
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

export type MaterialSlot = 'front' | 'body' | 'top' | 'finish';

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
}

export interface Project {
  version: 1;
  name: string;
  room: Room;
  items: Item[];
  openings: Opening[];
}

export type Selection =
  | { kind: 'item'; id: string }
  | { kind: 'opening'; id: string }
  | { kind: 'wall'; index: number }
  | { kind: 'vertex'; index: number }
  | null;

export type Tool = 'select' | 'draw';
export type ViewMode = '2d' | '3d';
