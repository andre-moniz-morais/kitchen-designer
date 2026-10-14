import type { MaterialSlot, OpeningKind } from './types';

export type ModelKind =
  | 'base'
  | 'drawers'
  | 'sink-base'
  | 'wall'
  | 'ceiling'
  | 'shelf'
  | 'tall'
  | 'oven-tower'
  | 'fridge-tower'
  | 'island'
  | 'countertop'
  | 'fridge'
  | 'fridge-american'
  | 'freezer'
  | 'chest-freezer'
  | 'oven'
  | 'microwave'
  | 'cooktop-induction'
  | 'cooktop-gas'
  | 'range'
  | 'hood-wall'
  | 'hood-island'
  | 'sink'
  | 'dishwasher'
  | 'washer'
  | 'dryer'
  | 'wine'
  | 'table'
  | 'chair'
  | 'stool'
  | 'pendant'
  | 'opening';

export type CatalogCategory = 'base' | 'wall' | 'tall' | 'island' | 'appliance' | 'furniture' | 'opening';

export const CATEGORY_NAMES: Record<CatalogCategory, string> = {
  base: 'Móveis base',
  wall: 'Móveis altos e suspensos',
  tall: 'Colunas',
  island: 'Ilhas e bancadas',
  appliance: 'Eletrodomésticos',
  furniture: 'Mobiliário',
  opening: 'Portas e janelas',
};

export type Anchor = 'floor' | 'counter' | 'wall' | 'ceiling';

export interface CatalogEntry {
  id: string;
  name: string;
  category: CatalogCategory;
  model: ModelKind;
  width: number;
  depth: number;
  height: number;
  elevation: number;
  anchor: Anchor;
  slots: MaterialSlot[];
  defaults: Partial<Record<MaterialSlot, string>>;
  snapToWall: boolean;
  opening?: OpeningKind;
  /** Short description shown on hover. */
  hint?: string;
}

const CAB = { front: 'white-matt', body: 'white-matt', top: 'carrara' } as const;
const CAB_NO_TOP = { front: 'white-matt', body: 'white-matt' } as const;
const STEEL = { finish: 'steel' } as const;

export const CATALOG: CatalogEntry[] = [
  // Base
  { id: 'base-60', name: 'Móvel base 1 porta', category: 'base', model: 'base', width: 60, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true, hint: 'Com rodapé e tampo de bancada' },
  { id: 'base-90', name: 'Móvel base 2 portas', category: 'base', model: 'base', width: 90, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true },
  { id: 'base-40', name: 'Móvel base estreito', category: 'base', model: 'base', width: 40, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true },
  { id: 'drawers-60', name: 'Gaveteiro 3 gavetas', category: 'base', model: 'drawers', width: 60, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true },
  { id: 'sink-base-90', name: 'Móvel com lava-loiça', category: 'base', model: 'sink-base', width: 90, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top', 'finish'], defaults: { ...CAB, finish: 'steel' }, snapToWall: true, hint: 'Cuba encastrada e torneira' },
  { id: 'dishwasher', name: 'Máquina de lavar loiça', category: 'base', model: 'dishwasher', width: 60, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'top'], defaults: { front: 'white-matt', top: 'carrara' }, snapToWall: true, hint: 'Integrável, com frente igual aos móveis' },
  { id: 'wine', name: 'Garrafeira', category: 'base', model: 'wine', width: 60, depth: 57, height: 82, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: { finish: 'steel-black' }, snapToWall: true },
  // Wall / ceiling
  { id: 'wall-60', name: 'Móvel de parede 1 porta', category: 'wall', model: 'wall', width: 60, depth: 35, height: 70, elevation: 145, anchor: 'wall', slots: ['front', 'body'], defaults: CAB_NO_TOP, snapToWall: true },
  { id: 'wall-90', name: 'Móvel de parede 2 portas', category: 'wall', model: 'wall', width: 90, depth: 35, height: 70, elevation: 145, anchor: 'wall', slots: ['front', 'body'], defaults: CAB_NO_TOP, snapToWall: true },
  { id: 'wall-tall-90', name: 'Móvel de parede até ao teto', category: 'wall', model: 'wall', width: 90, depth: 35, height: 90, elevation: 170, anchor: 'ceiling', slots: ['front', 'body'], defaults: CAB_NO_TOP, snapToWall: true },
  { id: 'ceiling-120', name: 'Móvel suspenso do teto', category: 'wall', model: 'ceiling', width: 120, depth: 40, height: 50, elevation: 190, anchor: 'ceiling', slots: ['front', 'body', 'finish'], defaults: { ...CAB_NO_TOP, finish: 'black-matt' }, snapToWall: false, hint: 'Pendurado do teto por tirantes, ideal sobre ilhas' },
  { id: 'shelf-90', name: 'Prateleira aberta', category: 'wall', model: 'shelf', width: 90, depth: 25, height: 4, elevation: 150, anchor: 'wall', slots: ['body'], defaults: { body: 'oak-natural' }, snapToWall: true },
  // Tall
  { id: 'tall-60', name: 'Coluna despenseiro', category: 'tall', model: 'tall', width: 60, depth: 60, height: 220, elevation: 0, anchor: 'floor', slots: ['front', 'body'], defaults: CAB_NO_TOP, snapToWall: true },
  { id: 'oven-tower', name: 'Coluna forno + micro-ondas', category: 'tall', model: 'oven-tower', width: 60, depth: 60, height: 220, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'finish'], defaults: { ...CAB_NO_TOP, finish: 'steel' }, snapToWall: true },
  { id: 'fridge-tower', name: 'Coluna frigorífico integrado', category: 'tall', model: 'fridge-tower', width: 60, depth: 60, height: 220, elevation: 0, anchor: 'floor', slots: ['front', 'body'], defaults: CAB_NO_TOP, snapToWall: true },
  // Island & counters
  { id: 'island-180', name: 'Ilha com zona de refeição', category: 'island', model: 'island', width: 180, depth: 100, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: false, hint: 'Tampo saliente de um dos lados para bancos' },
  { id: 'countertop', name: 'Tampo de bancada', category: 'island', model: 'countertop', width: 120, depth: 62, height: 4, elevation: 86, anchor: 'counter', slots: ['top'], defaults: { top: 'carrara' }, snapToWall: true, hint: 'Peça de tampo solta (pode ser usada como prateleira ou mesa)' },
  // Appliances
  { id: 'fridge', name: 'Frigorífico combinado', category: 'appliance', model: 'fridge', width: 60, depth: 66, height: 190, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: STEEL, snapToWall: true },
  { id: 'fridge-american', name: 'Frigorífico americano', category: 'appliance', model: 'fridge-american', width: 91, depth: 72, height: 178, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: STEEL, snapToWall: true },
  { id: 'freezer', name: 'Congelador vertical', category: 'appliance', model: 'freezer', width: 60, depth: 66, height: 185, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: { finish: 'enamel-white' }, snapToWall: true },
  { id: 'chest-freezer', name: 'Arca congeladora', category: 'appliance', model: 'chest-freezer', width: 100, depth: 65, height: 85, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: { finish: 'enamel-white' }, snapToWall: true },
  { id: 'oven', name: 'Forno encastrável', category: 'appliance', model: 'oven', width: 60, depth: 56, height: 60, elevation: 80, anchor: 'floor', slots: ['finish'], defaults: STEEL, snapToWall: true },
  { id: 'microwave', name: 'Micro-ondas encastrável', category: 'appliance', model: 'microwave', width: 60, depth: 40, height: 38, elevation: 140, anchor: 'floor', slots: ['finish'], defaults: STEEL, snapToWall: true },
  { id: 'microwave-free', name: 'Micro-ondas de bancada', category: 'appliance', model: 'microwave', width: 50, depth: 40, height: 30, elevation: 90, anchor: 'counter', slots: ['finish'], defaults: { finish: 'enamel-black' }, snapToWall: true },
  { id: 'cooktop-induction', name: 'Placa de indução', category: 'appliance', model: 'cooktop-induction', width: 60, depth: 52, height: 1, elevation: 90, anchor: 'counter', slots: [], defaults: {}, snapToWall: false, hint: 'Coloque por cima de um móvel base ou da ilha' },
  { id: 'cooktop-gas', name: 'Placa a gás', category: 'appliance', model: 'cooktop-gas', width: 75, depth: 52, height: 3, elevation: 90, anchor: 'counter', slots: ['finish'], defaults: STEEL, snapToWall: false },
  { id: 'range', name: 'Fogão com forno', category: 'appliance', model: 'range', width: 60, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: STEEL, snapToWall: true },
  { id: 'hood-wall', name: 'Exaustor de parede', category: 'appliance', model: 'hood-wall', width: 90, depth: 50, height: 12, elevation: 155, anchor: 'wall', slots: ['finish'], defaults: STEEL, snapToWall: true, hint: 'A chaminé estende-se até ao teto' },
  { id: 'hood-island', name: 'Exaustor de ilha', category: 'appliance', model: 'hood-island', width: 90, depth: 60, height: 12, elevation: 165, anchor: 'ceiling', slots: ['finish'], defaults: STEEL, snapToWall: false },
  { id: 'sink', name: 'Lava-loiça (cuba)', category: 'appliance', model: 'sink', width: 80, depth: 50, height: 1, elevation: 90, anchor: 'counter', slots: ['finish'], defaults: STEEL, snapToWall: false, hint: 'Cuba com torneira para colocar sobre bancadas e ilhas' },
  { id: 'washer', name: 'Máquina de lavar roupa', category: 'appliance', model: 'washer', width: 60, depth: 60, height: 85, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: { finish: 'enamel-white' }, snapToWall: true },
  { id: 'dryer', name: 'Máquina de secar roupa', category: 'appliance', model: 'dryer', width: 60, depth: 60, height: 85, elevation: 0, anchor: 'floor', slots: ['finish'], defaults: { finish: 'enamel-white' }, snapToWall: true },
  // Furniture
  { id: 'table', name: 'Mesa de refeição', category: 'furniture', model: 'table', width: 160, depth: 90, height: 75, elevation: 0, anchor: 'floor', slots: ['top', 'body'], defaults: { top: 'oak-natural', body: 'black-matt' }, snapToWall: false },
  { id: 'chair', name: 'Cadeira', category: 'furniture', model: 'chair', width: 45, depth: 50, height: 85, elevation: 0, anchor: 'floor', slots: ['body', 'top'], defaults: { body: 'black-matt', top: 'oak-natural' }, snapToWall: false },
  { id: 'stool', name: 'Banco alto', category: 'furniture', model: 'stool', width: 40, depth: 40, height: 75, elevation: 0, anchor: 'floor', slots: ['body', 'top'], defaults: { body: 'black-matt', top: 'walnut' }, snapToWall: false },
  { id: 'pendant', name: 'Candeeiro suspenso', category: 'furniture', model: 'pendant', width: 30, depth: 30, height: 25, elevation: 175, anchor: 'ceiling', slots: ['finish'], defaults: { finish: 'brass' }, snapToWall: false },
  // Openings
  { id: 'door', name: 'Porta', category: 'opening', model: 'opening', opening: 'door', width: 80, depth: 0, height: 210, elevation: 0, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
  { id: 'door-wide', name: 'Porta larga', category: 'opening', model: 'opening', opening: 'door', width: 100, depth: 0, height: 210, elevation: 0, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
  { id: 'window', name: 'Janela', category: 'opening', model: 'opening', opening: 'window', width: 120, depth: 0, height: 110, elevation: 105, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
  { id: 'window-tall', name: 'Janela de sacada', category: 'opening', model: 'opening', opening: 'window', width: 160, depth: 0, height: 220, elevation: 0, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
  { id: 'passage', name: 'Passagem / vão', category: 'opening', model: 'opening', opening: 'passage', width: 90, depth: 0, height: 210, elevation: 0, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
];

export const CATALOG_MAP: Record<string, CatalogEntry> = Object.fromEntries(CATALOG.map((c) => [c.id, c]));

export function getEntry(id: string): CatalogEntry {
  return CATALOG_MAP[id] ?? CATALOG[0];
}

export const SLOT_LABELS: Record<MaterialSlot, string> = {
  front: 'Frentes / portas',
  body: 'Estrutura',
  top: 'Tampo',
  finish: 'Acabamento',
};

/** Material categories allowed per slot. */
export const SLOT_CATEGORIES: Record<MaterialSlot, string[]> = {
  front: ['wood', 'solid', 'stone', 'metal'],
  body: ['wood', 'solid', 'metal', 'stone'],
  top: ['stone', 'wood', 'solid', 'metal'],
  finish: ['metal', 'solid', 'wood'],
};

export const ANCHOR_LABELS: Record<Anchor, string> = {
  floor: 'Chão',
  counter: 'Bancada',
  wall: 'Parede',
  ceiling: 'Teto',
};
