import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Undo2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { add, mul, v } from '../geometry';
import { useStore } from '../store';
import type { Vec2 } from '../types';

/** Floating toolbar shown while drawing the room outline. */
export function DrawToolbar() {
  const draft = useStore((s) => s.draft);
  const st = useStore.getState;
  const [len, setLen] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = () => {
    const p = st().project;
    if (draft.length < 3) return;
    st().setProject({ ...p, room: { ...p.room, points: draft, closed: true }, openings: [] });
  };

  const addDir = (dir: Vec2) => {
    const n = parseFloat(len.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      inputRef.current?.focus();
      return;
    }
    const pts = draft.length ? draft : [v(0, 0)];
    const last = pts[pts.length - 1];
    const p = add(last, mul(dir, n));
    st().setDraft([...pts, v(Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10)]);
    setLen('');
  };

  // Typing digits anywhere while drawing goes into the length box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (/^[0-9]$/.test(e.key)) {
        inputRef.current?.focus();
      } else if (e.key === 'Enter' && draft.length >= 3) finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const msg =
    draft.length === 0
      ? 'Clique na grelha para marcar o primeiro canto da divisão.'
      : draft.length < 3
        ? 'Clique para marcar o próximo canto — ou escreva o comprimento e escolha a direção.'
        : 'Clique no primeiro canto (ou em “Concluir”) para fechar a divisão.';

  return (
    <div className="draw-bar">
      <p className="draw-msg">{msg}</p>
      <div className="draw-controls">
        <label className="draw-len">
          <input
            ref={inputRef}
            inputMode="decimal"
            placeholder="Comprimento"
            value={len}
            onChange={(e) => setLen(e.target.value.replace(/[^0-9.,]/g, ''))}
            onKeyDown={(e) => {
              const dirs: Record<string, Vec2> = { ArrowRight: v(1, 0), ArrowLeft: v(-1, 0), ArrowUp: v(0, -1), ArrowDown: v(0, 1) };
              if (dirs[e.key]) {
                e.preventDefault();
                addDir(dirs[e.key]);
              }
              if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
            }}
          />
          <span>cm</span>
        </label>
        <div className="dir-pad" title="Adicionar parede nesta direção (ou use as setas do teclado)">
          <button type="button" onClick={() => addDir(v(-1, 0))} aria-label="Esquerda">
            <ArrowLeft size={16} />
          </button>
          <button type="button" onClick={() => addDir(v(0, -1))} aria-label="Cima">
            <ArrowUp size={16} />
          </button>
          <button type="button" onClick={() => addDir(v(0, 1))} aria-label="Baixo">
            <ArrowDown size={16} />
          </button>
          <button type="button" onClick={() => addDir(v(1, 0))} aria-label="Direita">
            <ArrowRight size={16} />
          </button>
        </div>
        <button type="button" className="btn" onClick={() => st().setDraft(draft.slice(0, -1))} disabled={!draft.length}>
          <Undo2 size={15} /> <span className="hide-sm">Anular ponto</span>
        </button>
        <button type="button" className="btn primary" onClick={finish} disabled={draft.length < 3}>
          <Check size={15} /> Concluir
        </button>
        <button type="button" className="btn ghost" onClick={() => st().setTool('select')} aria-label="Cancelar desenho">
          <X size={15} /> <span className="hide-sm">Cancelar</span>
        </button>
      </div>
    </div>
  );
}
