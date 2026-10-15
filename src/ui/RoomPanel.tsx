import { BrickWall, PencilRuler, Square, Tag } from 'lucide-react';
import { useState } from 'react';
import { getWalls, polygonArea, roomFaces, zoneArea } from '../geometry';
import { ZONE_KINDS } from '../zones';
import { WALL_COLORS } from '../materials';
import { lRoom, rectRoom, useStore } from '../store';
import { NumberField, Section, Segmented, Toggle } from './controls';
import { MaterialPicker } from './MaterialPicker';
import { setWallLength } from './PropertiesPanel';

export function RoomPanel({ onStartDraw }: { onStartDraw?: () => void }) {
  const room = useStore((s) => s.project.room);
  const settings = useStore((s) => s.settings);
  const st = useStore.getState;
  const walls = getWalls(room);
  const [shape, setShape] = useState<'rect' | 'l'>('rect');
  const [w, setW] = useState(400);
  const [l, setL] = useState(300);
  const [cw, setCw] = useState(150);
  const [cl, setCl] = useState(120);
  const [keepItems, setKeepItems] = useState(true);
  const hasItems = useStore((s) => s.project.items.length > 0);
  const area = room.closed ? Math.abs(polygonArea(room.points)) / 10000 : 0;

  const applyShape = () => {
    const p = st().project;
    const r = shape === 'rect' ? rectRoom(w, l, p.room) : lRoom(w, l, Math.min(cw, w - 50), Math.min(cl, l - 50), p.room);
    st().setProject({ ...p, room: r, openings: p.openings.filter((o) => o.interiorWallId), items: keepItems ? p.items : [] });
  };

  return (
    <div className="room-panel">
      <Section title="Contorno exterior">
        <Segmented
          value={shape}
          onChange={setShape}
          options={[
            { value: 'rect', label: 'Retangular' },
            { value: 'l', label: 'Em L' },
          ]}
        />
        <div className="grid2">
          <NumberField label="Largura" value={w} min={100} max={3000} step={10} onChange={setW} />
          <NumberField label="Comprimento" value={l} min={100} max={3000} step={10} onChange={setL} />
          {shape === 'l' && (
            <>
              <NumberField label="Recorte largura" value={cw} min={20} max={w - 50} step={10} onChange={setCw} />
              <NumberField label="Recorte compr." value={cl} min={20} max={l - 50} step={10} onChange={setCl} />
            </>
          )}
        </div>
        {hasItems && <Toggle label="Manter os móveis já colocados" checked={keepItems} onChange={setKeepItems} />}
        <button type="button" className="btn primary block" onClick={applyShape}>
          <Square size={15} /> Criar divisão {w} × {l} cm
        </button>
        <div className="or">ou</div>
        <button
          type="button"
          className="btn block"
          onClick={() => {
            st().setViewMode('2d');
            st().setTool('draw');
            onStartDraw?.();
          }}
        >
          <PencilRuler size={15} /> Desenhar contorno à mão
        </button>
        <p className="muted small">Clique para marcar cada canto. As linhas alinham-se na horizontal/vertical e à grelha. Pode escrever o comprimento exato de cada parede.</p>
      </Section>

      {walls.length > 0 && (
        <Section title={`Paredes${room.closed ? ` · ${area.toFixed(2).replace('.', ',')} m²` : ''}`}>
          <div className="wall-list">
            {walls.map((wl) => (
              <div key={wl.index} className="wall-row">
                <button type="button" className="wall-tag" onClick={() => st().select({ kind: 'wall', index: wl.index })} title="Selecionar parede">
                  {wl.index + 1}
                </button>
                <NumberField label="" value={wl.length} min={10} max={5000} onChange={(len) => setWallLength(wl.index, len)} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <InteriorSection onStartDraw={onStartDraw} />

      <Section title="Paredes e teto">
        <div className="grid2">
          <NumberField label="Pé-direito" value={room.wallHeight} min={180} max={600} step={5} onChange={(h) => st().setRoom({ wallHeight: h })} />
          <NumberField label="Espessura" value={room.wallThickness} min={5} max={60} onChange={(t) => st().setRoom({ wallThickness: t })} />
        </div>
        <span className="field-label">Cor das paredes</span>
        <div className="color-row">
          {WALL_COLORS.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`color-dot ${room.wallColor === c.id ? 'on' : ''}`}
              style={{ background: c.id }}
              title={c.name}
              aria-label={c.name}
              onClick={() => st().setRoom({ wallColor: c.id })}
            />
          ))}
          <label className="color-dot custom" title="Outra cor">
            <input type="color" value={room.wallColor} onChange={(e) => st().setRoom({ wallColor: e.target.value }, false)} />
          </label>
        </div>
      </Section>

      <Section title="Pavimento geral">
        <MaterialPicker label="Chão" value={room.floorMaterial} categories={['tile', 'wood', 'stone']} onChange={(m) => st().setRoom({ floorMaterial: m })} />
      </Section>

      <Section title="Desenho e visualização">
        <span className="field-label">Grelha / snap</span>
        <Segmented
          size="sm"
          value={settings.grid}
          onChange={(g) => st().setSettings({ grid: g })}
          options={[1, 5, 10, 25, 50].map((g) => ({ value: g, label: `${g} cm` }))}
        />
        <Toggle label="Snap (grelha, paredes e móveis)" checked={settings.snap} onChange={(b) => st().setSettings({ snap: b })} hint="Mantenha Shift para desligar temporariamente" />
        <Toggle label="Alinhar na horizontal/vertical" checked={settings.ortho} onChange={(b) => st().setSettings({ ortho: b })} />
        <Toggle label="Mostrar cotas" checked={settings.showDims} onChange={(b) => st().setSettings({ showDims: b })} />
        <span className="field-label">Paredes em 3D</span>
        <Segmented
          size="sm"
          value={settings.wallsMode}
          onChange={(m) => st().setSettings({ wallsMode: m })}
          options={[
            { value: 'auto', label: 'Automático', title: 'Esconde as paredes entre a câmara e a cozinha' },
            { value: 'full', label: 'Todas' },
            { value: 'low', label: 'Baixas' },
          ]}
        />
      </Section>
    </div>
  );
}

function InteriorSection({ onStartDraw }: { onStartDraw?: () => void }) {
  const project = useStore((s) => s.project);
  const st = useStore.getState;
  const iwalls = project.interiorWalls ?? [];
  const zones = project.zones ?? [];
  const faces = roomFaces(project);
  return (
    <>
      <Section title={`Paredes interiores${iwalls.length ? ` · ${iwalls.length}` : ''}`}>
        <button
          type="button"
          className="btn primary block"
          onClick={() => {
            st().setViewMode('2d');
            st().setTool('wall');
            onStartDraw?.();
          }}
        >
          <BrickWall size={15} /> Desenhar paredes interiores
        </button>
        <p className="muted small">
          Comece num canto, numa parede ou num ponto livre. Cada clique acaba uma parede e começa a seguinte; ao tocar noutra parede, termina. Também pode desenhar muros fora da casa.
        </p>
      </Section>
      <Section title={`Divisões${zones.length ? ` · ${zones.length}` : ''}`}>
        {zones.length === 0 ? (
          <p className="muted small">
            Ponha uma etiqueta de divisão (catálogo → Divisões) dentro de cada espaço para ver o nome, a área e escolher o pavimento.
          </p>
        ) : (
          <div className="zone-list">
            {zones.map((z) => {
              const a = zoneArea(z, faces);
              return (
                <button key={z.id} type="button" className="zone-row" onClick={() => st().select({ kind: 'zone', id: z.id })}>
                  <span className="zone-dot" style={{ background: ZONE_KINDS[z.kind]?.tint }} />
                  <span className="zone-name">{z.name}</span>
                  <span className="zone-area">{a !== null ? `${a.toFixed(1).replace('.', ',')} m²` : '—'}</span>
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className="btn block" onClick={() => st().addItem('zone-other')}>
          <Tag size={15} /> Adicionar etiqueta de divisão
        </button>
      </Section>
    </>
  );
}
