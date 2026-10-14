import { getEntry, itemOptions } from '../catalog';
import { getMaterial } from '../materials';
import type { Item } from '../types';

const NS = { vectorEffect: 'non-scaling-stroke' as const };

/** Colour an item shows from above: its countertop if any, otherwise its front/finish. */
export function planColor(it: Pick<Item, 'type' | 'materials'>) {
  const e = getEntry(it.type);
  const m = it.materials;
  if (e.model === 'cooktop-induction') return '#1a1b1e';
  const id = (e.slots.includes('top') && m.top) || m.front || m.finish || m.body;
  return getMaterial(id).color;
}

function isDark(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 120;
}

const LABELS: Partial<Record<string, string>> = {
  fridge: 'FRIG.',
  'fridge-american': 'FRIG.',
  freezer: 'CONG.',
  'chest-freezer': 'ARCA',
  oven: 'FORNO',
  microwave: 'MO',
  dishwasher: 'MLL',
  washer: 'MLR',
  dryer: 'MSR',
  wine: 'VINHO',
  'fridge-tower': 'FRIG.',
  'freezer-tower': 'CONG.',
  'oven-tower': 'FORNO',
};

interface Props {
  item: Pick<Item, 'type' | 'width' | 'depth' | 'materials' | 'elevation' | 'height' | 'options'>;
  selected?: boolean;
  /** px per cm, used to keep text legible. */
  scale: number;
  ghost?: boolean;
}

/** Plan (top view) symbol of an item, drawn in local coordinates centred on the origin, front facing +y. */
export function PlanSymbol({ item, selected, scale, ghost }: Props) {
  const e = getEntry(item.type);
  const w = item.width;
  const d = item.depth;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const fill = planColor(item);
  const dark = isDark(fill);
  const ink = dark ? '#e9e9e9' : '#3b4048';
  const stroke = selected ? 'var(--accent)' : '#2f343b';
  const sw = selected ? 2.2 : 1.1;
  const high = item.elevation >= 120 || e.anchor === 'ceiling';
  const dash = high ? '6 4' : undefined;
  const fs = Math.max(6, Math.min(d * 0.22, w * 0.18, 13 / scale));
  const label = LABELS[e.model];
  const m = e.model;
  const lines: React.ReactNode[] = [];

  const circle = (cx: number, cy: number, r: number, key: string, extra: React.SVGProps<SVGCircleElement> = {}) => (
    <circle key={key} cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={1} {...NS} {...extra} />
  );

  if (m === 'cooktop-induction' || m === 'range' || m === 'cooktop-gas') {
    const r = Math.min(w, d) * 0.17;
    const cols = m === 'cooktop-gas' && w > 70 ? [-0.3, 0, 0.3] : [-0.24, 0.24];
    cols.forEach((cx, i) => {
      [-0.22, 0.22].forEach((cy, j) => {
        if (cols.length === 3 && i === 1 && j === 0) return;
        lines.push(circle(cx * w, cy * d + (m === 'range' ? d * 0.04 : 0), r * (i + j === 1 ? 0.8 : 1), `b${i}${j}`));
        if (m !== 'cooktop-induction') lines.push(circle(cx * w, cy * d + (m === 'range' ? d * 0.04 : 0), r * 0.35, `bi${i}${j}`));
      });
    });
    if (m === 'range') lines.push(<line key="l" x1={x0} x2={-x0} y1={-d / 2 + d * 0.08} y2={-d / 2 + d * 0.08} stroke={ink} strokeWidth={1} {...NS} />);
  } else if (m === 'sink' || m === 'sink-base') {
    const bw = Math.min(w * 0.75, m === 'sink' ? w - 8 : w - 20);
    const bd = Math.min(d * 0.7, 42);
    const cy = d * 0.06;
    lines.push(<rect key="basin" x={-bw / 2} y={cy - bd / 2} width={bw} height={bd} rx={5} fill="#d5d9dd" stroke={ink} strokeWidth={1} {...NS} />);
    lines.push(circle(0, cy, 2.2, 'drain'));
    lines.push(circle(0, cy - bd / 2 - 5, 2.5, 'tap', { fill: ink }));
  } else if (m === 'tall' || m === 'oven-tower' || m === 'fridge-tower' || m === 'freezer-tower') {
    lines.push(<path key="x" d={`M${x0} ${y0}L${-x0} ${-y0}M${-x0} ${y0}L${x0} ${-y0}`} stroke={ink} strokeWidth={0.8} opacity={0.6} {...NS} />);
    if (m === 'fridge-tower' || m === 'freezer-tower') {
      // Door swing in front of the column, from the hinge side (as seen from the front).
      const hinge = itemOptions(item).hinge === 'right' ? -x0 : x0;
      const free = -hinge;
      const fy = -y0;
      lines.push(<line key="leaf" x1={hinge} y1={fy} x2={hinge} y2={fy + w} stroke={stroke} strokeWidth={1.2} {...NS} />);
      lines.push(
        <path
          key="arc"
          d={`M${hinge} ${fy + w}A${w} ${w} 0 0 ${hinge < 0 ? 0 : 1} ${free} ${fy}`}
          fill="none"
          stroke={stroke}
          strokeWidth={0.8}
          strokeDasharray="4 3"
          {...NS}
        />,
      );
    }
  } else if (m === 'hood-wall' || m === 'hood-island') {
    lines.push(<path key="x" d={`M${x0} ${y0}L${-x0} ${-y0}M${-x0} ${y0}L${x0} ${-y0}`} stroke={ink} strokeWidth={0.8} strokeDasharray="4 3" {...NS} />);
    lines.push(<rect key="ch" x={-14} y={m === 'hood-wall' ? y0 : -12} width={28} height={m === 'hood-wall' ? 24 : 24} fill="none" stroke={ink} strokeWidth={0.8} {...NS} />);
  } else if (m === 'island') {
    const over = Math.min(30, d * 0.3);
    lines.push(<line key="ov" x1={x0} x2={-x0} y1={y0 + over} y2={y0 + over} stroke={ink} strokeWidth={0.8} strokeDasharray="5 3" {...NS} />);
  } else if (m === 'washer' || m === 'dryer') {
    lines.push(circle(0, d * 0.1, Math.min(w, d) * 0.3, 'drum'));
  } else if (m === 'table-round' || m === 'table-oval') {
    // Dashed outline of the pedestal foot under the top.
    const r = Math.max(10, Math.min(w, d) * 0.24);
    lines.push(<ellipse key="foot" rx={r * Math.min(1.6, Math.max(1, w / d))} ry={r} fill="none" stroke={ink} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.7} {...NS} />);
  } else if (m === 'pendant') {
    lines.push(<path key="x" d={`M${x0} 0L${-x0} 0M0 ${y0}L0 ${-y0}`} stroke={ink} strokeWidth={0.8} {...NS} />);
  } else if (m === 'chair') {
    lines.push(<rect key="back" x={x0 + 2} y={y0 + 1} width={w - 4} height={Math.min(6, d * 0.15)} fill={ink} opacity={0.5} />);
  } else if (m === 'drawers') {
    [-1 / 6, 1 / 6].forEach((f, i) => lines.push(<line key={`d${i}`} x1={x0 + 4} x2={-x0 - 4} y1={f * d} y2={f * d} stroke={ink} strokeWidth={0.6} opacity={0.5} {...NS} />));
  } else if (m === 'fridge-american') {
    lines.push(<line key="split" x1={w * 0.08} x2={w * 0.08} y1={y0} y2={-y0} stroke={ink} strokeWidth={0.8} {...NS} />);
  }

  // Front edge marker (shows which way the item faces).
  const frontMarker =
    m !== 'stool' && m !== 'pendant' && m !== 'table' && m !== 'table-round' && m !== 'table-oval' && m !== 'countertop' && m !== 'shelf' && m !== 'cooktop-induction' && m !== 'cooktop-gas' && m !== 'sink' ? (
      <line x1={x0 + 3} x2={-x0 - 3} y1={-y0 - 2.5} y2={-y0 - 2.5} stroke={ink} strokeWidth={1.4} opacity={0.55} {...NS} />
    ) : null;

  const shape =
    m === 'stool' || m === 'pendant' || m === 'table-round' || m === 'table-oval' ? (
      <ellipse rx={w / 2} ry={d / 2} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} {...NS} />
    ) : (
      <rect x={x0} y={y0} width={w} height={d} rx={m === 'table' ? 4 : m === 'chair' ? 6 : 0.5} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} {...NS} />
    );

  const showText = !!label && w * scale > 34 && d * scale > 18;
  return (
    <g opacity={ghost ? 0.55 : high ? 0.82 : 1}>
      {shape}
      {lines}
      {frontMarker}
      {showText && (
        <text y={fs * 0.35} fontSize={fs} textAnchor="middle" fill={ink} fontWeight={600} style={{ pointerEvents: 'none', letterSpacing: 0.3 }}>
          {label}
        </text>
      )}
    </g>
  );
}
