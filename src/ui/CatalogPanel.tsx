import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATALOG, CATEGORY_NAMES, type CatalogCategory, type CatalogEntry } from '../catalog';
import { PlanSymbol } from '../editor/PlanSymbol';
import { findFreeWallSpot, getWalls } from '../geometry';
import { useStore } from '../store';

function Thumb({ e }: { e: CatalogEntry }) {
  if (e.opening) {
    return (
      <svg viewBox="-60 -40 120 80" className="cat-thumb">
        <rect x={-58} y={-8} width={116} height={16} fill="var(--wall)" />
        <rect x={-35} y={-8} width={70} height={16} fill={e.opening === 'window' ? '#dfeaf2' : 'var(--floor)'} stroke="#2f343b" strokeWidth={1} />
        {e.opening === 'door' && (
          <>
            <line x1={-35} y1={8} x2={-35} y2={38} stroke="#2f343b" strokeWidth={2} />
            <path d="M-35 38A70 70 0 0 0 35 8" fill="none" stroke="#2f343b" strokeDasharray="4 3" />
          </>
        )}
        {e.opening === 'window' && <line x1={-35} y1={0} x2={35} y2={0} stroke="#2f343b" />}
      </svg>
    );
  }
  const pad = 8;
  const w = e.width + pad * 2;
  const d = Math.max(e.depth, 20) + pad * 2;
  const s = Math.max(w, d);
  return (
    <svg viewBox={`${-s / 2} ${-s / 2} ${s} ${s}`} className="cat-thumb">
      <PlanSymbol item={{ type: e.id, width: e.width, depth: e.depth, materials: e.defaults, elevation: 0, height: e.height }} scale={0.6 * (80 / s)} />
    </svg>
  );
}

export function CatalogPanel({ onAdded }: { onAdded?: () => void }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const list = CATALOG.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || CATEGORY_NAMES[c.category].toLowerCase().includes(q.toLowerCase()));
    const map = new Map<CatalogCategory, CatalogEntry[]>();
    for (const c of list) map.set(c.category, [...(map.get(c.category) ?? []), c]);
    return [...map.entries()];
  }, [q]);

  const add = (e: CatalogEntry) => {
    const s = useStore.getState();
    if (!getWalls(s.project.room).length && e.opening) return;
    const it = s.addItem(e.id);
    // Wall-mounted pieces go to the first free spot along the walls so they're usable immediately.
    if (it && e.snapToWall) {
      const { room, items } = useStore.getState().project;
      const r = findFreeWallSpot(it, room, items);
      if (r) useStore.getState().updateItem(it.id, { x: r.x, y: r.y, rotation: r.rotation }, false);
    }
    onAdded?.();
  };

  return (
    <div className="catalog">
      <div className="search">
        <Search size={14} />
        <input placeholder="Procurar móveis e eletrodomésticos…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="muted small hint-desktop">Arraste para a planta ou clique para adicionar.</p>
      {groups.map(([cat, entries]) => (
        <div key={cat} className="cat-group">
          <h4>{CATEGORY_NAMES[cat]}</h4>
          <div className="cat-grid">
            {entries.map((e) => (
              <button
                type="button"
                key={e.id}
                className="cat-card"
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.setData('text/kitchen-item', e.id);
                  ev.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => add(e)}
                title={e.hint ?? e.name}
              >
                <Thumb e={e} />
                <span className="cat-name">{e.name}</span>
                <span className="cat-dims">
                  {e.opening ? `${e.width} × ${e.height}` : `${e.width} × ${e.depth} × ${e.height}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
