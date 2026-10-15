import type { ZoneKind } from './types';

export interface ZoneMeta {
  label: string;
  /** Floor material a new room of this kind starts with. */
  floor: string;
  /** Light tint used to shade the room in the 2D plan. */
  tint: string;
}

export const ZONE_KINDS: Record<ZoneKind, ZoneMeta> = {
  kitchen: { label: 'Cozinha', floor: 'floor-tile-white', tint: '#f3e3d6' },
  living: { label: 'Sala', floor: 'floor-oak-planks', tint: '#efe6d3' },
  dining: { label: 'Sala de jantar', floor: 'floor-oak-planks', tint: '#efe6d3' },
  bedroom: { label: 'Quarto', floor: 'floor-oak-light', tint: '#e4e9f1' },
  bathroom: { label: 'Casa de banho', floor: 'floor-tile-grey', tint: '#dcebef' },
  office: { label: 'Escritório', floor: 'floor-walnut', tint: '#e8e6f0' },
  pantry: { label: 'Despensa', floor: 'floor-tile-grey', tint: '#ece8df' },
  laundry: { label: 'Lavandaria', floor: 'floor-tile-white', tint: '#e2edf0' },
  garage: { label: 'Garagem', floor: 'concrete', tint: '#e5e5e3' },
  gym: { label: 'Ginásio', floor: 'concrete-dark', tint: '#e3eadf' },
  hall: { label: 'Hall / corredor', floor: 'floor-herringbone', tint: '#f0ebe1' },
  stairs: { label: 'Escadas', floor: 'floor-oak-planks', tint: '#ebe6dc' },
  other: { label: 'Divisão', floor: 'floor-oak-planks', tint: '#eeeeea' },
};
