import type { Item, ItemOptions, MaterialSlot, OpeningKind, ZoneKind } from './types';
import { ZONE_KINDS } from './zones';

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
  | 'freezer-tower'
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
  | 'table-round'
  | 'table-oval'
  | 'chair'
  | 'stool'
  | 'pendant'
  | 'opening'
  | 'zone'
  // Living room
  | 'sofa'
  | 'sofa-corner'
  | 'armchair'
  | 'coffee-table'
  | 'side-table'
  | 'tv-unit'
  | 'tv'
  | 'bookcase'
  | 'sideboard'
  | 'fireplace'
  | 'rug'
  | 'floor-lamp'
  | 'plant'
  | 'radiator'
  // Bedroom
  | 'bed'
  | 'crib'
  | 'nightstand'
  | 'wardrobe'
  | 'dresser'
  // Bathroom
  | 'toilet'
  | 'bidet'
  | 'vanity'
  | 'washbasin'
  | 'shower'
  | 'bathtub'
  | 'towel-rail'
  | 'mirror'
  | 'bath-cabinet'
  // Office
  | 'desk'
  | 'office-chair'
  | 'filing-cabinet'
  | 'monitor'
  // Storage, garage, gym
  | 'shelving'
  | 'pantry-shelf'
  | 'utility-sink'
  | 'car'
  | 'bike'
  | 'workbench'
  | 'garage-cabinet'
  | 'treadmill'
  | 'exercise-bike'
  | 'weight-bench'
  | 'dumbbell-rack'
  | 'power-rack'
  | 'yoga-mat'
  // Stairs
  | 'stairs-straight'
  | 'stairs-l'
  | 'stairs-spiral';

export type CatalogCategory =
  | 'zone'
  | 'base'
  | 'wall'
  | 'tall'
  | 'island'
  | 'appliance'
  | 'furniture'
  | 'living'
  | 'bedroom'
  | 'bathroom'
  | 'office'
  | 'storage'
  | 'garage'
  | 'gym'
  | 'stairs'
  | 'decor'
  | 'opening';

export const CATEGORY_NAMES: Record<CatalogCategory, string> = {
  zone: 'Divisões (etiquetas)',
  base: 'Cozinha · móveis base',
  wall: 'Cozinha · móveis altos e suspensos',
  tall: 'Cozinha · colunas',
  island: 'Cozinha · ilhas e bancadas',
  appliance: 'Eletrodomésticos',
  furniture: 'Mesas, cadeiras e iluminação',
  living: 'Sala',
  bedroom: 'Quarto',
  bathroom: 'Casa de banho',
  office: 'Escritório',
  storage: 'Despensa e lavandaria',
  garage: 'Garagem',
  gym: 'Ginásio',
  stairs: 'Escadas',
  decor: 'Decoração',
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
  /** Room label instead of a piece of furniture. */
  zone?: ZoneKind;
  options?: ItemOptions;
  /** Short description shown on hover. */
  hint?: string;
}

const CAB = { front: 'white-matt', body: 'white-matt', top: 'carrara' } as const;
const CAB_NO_TOP = { front: 'white-matt', body: 'white-matt' } as const;
const STEEL = { finish: 'steel' } as const;

type Extra = Partial<Pick<CatalogEntry, 'elevation' | 'anchor' | 'snapToWall' | 'hint' | 'options'>>;
/** Compact constructor for the whole-house catalogue. */
const I = (
  id: string,
  name: string,
  category: CatalogCategory,
  model: ModelKind,
  [width, depth, height]: [number, number, number],
  defaults: Partial<Record<MaterialSlot, string>>,
  extra: Extra = {},
): CatalogEntry => ({
  id,
  name,
  category,
  model,
  width,
  depth,
  height,
  elevation: extra.elevation ?? 0,
  anchor: extra.anchor ?? 'floor',
  slots: Object.keys(defaults) as MaterialSlot[],
  defaults,
  snapToWall: extra.snapToWall ?? true,
  hint: extra.hint,
  options: extra.options,
});

const ZONE_ENTRIES: CatalogEntry[] = (Object.keys(ZONE_KINDS) as ZoneKind[]).map((k) => ({
  id: `zone-${k}`,
  name: ZONE_KINDS[k].label,
  category: 'zone',
  model: 'zone',
  width: 0,
  depth: 0,
  height: 0,
  elevation: 0,
  anchor: 'floor',
  slots: [],
  defaults: {},
  snapToWall: false,
  zone: k,
  hint: 'Arraste para dentro de uma divisão: mostra o nome e a área, e define o pavimento',
}));

const HOUSE: CatalogEntry[] = [
  // Sala
  I('sofa-3', 'Sofá 3 lugares', 'living', 'sofa', [220, 95, 82], { fabric: 'linen-grey', body: 'walnut' }),
  I('sofa-2', 'Sofá 2 lugares', 'living', 'sofa', [170, 95, 82], { fabric: 'boucle', body: 'oak-natural' }),
  I('sofa-corner', 'Sofá de canto', 'living', 'sofa-corner', [280, 180, 82], { fabric: 'linen-natural', body: 'black-matt' }, { hint: 'Chaise longue do lado direito; rode ou espelhe com a rotação' }),
  I('armchair', 'Poltrona', 'living', 'armchair', [85, 85, 85], { fabric: 'velvet-green', body: 'walnut' }, { snapToWall: false }),
  I('coffee-table', 'Mesa de centro', 'living', 'coffee-table', [110, 60, 40], { top: 'oak-natural', body: 'black-matt' }, { snapToWall: false }),
  I('side-table', 'Mesa de apoio', 'living', 'side-table', [45, 45, 55], { top: 'carrara', body: 'brass' }, { snapToWall: false }),
  I('tv-unit', 'Móvel de TV', 'living', 'tv-unit', [180, 42, 50], { front: 'oak-natural', body: 'oak-natural' }),
  I('tv', 'Televisão 65"', 'living', 'tv', [145, 6, 84], {}, { elevation: 50, anchor: 'counter', hint: 'Coloque sobre o móvel de TV ou suba-a para ficar na parede' }),
  I('bookcase', 'Estante', 'living', 'bookcase', [100, 35, 200], { body: 'oak-natural' }),
  I('sideboard', 'Aparador', 'living', 'sideboard', [160, 45, 80], { front: 'walnut', body: 'walnut' }),
  I('fireplace', 'Lareira', 'living', 'fireplace', [120, 40, 110], { top: 'travertine' }),
  // Quarto
  I('bed-160', 'Cama de casal 160', 'bedroom', 'bed', [166, 212, 105], { body: 'oak-natural', fabric: 'linen-white' }, { hint: 'A cabeceira encosta à parede' }),
  I('bed-180', 'Cama king 180', 'bedroom', 'bed', [186, 212, 105], { body: 'walnut', fabric: 'linen-natural' }),
  I('bed-90', 'Cama individual 90', 'bedroom', 'bed', [96, 202, 90], { body: 'white-matt', fabric: 'velvet-blue' }),
  I('crib', 'Berço', 'bedroom', 'crib', [66, 126, 95], { body: 'white-matt' }),
  I('nightstand', 'Mesa de cabeceira', 'bedroom', 'nightstand', [45, 40, 55], { front: 'oak-natural', body: 'oak-natural' }),
  I('wardrobe-2', 'Roupeiro 2 portas', 'bedroom', 'wardrobe', [100, 60, 230], { front: 'white-matt', body: 'white-matt' }),
  I('wardrobe-3', 'Roupeiro 3 portas', 'bedroom', 'wardrobe', [150, 60, 230], { front: 'white-matt', body: 'white-matt' }),
  I('wardrobe-4', 'Roupeiro 4 portas', 'bedroom', 'wardrobe', [200, 60, 230], { front: 'oak-white', body: 'white-matt' }),
  I('dresser', 'Cómoda', 'bedroom', 'dresser', [120, 50, 85], { front: 'oak-natural', body: 'oak-natural' }),
  // Casa de banho
  I('toilet', 'Sanita', 'bathroom', 'toilet', [38, 68, 80], { finish: 'enamel-white' }),
  I('bidet', 'Bidé', 'bathroom', 'bidet', [38, 55, 40], { finish: 'enamel-white' }),
  I('vanity', 'Móvel de lavatório', 'bathroom', 'vanity', [80, 46, 85], { front: 'oak-natural', body: 'oak-natural', top: 'dekton-white' }),
  I('vanity-120', 'Móvel de lavatório duplo', 'bathroom', 'vanity', [120, 46, 85], { front: 'sage', body: 'sage', top: 'dekton-white' }),
  I('washbasin', 'Lavatório suspenso', 'bathroom', 'washbasin', [60, 45, 18], { finish: 'enamel-white' }, { elevation: 70 }),
  I('shower', 'Base de duche 90×90', 'bathroom', 'shower', [90, 90, 200], { finish: 'enamel-white' }, { hint: 'Com resguardo de vidro e coluna de duche' }),
  I('shower-120', 'Base de duche 120×80', 'bathroom', 'shower', [120, 80, 200], { finish: 'slate' }),
  I('bathtub', 'Banheira', 'bathroom', 'bathtub', [170, 75, 56], { finish: 'enamel-white' }),
  I('towel-rail', 'Toalheiro radiador', 'bathroom', 'towel-rail', [50, 10, 120], { finish: 'chrome' }, { elevation: 20 }),
  I('mirror', 'Espelho', 'bathroom', 'mirror', [80, 3, 70], { body: 'black-matt' }, { elevation: 120 }),
  I('bath-cabinet', 'Coluna de casa de banho', 'bathroom', 'bath-cabinet', [40, 35, 170], { front: 'oak-natural', body: 'oak-natural' }),
  // Escritório
  I('desk', 'Secretária', 'office', 'desk', [140, 70, 75], { top: 'oak-natural', body: 'white-matt' }),
  I('office-chair', 'Cadeira de escritório', 'office', 'office-chair', [62, 62, 110], { fabric: 'wool-charcoal', body: 'black-matt' }, { snapToWall: false }),
  I('filing-cabinet', 'Bloco de gavetas', 'office', 'filing-cabinet', [42, 55, 60], { front: 'white-matt', body: 'white-matt' }),
  I('monitor', 'Monitor', 'office', 'monitor', [62, 20, 45], {}, { elevation: 75, anchor: 'counter', snapToWall: false }),
  // Despensa e lavandaria
  I('pantry-shelf', 'Prateleiras de despensa', 'storage', 'pantry-shelf', [120, 35, 200], { body: 'pine' }),
  I('shelving', 'Estante metálica', 'storage', 'shelving', [90, 40, 180], { finish: 'aluminium' }),
  I('utility-sink', 'Tanque de lavar', 'storage', 'utility-sink', [60, 50, 85], { finish: 'enamel-white' }),
  // Garagem
  I('car', 'Automóvel', 'garage', 'car', [450, 185, 145], { finish: 'navy' }, { snapToWall: false }),
  I('bike', 'Bicicleta', 'garage', 'bike', [175, 60, 100], { finish: 'petrol' }, { snapToWall: false }),
  I('workbench', 'Bancada de trabalho', 'garage', 'workbench', [180, 70, 180], { top: 'beech', body: 'anthracite' }, { hint: 'Com painel de ferramentas' }),
  I('garage-cabinet', 'Armário metálico', 'garage', 'garage-cabinet', [100, 45, 200], { finish: 'light-grey' }),
  // Ginásio
  I('treadmill', 'Passadeira', 'gym', 'treadmill', [190, 85, 140], { finish: 'black-matt' }, { snapToWall: false }),
  I('exercise-bike', 'Bicicleta estática', 'gym', 'exercise-bike', [110, 55, 130], { finish: 'black-matt' }, { snapToWall: false }),
  I('weight-bench', 'Banco de musculação', 'gym', 'weight-bench', [130, 60, 45], { fabric: 'leather-black', body: 'black-matt' }, { snapToWall: false }),
  I('dumbbell-rack', 'Suporte de halteres', 'gym', 'dumbbell-rack', [120, 50, 90], { finish: 'black-matt' }),
  I('power-rack', 'Estrutura de musculação', 'gym', 'power-rack', [140, 140, 220], { finish: 'black-matt' }, { snapToWall: false }),
  I('yoga-mat', 'Tapete de yoga', 'gym', 'yoga-mat', [180, 60, 1], { fabric: 'petrol' }, { snapToWall: false }),
  // Escadas
  I('stairs-straight', 'Escada reta', 'stairs', 'stairs-straight', [90, 300, 270], { body: 'oak-natural', finish: 'black-matt' }, { hint: 'Sobe da frente para trás' }),
  I('stairs-l', 'Escada em L', 'stairs', 'stairs-l', [200, 220, 270], { body: 'oak-natural', finish: 'black-matt' }, { hint: 'Com patamar; sobe pela direita e vira para a esquerda' }),
  I('stairs-spiral', 'Escada de caracol', 'stairs', 'stairs-spiral', [160, 160, 270], { body: 'steel-black', finish: 'black-matt' }, { snapToWall: false }),
  // Decoração
  I('rug', 'Tapete', 'decor', 'rug', [200, 300, 1], { fabric: 'linen-natural' }, { snapToWall: false }),
  I('rug-small', 'Tapete pequeno', 'decor', 'rug', [140, 200, 1], { fabric: 'wool-charcoal' }, { snapToWall: false }),
  I('floor-lamp', 'Candeeiro de pé', 'decor', 'floor-lamp', [40, 40, 165], { finish: 'black-matt' }, { snapToWall: false }),
  I('plant', 'Planta em vaso', 'decor', 'plant', [45, 45, 120], { finish: 'terracotta' }, { snapToWall: false }),
  I('plant-small', 'Planta pequena', 'decor', 'plant', [30, 30, 60], { finish: 'white-matt' }, { snapToWall: false }),
  I('radiator', 'Radiador', 'decor', 'radiator', [80, 10, 60], { finish: 'enamel-white' }, { elevation: 15 }),
];

export const CATALOG: CatalogEntry[] = [
  ...ZONE_ENTRIES,
  // Base
  { id: 'base-60', name: 'Móvel base 1 porta', category: 'base', model: 'base', width: 60, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true, hint: 'Com rodapé e tampo de bancada' },
  { id: 'base-90', name: 'Móvel base 2 portas', category: 'base', model: 'base', width: 90, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true },
  { id: 'base-40', name: 'Móvel base estreito', category: 'base', model: 'base', width: 40, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true },
  { id: 'drawers-60', name: 'Gaveteiro 3 gavetas', category: 'base', model: 'drawers', width: 60, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: true },
  { id: 'sink-base-90', name: 'Móvel com lava-loiça', category: 'base', model: 'sink-base', width: 90, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top', 'finish'], defaults: { ...CAB, finish: 'steel' }, snapToWall: true, hint: 'Cuba encastrada e torneira' },
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
  // Island & counters
  { id: 'island-180', name: 'Ilha com zona de refeição', category: 'island', model: 'island', width: 180, depth: 100, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'body', 'top'], defaults: CAB, snapToWall: false, hint: 'Tampo saliente de um dos lados para bancos' },
  { id: 'countertop', name: 'Tampo de bancada', category: 'island', model: 'countertop', width: 120, depth: 62, height: 4, elevation: 86, anchor: 'counter', slots: ['top'], defaults: { top: 'carrara' }, snapToWall: true, hint: 'Peça de tampo solta (pode ser usada como prateleira ou mesa)' },
  // Appliances
  { id: 'dishwasher', name: 'Máquina de lavar loiça', category: 'appliance', model: 'dishwasher', width: 60, depth: 60, height: 90, elevation: 0, anchor: 'floor', slots: ['front', 'top', 'finish'], defaults: { front: 'white-matt', top: 'carrara', finish: 'steel' }, options: { builtIn: true }, snapToWall: true, hint: 'Encastrada (frente igual aos móveis) ou de livre instalação' },
  { id: 'fridge-tower', name: 'Coluna frigorífico encastrado', category: 'appliance', model: 'fridge-tower', width: 60, depth: 60, height: 220, elevation: 0, anchor: 'floor', slots: ['front', 'body'], defaults: CAB_NO_TOP, options: { hinge: 'left' }, snapToWall: true, hint: '1 porta; abre para o lado oposto à coluna congelador' },
  { id: 'freezer-tower', name: 'Coluna congelador encastrado', category: 'appliance', model: 'freezer-tower', width: 60, depth: 60, height: 220, elevation: 0, anchor: 'floor', slots: ['front', 'body'], defaults: CAB_NO_TOP, options: { hinge: 'right' }, snapToWall: true, hint: '1 porta; abre para o lado oposto à coluna frigorífico' },
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
  { id: 'table-round', name: 'Mesa redonda', category: 'furniture', model: 'table-round', width: 110, depth: 110, height: 75, elevation: 0, anchor: 'floor', slots: ['top', 'body'], defaults: { top: 'oak-natural', body: 'black-matt' }, snapToWall: false, hint: 'Pé central cónico, mais largo em baixo' },
  { id: 'table-oval', name: 'Mesa oval', category: 'furniture', model: 'table-oval', width: 180, depth: 100, height: 75, elevation: 0, anchor: 'floor', slots: ['top', 'body'], defaults: { top: 'oak-natural', body: 'black-matt' }, snapToWall: false, hint: 'Pé central cónico, mais largo em baixo' },
  { id: 'chair', name: 'Cadeira', category: 'furniture', model: 'chair', width: 45, depth: 50, height: 85, elevation: 0, anchor: 'floor', slots: ['body', 'top'], defaults: { body: 'black-matt', top: 'oak-natural' }, snapToWall: false },
  { id: 'stool', name: 'Banco alto', category: 'furniture', model: 'stool', width: 40, depth: 40, height: 75, elevation: 0, anchor: 'floor', slots: ['body', 'top'], defaults: { body: 'black-matt', top: 'walnut' }, snapToWall: false },
  { id: 'pendant', name: 'Candeeiro suspenso', category: 'furniture', model: 'pendant', width: 30, depth: 30, height: 25, elevation: 175, anchor: 'ceiling', slots: ['finish'], defaults: { finish: 'brass' }, snapToWall: false },
  // Openings
  { id: 'door', name: 'Porta interior', category: 'opening', model: 'opening', opening: 'door', width: 80, depth: 0, height: 210, elevation: 0, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
  { id: 'door-ext', name: 'Porta exterior', category: 'opening', model: 'opening', opening: 'door-ext', width: 90, depth: 0, height: 215, elevation: 0, anchor: 'wall', slots: [], defaults: {}, snapToWall: true, hint: 'Porta de entrada ou para o exterior' },
  { id: 'window', name: 'Janela', category: 'opening', model: 'opening', opening: 'window', width: 120, depth: 0, height: 110, elevation: 105, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
  { id: 'window-tall', name: 'Porta-janela', category: 'opening', model: 'opening', opening: 'window', width: 160, depth: 0, height: 220, elevation: 0, anchor: 'wall', slots: [], defaults: {}, snapToWall: true },
  ...HOUSE,
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
  fabric: 'Tecido / estofo',
};

/** Material categories allowed per slot. */
export const SLOT_CATEGORIES: Record<MaterialSlot, string[]> = {
  front: ['wood', 'solid', 'stone', 'metal'],
  body: ['wood', 'solid', 'metal', 'stone'],
  top: ['stone', 'wood', 'solid', 'metal'],
  finish: ['metal', 'solid', 'wood'],
  fabric: ['fabric', 'solid'],
};

export interface CatalogFilter {
  id: string;
  label: string;
  categories: CatalogCategory[];
  /** Entries from other categories that also belong here (e.g. washing machine in the laundry). */
  extra?: string[];
}

export const CATALOG_FILTERS: CatalogFilter[] = [
  { id: 'all', label: 'Tudo', categories: [] },
  { id: 'zones', label: 'Divisões', categories: ['zone'] },
  { id: 'kitchen', label: 'Cozinha', categories: ['base', 'wall', 'tall', 'island', 'appliance'], extra: ['table', 'table-round', 'chair', 'stool', 'pendant'] },
  { id: 'living', label: 'Sala', categories: ['living', 'furniture', 'decor'] },
  { id: 'bedroom', label: 'Quarto', categories: ['bedroom'], extra: ['mirror', 'rug', 'rug-small', 'floor-lamp', 'plant', 'plant-small', 'armchair', 'tv', 'radiator'] },
  { id: 'bathroom', label: 'Casa de banho', categories: ['bathroom'], extra: ['washer', 'dryer', 'radiator', 'plant-small'] },
  { id: 'office', label: 'Escritório', categories: ['office'], extra: ['bookcase', 'sideboard', 'armchair', 'floor-lamp', 'plant', 'rug-small', 'radiator'] },
  { id: 'storage', label: 'Despensa e lavandaria', categories: ['storage'], extra: ['washer', 'dryer', 'freezer', 'chest-freezer', 'tall-60', 'wine'] },
  { id: 'garage', label: 'Garagem', categories: ['garage'], extra: ['shelving', 'chest-freezer', 'freezer', 'washer', 'dryer', 'utility-sink'] },
  { id: 'gym', label: 'Ginásio', categories: ['gym'], extra: ['mirror', 'tv', 'plant', 'shelving'] },
  { id: 'stairs', label: 'Escadas', categories: ['stairs'] },
  { id: 'openings', label: 'Portas e janelas', categories: ['opening'] },
];

export const ANCHOR_LABELS: Record<Anchor, string> = {
  floor: 'Chão',
  counter: 'Bancada',
  wall: 'Parede',
  ceiling: 'Teto',
};

/** Material slots that apply to an item in its current configuration. */
export function visibleSlots(it: Pick<Item, 'type' | 'options'>): MaterialSlot[] {
  const e = getEntry(it.type);
  if (e.model === 'dishwasher') return it.options?.builtIn === false ? ['finish'] : ['front', 'top'];
  return e.slots;
}

export function itemOptions(it: Pick<Item, 'type' | 'options'>): ItemOptions {
  return { ...getEntry(it.type).options, ...it.options };
}
