import { Minus, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = -100000,
  max = 100000,
  unit = 'cm',
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  hint?: string;
}) {
  const fmt = (n: number) => String(Math.round(n * 10) / 10);
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(fmt(value));
  }, [value, focused]);
  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(n)) {
      const c = Math.min(max, Math.max(min, n));
      if (Math.abs(c - value) > 1e-9) onChange(c);
      setText(fmt(c));
    } else setText(fmt(value));
  };
  return (
    <label className="field" title={hint}>
      <span className="field-label">{label}</span>
      <div className="num">
        <button type="button" className="num-btn" aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}>
          <Minus size={14} />
        </button>
        <input
          inputMode="decimal"
          value={text}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setText(fmt(value));
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {unit && <span className="num-unit">{unit}</span>}
        <button type="button" className="num-btn" aria-label={`Aumentar ${label}`} onClick={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}>
          <Plus size={14} />
        </button>
      </div>
    </label>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h3>{title}</h3>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, size }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; size?: 'sm' }) {
  return (
    <div className={`segmented ${size === 'sm' ? 'sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle" title={hint}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden>
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

export function IconButton({ title, onClick, children, disabled, active, variant }: { title: string; onClick?: () => void; children: ReactNode; disabled?: boolean; active?: boolean; variant?: 'danger' | 'primary' }) {
  return (
    <button type="button" className={`icon-btn ${active ? 'active' : ''} ${variant ?? ''}`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
