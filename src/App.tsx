import {
  Box,
  BrickWall,
  Camera,
  CircleHelp,
  Copy,
  Download,
  Eye,
  FilePlus2,
  Grid2x2,
  LayoutGrid,
  Magnet,
  Maximize,
  Menu,
  PencilRuler,
  Redo2,
  RotateCw,
  Ruler,
  SlidersHorizontal,
  Sofa,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { PlanEditor } from './editor/PlanEditor';
import { fitOpening, hostOf, normAngle, round1, wallHosts } from './geometry';
import { emptyProject, exampleProject, houseExample, rectRoom, useSelectedItem, useStore } from './store';
import type { Project } from './types';
import { CatalogPanel } from './ui/CatalogPanel';
import { IconButton, NumberField, Segmented } from './ui/controls';
import { DrawToolbar, WallToolbar } from './ui/DrawToolbar';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { RoomPanel } from './ui/RoomPanel';
import type { Viewer3DHandle } from './viewer/Viewer3D';

const Viewer3D = lazy(() => import('./viewer/Viewer3D').then((m) => ({ default: m.Viewer3D })));

type Sheet = 'room' | 'catalog' | 'props' | null;

function useIsMobile() {
  const q = '(max-width: 899px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

export default function App() {
  const viewMode = useStore((s) => s.viewMode);
  const tool = useStore((s) => s.tool);
  const selection = useStore((s) => s.selection);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const welcomed = useStore((s) => s.welcomed);
  const settings = useStore((s) => s.settings);
  const projectName = useStore((s) => s.project.name);
  const st = useStore.getState;
  const isMobile = useIsMobile();
  const [leftTab, setLeftTab] = useState<'room' | 'catalog'>('catalog');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const viewer = useRef<Viewer3DHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      const s = st();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        s.duplicateSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.tool === 'draw') s.setDraft(s.draft.slice(0, -1));
        else if (s.tool === 'wall') s.setDraft([]);
        else s.deleteSelection();
      } else if (e.key === 'Escape') {
        if (s.tool === 'wall' && s.draft.length) s.setDraft([]);
        else if (s.tool !== 'select') s.setTool('select');
        else s.select(null);
      } else if (e.key.toLowerCase() === 'r' && !mod && s.selection?.kind === 'item') {
        const it = s.project.items.find((i) => i.id === (s.selection as { id: string }).id);
        if (it) s.updateItem(it.id, { rotation: normAngle(it.rotation + (e.shiftKey ? -90 : 90)) });
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && s.selection?.kind === 'opening') {
        // Doors and windows slide along their wall.
        e.preventDefault();
        const op = s.project.openings.find((o) => o.id === (s.selection as { id: string }).id);
        const wall = op && hostOf(op, wallHosts(s.project));
        if (!op || !wall) return;
        // Move in the on-screen direction of the key, whichever way the wall runs.
        const sign = Math.abs(wall.dir.x) >= Math.abs(wall.dir.y) ? Math.sign(wall.dir.x) : Math.sign(wall.dir.y);
        const delta = (e.key === 'ArrowRight' ? 1 : -1) * sign * (e.shiftKey ? 10 : 1);
        const off = fitOpening(op, op.offset + delta, wall.key, wall.length, s.project.openings);
        if (off !== null) s.updateOpening(op.id, { offset: off });
      } else if (e.key.startsWith('Arrow') && s.selection?.kind === 'item') {
        e.preventDefault();
        const it = s.project.items.find((i) => i.id === (s.selection as { id: string }).id);
        if (!it) return;
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        s.updateItem(it.id, { x: round1(it.x + dx), y: round1(it.y + dy) });
      } else if (e.key === '3' && !mod) {
        s.setViewMode(s.viewMode === '3d' ? '2d' : '3d');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st]);

  // On mobile, close the props sheet when the selection is cleared.
  useEffect(() => {
    if (!selection && sheet === 'props') setSheet(null);
  }, [selection, sheet]);

  const exportJson = () => {
    const p = st().project;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(p.name || 'cozinha').replace(/[^\w-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (f: File) => {
    try {
      const p = JSON.parse(await f.text()) as Project;
      if (!p || !p.room || !Array.isArray(p.room.points) || !Array.isArray(p.items)) throw new Error('formato');
      st().setProject({ ...emptyProject(), ...p, openings: p.openings ?? [] });
    } catch {
      setToast('Não foi possível abrir este ficheiro. Confirme que é um projeto exportado por esta aplicação.');
    }
  };

  const openSheet = (s: Sheet) => setSheet((cur) => (cur === s ? null : s));

  const leftPanel = (
    <>
      <Segmented
        value={leftTab}
        onChange={setLeftTab}
        options={[
          { value: 'room', label: <><Ruler size={15} /> Planta</> },
          { value: 'catalog', label: <><Sofa size={15} /> Catálogo</> },
        ]}
      />
      <div className="panel-scroll">{leftTab === 'room' ? <RoomPanel /> : <CatalogPanel />}</div>
    </>
  );

  return (
    <div className={`app ${isMobile ? 'mobile' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            <svg viewBox="0 0 64 64" width="26" height="26">
              <rect width="64" height="64" rx="14" fill="var(--accent)" />
              <path d="M14 46V24l18-10 18 10v22H14z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
              <rect x="24" y="32" width="16" height="14" fill="#fff" />
            </svg>
          </span>
          <input className="project-name" value={projectName} onChange={(e) => st().mutate((p) => ({ ...p, name: e.target.value }), false)} aria-label="Nome do projeto" />
        </div>
        <Segmented
          value={viewMode}
          onChange={(m) => st().setViewMode(m)}
          options={[
            { value: '2d', label: <><LayoutGrid size={15} /> Planta 2D</>, title: 'Planta (tecla 3 alterna)' },
            { value: '3d', label: <><Box size={15} /> Vista 3D</>, title: 'Vista 3D (tecla 3 alterna)' },
          ]}
        />
        <div className="top-actions">
          <IconButton title="Anular (Ctrl+Z)" onClick={() => st().undo()} disabled={!canUndo}>
            <Undo2 size={18} />
          </IconButton>
          <IconButton title="Refazer (Ctrl+Shift+Z)" onClick={() => st().redo()} disabled={!canRedo}>
            <Redo2 size={18} />
          </IconButton>
          <IconButton title="Ajuda e atalhos" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
          </IconButton>
          <div className="menu-wrap">
            <IconButton title="Menu" onClick={() => setMenuOpen(!menuOpen)} active={menuOpen}>
              <Menu size={18} />
            </IconButton>
            {menuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="menu" onClick={() => setMenuOpen(false)}>
                  <button type="button" onClick={() => st().setProject(emptyProject(rectRoom(400, 300)))} title="Pode anular com Ctrl+Z">
                    <FilePlus2 size={16} /> Novo projeto
                  </button>
                  <button type="button" onClick={() => st().setProject(houseExample())}>
                    <Eye size={16} /> Exemplo: casa completa
                  </button>
                  <button type="button" onClick={() => st().setProject(exampleProject())}>
                    <Eye size={16} /> Exemplo: cozinha
                  </button>
                  <hr />
                  <button type="button" onClick={exportJson}>
                    <Download size={16} /> Exportar projeto (.json)
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()}>
                    <Upload size={16} /> Abrir projeto…
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (st().viewMode !== '3d') {
                        st().setViewMode('3d');
                        setTimeout(() => viewer.current?.screenshot(), 900);
                      } else viewer.current?.screenshot();
                    }}
                  >
                    <Camera size={16} /> Guardar imagem 3D
                  </button>
                </div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
      </header>

      <div className="main">
        {!isMobile && <aside className="side left">{leftPanel}</aside>}

        <section className="stage">
          {viewMode === '2d' ? (
            <PlanEditor />
          ) : (
            <Suspense fallback={<div className="loading">A preparar a vista 3D…</div>}>
              <Viewer3D ref={viewer} />
            </Suspense>
          )}
          {tool === 'draw' && viewMode === '2d' && <DrawToolbar />}
          {tool === 'wall' && viewMode === '2d' && <WallToolbar />}

          <div className="stage-tools">
            {viewMode === '2d' ? (
              <>
                <IconButton title="Ajustar à divisão" onClick={() => st().fit()}>
                  <Maximize size={17} />
                </IconButton>
                <IconButton title="Snap (Shift desliga temporariamente)" active={settings.snap} onClick={() => st().setSettings({ snap: !settings.snap })}>
                  <Magnet size={17} />
                </IconButton>
                <IconButton title="Cotas" active={settings.showDims} onClick={() => st().setSettings({ showDims: !settings.showDims })}>
                  <Ruler size={17} />
                </IconButton>
                <IconButton title="Paredes interiores" active={tool === 'wall'} onClick={() => st().setTool(tool === 'wall' ? 'select' : 'wall')}>
                  <BrickWall size={17} />
                </IconButton>
                <IconButton title="Redesenhar o contorno exterior" active={tool === 'draw'} onClick={() => st().setTool(tool === 'draw' ? 'select' : 'draw')}>
                  <PencilRuler size={17} />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton title="Perspetiva" onClick={() => viewer.current?.setView('perspective')}>
                  <Box size={17} />
                </IconButton>
                <IconButton title="Vista de cima" onClick={() => viewer.current?.setView('top')}>
                  <Grid2x2 size={17} />
                </IconButton>
                <IconButton title="Vista de frente" onClick={() => viewer.current?.setView('front')}>
                  <Eye size={17} />
                </IconButton>
                <IconButton
                  title="Paredes: automático / todas / baixas"
                  onClick={() => st().setSettings({ wallsMode: settings.wallsMode === 'auto' ? 'full' : settings.wallsMode === 'full' ? 'low' : 'auto' })}
                >
                  <span className="walls-mode">{settings.wallsMode === 'auto' ? 'A' : settings.wallsMode === 'full' ? 'T' : 'B'}</span>
                </IconButton>
                <IconButton title="Guardar imagem" onClick={() => viewer.current?.screenshot()}>
                  <Camera size={17} />
                </IconButton>
              </>
            )}
          </div>

          {isMobile && selection && sheet !== 'props' && <MobileSelectionBar onEdit={() => setSheet('props')} />}
        </section>

        {!isMobile && (
          <aside className="side right">
            <div className="panel-scroll">
              <PropertiesPanel />
            </div>
          </aside>
        )}
      </div>

      {isMobile && (
        <>
          {sheet && (
            <div className="sheet" role="dialog">
              <div className="sheet-head">
                <strong>{sheet === 'room' ? 'Planta' : sheet === 'catalog' ? 'Catálogo' : 'Propriedades'}</strong>
                <IconButton title="Fechar" onClick={() => setSheet(null)}>
                  <X size={18} />
                </IconButton>
              </div>
              <div className="panel-scroll">
                {sheet === 'room' && <RoomPanel onStartDraw={() => setSheet(null)} />}
                {sheet === 'catalog' && <CatalogPanel onAdded={() => setSheet(null)} />}
                {sheet === 'props' && <PropertiesPanel />}
              </div>
            </div>
          )}
          <nav className="bottom-nav">
            <button type="button" className={sheet === 'room' ? 'on' : ''} onClick={() => openSheet('room')}>
              <Ruler size={20} />
              Planta
            </button>
            <button type="button" className={sheet === 'catalog' ? 'on' : ''} onClick={() => openSheet('catalog')}>
              <Sofa size={20} />
              Catálogo
            </button>
            <button type="button" className={sheet === 'props' ? 'on' : ''} onClick={() => openSheet('props')} disabled={!selection}>
              <SlidersHorizontal size={20} />
              Editar
            </button>
          </nav>
        </>
      )}

      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      {(!welcomed || help) && (
        <Welcome
          help={help}
          onClose={() => {
            setHelp(false);
            st().setWelcomed();
          }}
          onDraw={() => {
            if (isMobile) setSheet(null);
            else setLeftTab('room');
          }}
        />
      )}
    </div>
  );
}

function MobileSelectionBar({ onEdit }: { onEdit: () => void }) {
  const it = useSelectedItem();
  const st = useStore.getState;
  return (
    <div className="sel-bar">
      <span className="sel-name">{it ? it.name : 'Selecionado'}</span>
      {it && (
        <IconButton title="Rodar 90°" onClick={() => st().updateItem(it.id, { rotation: normAngle(it.rotation + 90) })}>
          <RotateCw size={17} />
        </IconButton>
      )}
      {it && (
        <IconButton title="Duplicar" onClick={() => st().duplicateSelection()}>
          <Copy size={17} />
        </IconButton>
      )}
      <IconButton title="Apagar" variant="danger" onClick={() => st().deleteSelection()}>
        <Trash2 size={17} />
      </IconButton>
      <button type="button" className="btn primary sm" onClick={onEdit}>
        <SlidersHorizontal size={15} /> Editar
      </button>
    </div>
  );
}

function Welcome({ help, onClose, onDraw }: { help: boolean; onClose: () => void; onDraw: () => void }) {
  const st = useStore.getState;
  const [w, setW] = useState(400);
  const [l, setL] = useState(300);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <button type="button" className="modal-close icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <h2>{help ? 'Como usar' : 'Bem-vindo ao planeador da casa'}</h2>
        <p className="muted">Desenhe a planta da casa com as medidas reais, divida-a com paredes interiores, mobile cada divisão, escolha os materiais e veja o resultado em 3D.</p>
        {!help && (
          <div className="welcome-options">
            <div className="welcome-card">
              <h3>1 · Começar por um retângulo</h3>
              <div className="grid2">
                <NumberField label="Largura" value={w} min={100} max={3000} step={10} onChange={setW} />
                <NumberField label="Comprimento" value={l} min={100} max={3000} step={10} onChange={setL} />
              </div>
              <button
                type="button"
                className="btn primary block"
                onClick={() => {
                  st().setProject(emptyProject(rectRoom(w, l)));
                  onClose();
                }}
              >
                Começar com {w} × {l} cm
              </button>
            </div>
            <div className="welcome-card">
              <h3>2 · Desenhar o contorno</h3>
              <p className="muted small">Para casas ou divisões com formas irregulares. Marque os cantos com cliques ou escreva as medidas de cada parede.</p>
              <button
                type="button"
                className="btn block"
                onClick={() => {
                  st().setProject(emptyProject({ ...rectRoom(400, 300), points: [], closed: false }));
                  st().setTool('draw');
                  onDraw();
                  onClose();
                }}
              >
                <PencilRuler size={15} /> Desenhar
              </button>
            </div>
            <div className="welcome-card">
              <h3>3 · Explorar um exemplo</h3>
              <p className="muted small">Uma casa com cozinha, sala, quarto, casa de banho e escritório, ou só uma cozinha completa.</p>
              <div className="btn-row" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    st().setProject(houseExample());
                    onClose();
                  }}
                >
                  <Eye size={15} /> Casa
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    st().setProject(exampleProject());
                    onClose();
                  }}
                >
                  <Eye size={15} /> Cozinha
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="help-grid">
          <div>
            <h4>Planta 2D</h4>
            <ul>
              <li>Arraste móveis do catálogo para a planta. Encostam e rodam automaticamente para a parede mais próxima e alinham com os vizinhos.</li>
              <li>Arraste o fundo para mover a vista; roda do rato ou dois dedos para zoom.</li>
              <li>Arraste os cantos ou as paredes para ajustar o contorno; o “+” numa parede selecionada cria um novo canto.</li>
              <li>Paredes interiores: botão com tijolos na barra da planta. Comece num ponto de qualquer parede (ou livre) e clique para cada troço.</li>
              <li>Etiquetas de divisão (catálogo → Divisões) mostram o nome e a área de cada espaço e definem o seu pavimento.</li>
              <li>Linhas tracejadas = elementos em altura (móveis de parede, suspensos, exaustores).</li>
            </ul>
          </div>
          <div>
            <h4>Altura e empilhamento</h4>
            <ul>
              <li>Cada elemento tem distância ao chão, ao teto e ao elemento por baixo — por exemplo, um móvel suspenso a 100 cm acima da ilha.</li>
              <li>“Sobre o de baixo” pousa o elemento em cima do que está por baixo (micro-ondas sobre o forno).</li>
              <li>Clique de novo no mesmo sítio para selecionar o elemento que está por baixo.</li>
            </ul>
          </div>
          <div>
            <h4>Atalhos</h4>
            <ul className="kbd-list">
              <li><kbd>R</kbd> rodar 90° · <kbd>Shift</kbd>+<kbd>R</kbd> ao contrário</li>
              <li><kbd>Ctrl</kbd>+<kbd>D</kbd> duplicar · <kbd>Del</kbd> apagar</li>
              <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> anular / refazer</li>
              <li><kbd>Setas</kbd> mover 1 cm (com <kbd>Shift</kbd> 10 cm)</li>
              <li><kbd>Shift</kbd> ao arrastar: sem snap · <kbd>Espaço</kbd>+arrastar: mover vista</li>
              <li><kbd>3</kbd> alternar 2D / 3D</li>
            </ul>
          </div>
        </div>
        <p className="muted small">O projeto é guardado automaticamente neste navegador. Use o menu para exportar e partilhar.</p>
      </div>
    </div>
  );
}
