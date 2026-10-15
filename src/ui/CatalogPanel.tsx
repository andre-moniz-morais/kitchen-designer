import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATALOG, CATALOG_FILTERS, CATEGORY_NAMES, type CatalogCategory, type CatalogEntry } from '../catalog';
import { ZONE_KINDS } from '../zones';
import { PlanSymbol } from '../editor/PlanSymbol';
import { findFreeWallSpot, getWalls } from '../geometry';
import { useStore } from '../store';

function Thumb({ e }: { e: CatalogEntry }) {
  if (e.zone) {
    return (
      <svg viewBox="-60 -40 120 80" className="cat-thumb">
        <rect x={-50} y={-30} width={100} height={60} rx={4} fill={ZONE_KINDS[e.zone].tint} stroke="var(--wall)" strokeWidth={4} />
        <rect x={-32} y={-11} width={64} height={22} rx={4} fill="#fff" stroke="rgba(0,0,0,0.15)" />
        <text y={4} fontSize={10} textAnchor="middle" fontWeight={700} fill="#2b2f36">
          m²
        </text>
      </svg>
    );
  }
  if (e.opening) {
    return (
      <svg viewBox="-60 -40 120 80" className="cat-thumb">
        <rect x={-58} y={-8} width={116} height={16} fill="var(--wall)" />
        <rect x={-35} y={-8} width={70} height={16} fill={e.opening === 'window' ? '#dfeaf2' : 'var(--floor)'} stroke="#2f343b" strokeWidth={1} />
        {e.opening === 'door-ext' && <line x1={-35} y1={-8} x2={35} y2={-8} stroke="#2f343b" strokeWidth={3} />}
        {(e.opening === 'door' || e.opening === 'door-ext') && (
          <>
            <line x1={-35} y1={8} x2={-35} y2={38} stroke="#2f343b" strokeWidth={e.opening === 'door-ext' ? 4 : 2} />
            <path d="M-35 38A70 70 0 0 0 35 8" fill="none" stroke="#2f343b" strokeDasharray="4 3" />
          </>
        )}
        {e.opening === 'window' && <line x1={-35} y1={0} x2={35} y2={0} stroke="#2f343b" />}
      </svg>
    );
  }
  const pad = 8;
  // Single-door columns show their door swing in front, so frame that too.
  const swing = e.options?.hinge ? e.width : 0;
  const w = e.width + pad * 2;
  const d = Math.max(e.depth, 20) + swing + pad * 2;
  const s = Math.max(w, d);
  return (
    <svg viewBox={`${-s / 2} ${-s / 2 + swing / 2} ${s} ${s}`} className="cat-thumb">
      <PlanSymbol item={{ type: e.id, width: e.width, depth: e.depth, materials: e.defaults, elevation: 0, height: e.height, options: e.options }} scale={0.6 * (80 / s)} />
    </svg>
  );
}

export function CatalogPanel({ onAdded }: { onAdded?: () => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(() => {
    try {
      return localStorage.getItem('catalog-filter') ?? 'all';
    } catch {
      return 'all';
    }
  });
  const pickFilter = (id: string) => {
    setFilter(id);
    try {
      localStorage.setItem('catalog-filter', id);
    } catch {
      /* storage unavailable */
    }
  };
  const groups = useMemo(() => {
    const f = CATALOG_FILTERS.find((x) => x.id === filter) ?? CATALOG_FILTERS[0];
    const inFilter = (c: CatalogEntry) => f.id === 'all' || f.categories.includes(c.category) || !!f.extra?.includes(c.id);
    const query = q.trim().toLowerCase();
    const list = CATALOG.filter((c) => (query ? c.name.toLowerCase().includes(query) || CATEGORY_NAMES[c.category].toLowerCase().includes(query) : inFilter(c)));
    const map = new Map<CatalogCategory, CatalogEntry[]>();
    for (const c of list) map.set(c.category, [...(map.get(c.category) ?? []), c]);
    return [...map.entries()];
  }, [q, filter]);

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
      <div className="chips cat-filters" role="tablist" aria-label="Filtrar por divisão">
        {CATALOG_FILTERS.map((f) => (
          <button type="button" key={f.id} className={filter === f.id && !q ? 'on' : ''} onClick={() => (setQ(''), pickFilter(f.id))}>
            {f.label}
          </button>
        ))}
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
                <span className="cat-dims">{e.zone ? 'Etiqueta' : e.opening ? `${e.width} × ${e.height}` : `${e.width} × ${e.depth} × ${e.height}`}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
