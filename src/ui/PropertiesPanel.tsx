import { ArrowDownToLine, ArrowUpToLine, Copy, FlipHorizontal2, Layers, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { ANCHOR_LABELS, getEntry, itemOptions, SLOT_CATEGORIES, SLOT_LABELS, visibleSlots } from '../catalog';
import { add, fitOpening, fmtCm, getWalls, itemBelow, mul, normAngle, rotate, round1, stackElevation, v } from '../geometry';
import { useSelectedItem, useSelectedOpening, useStore } from '../store';
import { isDoor, type Item, type MaterialSlot, type Opening, type OpeningKind } from '../types';
import { IconButton, NumberField, Section, Segmented, Toggle } from './controls';
import { MaterialPicker } from './MaterialPicker';

export function PropertiesPanel() {
  const item = useSelectedItem();
  const opening = useSelectedOpening();
  const selection = useStore((s) => s.selection);
  if (item) return <ItemProps it={item} />;
  if (opening) return <OpeningProps />;
  if (selection?.kind === 'wall') return <WallProps index={selection.index} />;
  if (selection?.kind === 'vertex') return <VertexProps index={selection.index} />;
  return <EmptyProps />;
}

function EmptyProps() {
  const items = useStore((s) => s.project.items);
  return (
    <div className="props-empty">
      <Layers size={28} strokeWidth={1.5} />
      <p>
        <strong>Nada selecionado</strong>
      </p>
      <p className="muted small">Clique num móvel, porta, parede ou canto da planta para editar as suas propriedades.</p>
      <p className="muted small">
        {items.length} {items.length === 1 ? 'elemento' : 'elementos'} na cozinha.
      </p>
      <ul className="tips">
        <li>Clique duas vezes no mesmo sítio para alternar entre móveis sobrepostos (ex.: móvel de parede sobre um móvel base).</li>
        <li>
          Mantenha <kbd>Shift</kbd> enquanto arrasta para desligar o snap.
        </li>
        <li>
          <kbd>R</kbd> roda 90°, <kbd>Ctrl</kbd>+<kbd>D</kbd> duplica, <kbd>Del</kbd> apaga.
        </li>
      </ul>
    </div>
  );
}

function ItemProps({ it }: { it: Item }) {
  const e = getEntry(it.type);
  const st = useStore.getState;
  const items = useStore((s) => s.project.items);
  const H = useStore((s) => s.project.room.wallHeight);
  const up = (patch: Partial<Item>) => st().updateItem(it.id, patch);
  const below = itemBelow(it, items);
  const top = it.elevation + it.height;
  const ceilingGap = H - top;

  // Changing depth keeps the back edge where it is (so units stay against the wall).
  const setDepth = (d: number) => {
    const shift = rotate(v(0, (d - it.depth) / 2), it.rotation);
    const c = add(v(it.x, it.y), shift);
    up({ depth: d, x: round1(c.x), y: round1(c.y) });
  };
  // Ceiling-hung items keep their gap to the ceiling when their height changes.
  const setHeight = (h: number) => (e.anchor === 'ceiling' ? up({ height: h, elevation: Math.max(0, it.elevation - (h - it.height)) }) : up({ height: h }));
  const opts = itemOptions(it);
  const slots = visibleSlots(it);

  return (
    <div className="props">
      <div className="props-head">
        <input className="name-input" value={it.name} onChange={(ev) => st().updateItem(it.id, { name: ev.target.value }, false)} aria-label="Nome" />
        <span className="muted small">{e.name}</span>
        <div className="props-actions">
          <IconButton title="Rodar 90° à esquerda" onClick={() => up({ rotation: normAngle(it.rotation - 90) })}>
            <RotateCcw size={16} />
          </IconButton>
          <IconButton title="Rodar 90° à direita (R)" onClick={() => up({ rotation: normAngle(it.rotation + 90) })}>
            <RotateCw size={16} />
          </IconButton>
          <IconButton title="Duplicar (Ctrl+D)" onClick={() => st().duplicateSelection()}>
            <Copy size={16} />
          </IconButton>
          <IconButton title="Apagar (Del)" variant="danger" onClick={() => st().deleteSelection()}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      <Section title="Dimensões">
        <div className="grid3">
          <NumberField label="Largura" value={it.width} min={5} max={1000} onChange={(w) => up({ width: w })} />
          <NumberField label="Profund." value={it.depth} min={1} max={1000} onChange={setDepth} />
          <NumberField label="Altura" value={it.height} min={0.5} max={400} onChange={setHeight} />
        </div>
      </Section>

      {e.model === 'dishwasher' && (
        <Section title="Instalação">
          <Segmented
            value={opts.builtIn === false ? 'free' : 'built'}
            onChange={(v) => up({ options: { ...it.options, builtIn: v === 'built' }, height: v === 'built' ? 90 : 85 })}
            options={[
              { value: 'built', label: 'Encastrada', title: 'Escondida atrás de uma frente igual aos móveis, com tampo' },
              { value: 'free', label: 'Livre instalação', title: 'Máquina à vista, com acabamento próprio' },
            ]}
          />
          <p className="muted small">
            {opts.builtIn === false ? 'Máquina à vista com painel de comandos. Altura típica 85 cm.' : 'Frente igual à dos móveis e tampo contínuo da bancada. Altura típica 90 cm com tampo.'}
          </p>
        </Section>
      )}

      {opts.hinge && (
        <Section title="Dobradiças da porta (vista de frente)">
          <Segmented
            value={opts.hinge}
            onChange={(h) => up({ options: { ...it.options, hinge: h } })}
            options={[
              { value: 'left', label: 'À esquerda' },
              { value: 'right', label: 'À direita' },
            ]}
          />
          <p className="muted small">Visto de frente. Coloque a coluna frigorífico e a coluna congelador lado a lado com dobradiças em lados opostos para as portas abrirem para fora.</p>
        </Section>
      )}

      <Section title="Altura e empilhamento">
        <div className="grid2">
          <NumberField label="Distância ao chão" value={it.elevation} min={0} max={H} onChange={(z) => up({ elevation: z })} hint="Altura da base do elemento em relação ao chão" />
          <NumberField
            label="Distância ao teto"
            value={ceilingGap}
            min={0}
            max={H}
            onChange={(g) => up({ elevation: Math.max(0, round1(H - it.height - g)) })}
            hint="Espaço livre entre o topo do elemento e o teto"
          />
        </div>
        {below && (
          <NumberField
            label={`Distância a "${below.name}" (por baixo)`}
            value={it.elevation - (below.elevation + below.height)}
            min={0}
            max={H}
            onChange={(g) => up({ elevation: round1(below.elevation + below.height + g) })}
            hint="Espaço livre entre este elemento e o que está imediatamente por baixo"
          />
        )}
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => up({ elevation: 0 })}>
            <ArrowDownToLine size={15} /> No chão
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => up({ elevation: stackElevation({ ...it, elevation: 1e6 }, items) })}
            title="Pousa este elemento em cima do que estiver por baixo (ex.: micro-ondas sobre o forno)"
          >
            <Layers size={15} /> Sobre o de baixo
          </button>
          <button type="button" className="btn" onClick={() => up({ elevation: Math.max(0, H - it.height) })}>
            <ArrowUpToLine size={15} /> Junto ao teto
          </button>
        </div>
        <p className="muted small">
          Ocupa de {fmtCm(it.elevation)} a {fmtCm(top)} cm · pé-direito {fmtCm(H)} cm · fixação típica: {ANCHOR_LABELS[e.anchor].toLowerCase()}
        </p>
      </Section>

      <Section title="Posição">
        <div className="grid3">
          <NumberField label="X" value={it.x} onChange={(x) => up({ x })} />
          <NumberField label="Y" value={it.y} onChange={(y) => up({ y })} />
          <NumberField label="Rotação" value={it.rotation} unit="°" step={15} onChange={(r) => up({ rotation: normAngle(r) })} />
        </div>
      </Section>

      {slots.length > 0 && (
        <Section title="Materiais">
          {slots.map((slot: MaterialSlot) => (
            <MaterialPicker
              key={slot}
              label={SLOT_LABELS[slot]}
              value={it.materials[slot]}
              categories={SLOT_CATEGORIES[slot]}
              onChange={(m) => up({ materials: { ...it.materials, [slot]: m } })}
              extra={
                <button type="button" className="link-btn" onClick={() => st().applyMaterialToAll(slot, it.materials[slot] ?? '')}>
                  Aplicar “{SLOT_LABELS[slot].toLowerCase()}” a todos os elementos
                </button>
              }
            />
          ))}
        </Section>
      )}
    </div>
  );
}

const OPENING_NAMES: Record<OpeningKind, string> = { door: 'Porta interior', 'door-ext': 'Porta exterior', window: 'Janela', passage: 'Passagem' };

function OpeningProps() {
  const op = useSelectedOpening()!;
  const st = useStore.getState;
  const room = useStore((s) => s.project.room);
  const openings = useStore((s) => s.project.openings);
  const wall = getWalls(room)[op.wallIndex];
  const up = (p: Partial<Opening>) => st().updateOpening(op.id, p);
  const L = wall?.length ?? 0;
  // Keep the opening on its wall when its width or position changes.
  const setWidth = (w: number) => {
    const next = { ...op, width: Math.min(w, L) };
    const off = fitOpening(next, op.offset, op.wallIndex, L, openings);
    if (off !== null) up({ width: next.width, offset: off });
  };
  const setOffset = (centre: number) => {
    const off = fitOpening(op, centre, op.wallIndex, L, openings);
    if (off !== null) up({ offset: off });
  };
  const setKind = (k: OpeningKind) => {
    if (k === 'window') up({ kind: k, elevation: op.kind === 'window' ? op.elevation : 105, height: op.kind === 'window' ? op.height : 110 });
    else up({ kind: k, elevation: 0, height: Math.max(op.height, k === 'door-ext' ? 215 : 200) });
  };
  return (
    <div className="props">
      <div className="props-head">
        <strong className="name-static">{OPENING_NAMES[op.kind]}</strong>
        <span className="muted small">Parede {op.wallIndex + 1} · arraste ao longo das paredes para mover (ou use as setas ← →)</span>
        <div className="props-actions">
          <IconButton title="Apagar (Del)" variant="danger" onClick={() => st().deleteSelection()}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>
      <Section title="Tipo">
        <Segmented
          value={op.kind}
          onChange={setKind}
          wrap
          options={[
            { value: 'door', label: 'Porta interior' },
            { value: 'door-ext', label: 'Porta exterior' },
            { value: 'window', label: 'Janela' },
            { value: 'passage', label: 'Vão' },
          ]}
        />
      </Section>
      <Section title="Tamanho">
        <div className="grid2">
          <NumberField label="Largura" value={op.width} min={30} max={L || 1000} step={5} onChange={setWidth} />
          <NumberField label="Altura" value={op.height} min={20} max={room.wallHeight - op.elevation} step={5} onChange={(h) => up({ height: h })} />
          {op.kind === 'window' && (
            <NumberField
              label="Altura do peitoril"
              value={op.elevation}
              min={0}
              max={room.wallHeight - op.height}
              step={5}
              onChange={(z) => up({ elevation: z })}
              hint="Distância do chão até à base da janela"
            />
          )}
        </div>
      </Section>
      {wall && (
        <Section title="Posição na parede">
          <div className="grid2">
            <NumberField
              label="Até ao canto inicial"
              value={op.offset - op.width / 2}
              min={0}
              max={L - op.width}
              onChange={(d) => setOffset(d + op.width / 2)}
              hint="Distância do canto onde a parede começa até à aresta da abertura"
            />
            <NumberField
              label="Até ao canto final"
              value={L - op.offset - op.width / 2}
              min={0}
              max={L - op.width}
              onChange={(d) => setOffset(L - d - op.width / 2)}
              hint="Distância da aresta da abertura até ao canto onde a parede termina"
            />
          </div>
          <button type="button" className="btn" onClick={() => setOffset(L / 2)}>
            Centrar na parede
          </button>
        </Section>
      )}
      {isDoor(op.kind) && (
        <Section title="Abertura">
          <button type="button" className="btn" onClick={() => up({ flip: !op.flip })}>
            <FlipHorizontal2 size={15} /> Trocar lado das dobradiças
          </button>
          <Toggle label="Abre para fora da cozinha" checked={op.swingOut} onChange={(b) => up({ swingOut: b })} />
        </Section>
      )}
    </div>
  );
}

function WallProps({ index }: { index: number }) {
  const room = useStore((s) => s.project.room);
  const walls = getWalls(room);
  const w = walls[index];
  if (!w) return <EmptyProps />;
  return (
    <div className="props">
      <div className="props-head">
        <strong className="name-static">Parede {index + 1}</strong>
        <span className="muted small">Arraste a parede para a mover · use o “+” para criar um novo canto</span>
      </div>
      <Section title="Medidas">
        <NumberField label="Comprimento" value={w.length} min={10} max={5000} onChange={(l) => setWallLength(index, l)} />
        <p className="muted small">
          A espessura ({room.wallThickness} cm) e a altura ({room.wallHeight} cm) aplicam-se a todas as paredes — altere-as no separador Divisão.
        </p>
      </Section>
    </div>
  );
}

function VertexProps({ index }: { index: number }) {
  const room = useStore((s) => s.project.room);
  const p = room.points[index];
  const st = useStore.getState;
  if (!p) return <EmptyProps />;
  const setP = (q: { x?: number; y?: number }) => st().setRoom({ points: room.points.map((pt, i) => (i === index ? { ...pt, ...q } : pt)) });
  return (
    <div className="props">
      <div className="props-head">
        <strong className="name-static">Canto {index + 1}</strong>
        <div className="props-actions">
          <IconButton title="Remover canto" variant="danger" onClick={() => st().deleteSelection()} disabled={room.points.length <= 3}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>
      <Section title="Posição">
        <div className="grid2">
          <NumberField label="X" value={p.x} onChange={(x) => setP({ x })} />
          <NumberField label="Y" value={p.y} onChange={(y) => setP({ y })} />
        </div>
      </Section>
    </div>
  );
}

/**
 * Sets a wall's length by moving its end point along the wall. If the next wall is perpendicular,
 * it is translated too, so rectangular rooms stay rectangular.
 */
export function setWallLength(index: number, length: number) {
  const st = useStore.getState();
  const room = st.project.room;
  const walls = getWalls(room);
  const w = walls[index];
  if (!w) return;
  const delta = mul(w.dir, length - w.length);
  const n = room.points.length;
  const next = walls[(index + 1) % walls.length];
  const perpendicular = next && Math.abs(w.dir.x * next.dir.x + w.dir.y * next.dir.y) < 0.05;
  const i1 = (index + 1) % n;
  const i2 = (index + 2) % n;
  const pts = room.points.map((p, i) => {
    if (i === i1 || (perpendicular && i === i2 && i2 !== index)) return v(round1(p.x + delta.x), round1(p.y + delta.y));
    return p;
  });
  st.setRoom({ points: pts });
}
