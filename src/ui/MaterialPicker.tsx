import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORY_LABELS, getMaterial, MATERIALS, type MaterialCategory } from '../materials';
import { materialThumb } from '../textures';

export function MaterialSwatch({ id, size = 36 }: { id: string | undefined; size?: number }) {
  const m = getMaterial(id);
  return <img className="swatch" src={materialThumb(m)} width={size} height={size} alt="" draggable={false} />;
}

/** Expandable material chooser: current material row, then a searchable grid grouped by category. */
export function MaterialPicker({
  label,
  value,
  categories,
  onChange,
  extra,
}: {
  label: string;
  value: string | undefined;
  categories: string[];
  onChange: (id: string) => void;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const current = getMaterial(value);
  const list = useMemo(
    () =>
      MATERIALS.filter(
        (m) => categories.includes(m.category) && (cat === 'all' || m.category === cat) && (!q || m.name.toLowerCase().includes(q.toLowerCase())),
      ),
    [categories, cat, q],
  );
  return (
    <div className={`mat-picker ${open ? 'open' : ''}`}>
      <button type="button" className="mat-current" onClick={() => setOpen(!open)} aria-expanded={open}>
        <MaterialSwatch id={current.id} />
        <span className="mat-current-text">
          <span className="field-label">{label}</span>
          <strong>{current.name}</strong>
        </span>
        <span className="mat-change">{open ? 'Fechar' : 'Alterar'}</span>
      </button>
      {open && (
        <div className="mat-panel">
          <div className="search">
            <Search size={14} />
            <input placeholder="Procurar material…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="chips">
            <button type="button" className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>
              Todos
            </button>
            {categories.map((c) => (
              <button type="button" key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
                {CATEGORY_LABELS[c as MaterialCategory]}
              </button>
            ))}
          </div>
          <div className="mat-grid">
            {list.map((m) => (
              <button type="button" key={m.id} className={`mat-cell ${m.id === current.id ? 'on' : ''}`} onClick={() => onChange(m.id)} title={m.name}>
                <span className="mat-cell-img">
                  <MaterialSwatch id={m.id} size={56} />
                  {m.id === current.id && (
                    <span className="mat-check">
                      <Check size={14} />
                    </span>
                  )}
                </span>
                <span className="mat-cell-name">{m.name}</span>
              </button>
            ))}
            {!list.length && <p className="muted">Nenhum material encontrado.</p>}
          </div>
          {extra}
        </div>
      )}
    </div>
  );
}
