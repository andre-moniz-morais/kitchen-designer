export type MaterialCategory = 'wood' | 'stone' | 'solid' | 'metal' | 'tile' | 'fabric';
export type Pattern =
  | 'wood'
  | 'marble'
  | 'granite'
  | 'concrete'
  | 'terrazzo'
  | 'slate'
  | 'travertine'
  | 'solid'
  | 'brushed'
  | 'tiles'
  | 'herringbone'
  | 'planks'
  | 'fabric'
  | 'leather';

export interface MaterialDef {
  id: string;
  name: string;
  category: MaterialCategory;
  pattern: Pattern;
  /** Base colour. */
  color: string;
  /** Secondary colours (grain, veins, speckles...). */
  accents?: string[];
  roughness: number;
  metalness?: number;
  /** Real-world size covered by one texture tile, in metres. */
  scale?: number;
  seed?: number;
}

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  wood: 'Madeiras',
  stone: 'Pedras',
  solid: 'Lacados & cores',
  metal: 'Metais',
  tile: 'Pavimentos',
  fabric: 'Tecidos e peles',
};

const fabric = (id: string, name: string, color: string, accent: string, roughness = 0.95, scale = 0.15): MaterialDef => ({
  id,
  name,
  category: 'fabric',
  pattern: 'fabric',
  color,
  accents: [accent],
  roughness,
  scale,
});

const wood = (id: string, name: string, color: string, grain: string, light: string, roughness = 0.6): MaterialDef => ({
  id,
  name,
  category: 'wood',
  pattern: 'wood',
  color,
  accents: [grain, light],
  roughness,
  scale: 1,
});

const marble = (id: string, name: string, color: string, veins: string[], roughness = 0.18): MaterialDef => ({
  id,
  name,
  category: 'stone',
  pattern: 'marble',
  color,
  accents: veins,
  roughness,
  scale: 1.4,
});

const granite = (id: string, name: string, color: string, specks: string[], roughness = 0.25): MaterialDef => ({
  id,
  name,
  category: 'stone',
  pattern: 'granite',
  color,
  accents: specks,
  roughness,
  scale: 0.6,
});

const solid = (id: string, name: string, color: string, roughness = 0.45): MaterialDef => ({
  id,
  name,
  category: 'solid',
  pattern: 'solid',
  color,
  roughness,
});

export const MATERIALS: MaterialDef[] = [
  // Madeiras
  wood('oak-natural', 'Carvalho natural', '#c49a6c', '#9c7148', '#dab78f'),
  wood('oak-white', 'Carvalho branqueado', '#ddd0bd', '#bba98f', '#ebe2d4'),
  wood('oak-smoked', 'Carvalho fumado', '#7a5a40', '#54392a', '#93725a'),
  wood('oak-rustic', 'Carvalho rústico', '#b08158', '#7e5435', '#cba07a', 0.75),
  wood('walnut', 'Nogueira americana', '#6b4630', '#46291b', '#8a5f45'),
  wood('walnut-light', 'Nogueira clara', '#94694a', '#6a4630', '#b48a68'),
  wood('beech', 'Faia', '#d9b48a', '#c09065', '#e8cba7'),
  wood('cherry', 'Cerejeira', '#a35f3c', '#7b3f24', '#bd7b55'),
  wood('pine', 'Pinho', '#e2c08a', '#c49a5c', '#f0d7aa', 0.7),
  wood('ash', 'Freixo', '#d7c4a3', '#b39e7c', '#e6d8bf'),
  wood('teak', 'Teca', '#a87a4a', '#7c5530', '#c29565'),
  wood('wenge', 'Wengué', '#3e2c22', '#24170f', '#58423a'),
  wood('ebony', 'Ébano', '#2a2220', '#141010', '#3d3330', 0.4),
  wood('bamboo', 'Bambu', '#d6b67c', '#b8955a', '#e6cd9c'),
  wood('mahogany', 'Mogno', '#7e3b26', '#5a2416', '#9a5038'),
  wood('maple', 'Ácer', '#e8d3b0', '#d0b48a', '#f3e5cc'),
  wood('elm', 'Olmo', '#a9805d', '#7d583b', '#c49c78'),
  wood('olive', 'Oliveira', '#b9a37a', '#6d5a3c', '#d4c39d'),
  wood('zebrano', 'Zebrano', '#c9ad7f', '#5e4529', '#dcc49a'),
  wood('chestnut', 'Castanho', '#8f5f3a', '#643f22', '#ab7a52'),
  // Pedras
  marble('carrara', 'Mármore Carrara', '#eceeef', ['#a8adb3', '#c7ccd1']),
  marble('calacatta', 'Mármore Calacatta', '#f4f1ea', ['#9c8a6c', '#c8b896']),
  marble('calacatta-gold', 'Calacatta Gold', '#f6f2e8', ['#b8954d', '#d8c08a']),
  marble('statuario', 'Mármore Statuario', '#f7f7f6', ['#6f7378', '#a9adb2']),
  marble('nero-marquina', 'Nero Marquina', '#1d1d1f', ['#e8e8e8', '#8c8c8c']),
  marble('emperador', 'Emperador escuro', '#4a3326', ['#c9a989', '#2d1d14']),
  marble('verde-guatemala', 'Verde Guatemala', '#1f3a2e', ['#9fc3ab', '#0f2219']),
  marble('rosa-portugal', 'Rosa Portugal (Estremoz)', '#e8d3c8', ['#c99c8c', '#b88674']),
  marble('lioz', 'Pedra Lioz', '#e7dcc6', ['#c7b392', '#d9c9a9'], 0.3),
  marble('onyx', 'Ónix mel', '#d9a65e', ['#f2d49b', '#a8722f'], 0.12),
  marble('quartz-white', 'Quartzo branco veio', '#f1f1ef', ['#c9c9c9', '#dedede'], 0.15),
  granite('granite-black', 'Granito preto absoluto', '#141416', ['#2a2a2e', '#3a3a40', '#08080a']),
  granite('granite-grey', 'Granito cinza pinhel', '#9a9a9c', ['#4a4a4e', '#d8d8d8', '#6b6b70']),
  granite('granite-star', 'Granito Star Galaxy', '#16161a', ['#c5a46a', '#e0d0a0', '#2c2c32']),
  granite('granite-rose', 'Granito rosa', '#c79a8a', ['#5a4846', '#e9d5cb', '#8a6a62']),
  granite('granite-kashmir', 'Granito Kashmir White', '#e6e1d9', ['#8b7f74', '#b9a99c', '#5d4e4a']),
  granite('quartz-sparkle', 'Quartzo cinza cintilante', '#5d5e62', ['#9a9ba0', '#3b3c40', '#c8c8cc'], 0.2),
  granite('quartz-cream', 'Quartzo creme', '#e7dfcf', ['#d2c6ae', '#f4efe4', '#bfb299'], 0.2),
  { id: 'concrete', name: 'Betão / Microcimento', category: 'stone', pattern: 'concrete', color: '#a3a19c', accents: ['#8b8984', '#b8b6b1'], roughness: 0.8, scale: 1.5 },
  { id: 'concrete-dark', name: 'Microcimento antracite', category: 'stone', pattern: 'concrete', color: '#55565a', accents: ['#424346', '#68696d'], roughness: 0.75, scale: 1.5 },
  { id: 'terrazzo', name: 'Terrazzo branco', category: 'stone', pattern: 'terrazzo', color: '#e8e4dc', accents: ['#9a8f84', '#c25b3a', '#4d5a5e', '#d8c9a8'], roughness: 0.3, scale: 0.6 },
  { id: 'terrazzo-dark', name: 'Terrazzo escuro', category: 'stone', pattern: 'terrazzo', color: '#3d3f42', accents: ['#e8e4dc', '#b6a58a', '#7d8a8f'], roughness: 0.3, scale: 0.6 },
  { id: 'slate', name: 'Ardósia', category: 'stone', pattern: 'slate', color: '#3f444a', accents: ['#2e3237', '#545a61'], roughness: 0.7, scale: 1 },
  { id: 'travertine', name: 'Travertino', category: 'stone', pattern: 'travertine', color: '#d8c5a5', accents: ['#bfa983', '#e8dbc3', '#a89070'], roughness: 0.55, scale: 1.2 },
  { id: 'dekton-white', name: 'Compacto branco mate', category: 'stone', pattern: 'concrete', color: '#ecebe8', accents: ['#e1dfdb', '#f4f3f1'], roughness: 0.55, scale: 1.5 },
  { id: 'dekton-black', name: 'Compacto preto mate', category: 'stone', pattern: 'concrete', color: '#232325', accents: ['#1b1b1d', '#2d2d30'], roughness: 0.6, scale: 1.5 },
  // Lacados / laminados
  solid('white-gloss', 'Branco brilho', '#f7f7f5', 0.12),
  solid('white-matt', 'Branco mate', '#f0efeb', 0.7),
  solid('ivory', 'Marfim', '#efe8d8', 0.5),
  solid('cashmere', 'Caxemira', '#d9cdbd', 0.6),
  solid('sand', 'Areia', '#cbb89a', 0.6),
  solid('light-grey', 'Cinza claro', '#c9cacc', 0.55),
  solid('stone-grey', 'Cinza pedra', '#8e8c86', 0.6),
  solid('anthracite', 'Cinza antracite', '#3a3d41', 0.55),
  solid('black-matt', 'Preto mate', '#1c1c1d', 0.75),
  solid('black-gloss', 'Preto brilho', '#141415', 0.1),
  solid('sage', 'Verde salva', '#9caf97', 0.65),
  solid('olive-green', 'Verde oliva', '#6b6e45', 0.6),
  solid('forest', 'Verde floresta', '#2f4a3a', 0.6),
  solid('navy', 'Azul marinho', '#24344d', 0.55),
  solid('petrol', 'Azul petróleo', '#2b5560', 0.55),
  solid('sky', 'Azul céu', '#a9c4d6', 0.55),
  solid('terracotta', 'Terracota', '#b5643f', 0.65),
  solid('burgundy', 'Bordeaux', '#5e2330', 0.55),
  solid('mustard', 'Mostarda', '#c79a2e', 0.6),
  solid('blush', 'Rosa pálido', '#e3c4bd', 0.6),
  // Metais
  { id: 'steel', name: 'Aço inox escovado', category: 'metal', pattern: 'brushed', color: '#c4c7ca', accents: ['#a9adb0', '#dcdfe1'], roughness: 0.32, metalness: 1, scale: 0.5 },
  { id: 'steel-black', name: 'Inox preto', category: 'metal', pattern: 'brushed', color: '#3a3b3d', accents: ['#2b2c2e', '#4a4b4e'], roughness: 0.35, metalness: 1, scale: 0.5 },
  { id: 'brass', name: 'Latão escovado', category: 'metal', pattern: 'brushed', color: '#c9a85c', accents: ['#a8873e', '#e0c27e'], roughness: 0.3, metalness: 1, scale: 0.5 },
  { id: 'copper', name: 'Cobre', category: 'metal', pattern: 'brushed', color: '#b87350', accents: ['#95573a', '#d08d6a'], roughness: 0.3, metalness: 1, scale: 0.5 },
  { id: 'chrome', name: 'Cromado', category: 'metal', pattern: 'solid', color: '#e6e8ea', roughness: 0.08, metalness: 1 },
  { id: 'aluminium', name: 'Alumínio', category: 'metal', pattern: 'brushed', color: '#b5b8bb', accents: ['#a0a3a6', '#c8cbce'], roughness: 0.4, metalness: 0.9, scale: 0.5 },
  { id: 'enamel-white', name: 'Esmalte branco', category: 'metal', pattern: 'solid', color: '#f3f3f1', roughness: 0.25 },
  { id: 'enamel-black', name: 'Vidro preto', category: 'metal', pattern: 'solid', color: '#111214', roughness: 0.08 },
  // Tecidos e peles
  fabric('linen-natural', 'Linho natural', '#cbbfa8', '#b3a68d'),
  fabric('linen-grey', 'Linho cinza', '#a9a7a2', '#918f8a'),
  fabric('linen-white', 'Linho branco', '#efede7', '#dedbd3'),
  fabric('boucle', 'Bouclé creme', '#e9e2d4', '#d2c8b5', 0.98, 0.08),
  fabric('wool-charcoal', 'Lã antracite', '#4a4c50', '#393b3f'),
  fabric('velvet-green', 'Veludo verde', '#3f5a48', '#2f4537', 0.7),
  fabric('velvet-blue', 'Veludo azul', '#2e4466', '#22334f', 0.7),
  fabric('velvet-rust', 'Veludo ferrugem', '#9a4e2e', '#7a3b21', 0.7),
  fabric('fabric-mustard', 'Tecido mostarda', '#c49a3a', '#a8822c'),
  fabric('fabric-blush', 'Tecido rosa velho', '#d6b0a6', '#bf968b'),
  { id: 'leather-cognac', name: 'Pele conhaque', category: 'fabric', pattern: 'leather', color: '#8e4f2a', accents: ['#6f3b1d', '#a8653b'], roughness: 0.55, scale: 0.4 },
  { id: 'leather-black', name: 'Pele preta', category: 'fabric', pattern: 'leather', color: '#202022', accents: ['#151517', '#2e2e31'], roughness: 0.5, scale: 0.4 },
  { id: 'leather-white', name: 'Pele branca', category: 'fabric', pattern: 'leather', color: '#ebe8e2', accents: ['#d8d4cc', '#f5f3ef'], roughness: 0.55, scale: 0.4 },
  // Pavimentos
  { id: 'floor-oak-planks', name: 'Soalho carvalho', category: 'tile', pattern: 'planks', color: '#b98d62', accents: ['#93683f', '#d2a983'], roughness: 0.6, scale: 2 },
  { id: 'floor-oak-light', name: 'Soalho carvalho claro', category: 'tile', pattern: 'planks', color: '#d6bc98', accents: ['#b99d77', '#e6d3b6'], roughness: 0.6, scale: 2 },
  { id: 'floor-walnut', name: 'Soalho nogueira', category: 'tile', pattern: 'planks', color: '#6e4a33', accents: ['#4c301f', '#8a6249'], roughness: 0.55, scale: 2 },
  { id: 'floor-herringbone', name: 'Espinha de peixe carvalho', category: 'tile', pattern: 'herringbone', color: '#c19468', accents: ['#9a6e45', '#d8b38c'], roughness: 0.6, scale: 1.2 },
  { id: 'floor-tile-white', name: 'Mosaico branco 60×60', category: 'tile', pattern: 'tiles', color: '#eeede9', accents: ['#c9c7c2'], roughness: 0.35, scale: 1.2 },
  { id: 'floor-tile-grey', name: 'Mosaico cinza 60×60', category: 'tile', pattern: 'tiles', color: '#9d9c98', accents: ['#7d7c78'], roughness: 0.45, scale: 1.2 },
  { id: 'floor-tile-black', name: 'Mosaico antracite 60×60', category: 'tile', pattern: 'tiles', color: '#3b3c3f', accents: ['#28292b'], roughness: 0.4, scale: 1.2 },
  { id: 'floor-hydraulic', name: 'Mosaico hidráulico', category: 'tile', pattern: 'tiles', color: '#e6e0d3', accents: ['#b9b2a3', '#2f4a5e', '#c2703d'], roughness: 0.4, scale: 0.4, seed: 7 },
  { id: 'floor-terracotta', name: 'Tijoleira', category: 'tile', pattern: 'tiles', color: '#b5653f', accents: ['#8c4a2b', '#c97a52'], roughness: 0.7, scale: 0.6 },
];

export const MATERIAL_MAP: Record<string, MaterialDef> = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

export function getMaterial(id: string | undefined): MaterialDef {
  return (id && MATERIAL_MAP[id]) || MATERIAL_MAP['white-matt'];
}

export const WALL_COLORS = [
  { id: '#f2f0eb', name: 'Branco quente' },
  { id: '#ffffff', name: 'Branco puro' },
  { id: '#e6e1d7', name: 'Linho' },
  { id: '#d8d6d0', name: 'Cinza pérola' },
  { id: '#b7bcb4', name: 'Verde cinza' },
  { id: '#c8d3d8', name: 'Azul névoa' },
  { id: '#e3cbb8', name: 'Pêssego' },
  { id: '#7d8a80', name: 'Eucalipto' },
  { id: '#4a525a', name: 'Ardósia' },
  { id: '#2f3540', name: 'Noite' },
];
