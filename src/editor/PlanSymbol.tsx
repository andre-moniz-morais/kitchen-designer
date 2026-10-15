import { getEntry, itemOptions } from '../catalog';
import { getMaterial } from '../materials';
import type { Item } from '../types';

const NS = { vectorEffect: 'non-scaling-stroke' as const };

/** Colour an item shows from above: its countertop if any, otherwise its front/finish. */
export function planColor(it: Pick<Item, 'type' | 'materials'>) {
  const e = getEntry(it.type);
  const m = it.materials;
  if (e.model === 'cooktop-induction' || e.model === 'tv' || e.model === 'monitor') return '#1a1b1e';
  // Stairs show their treads, not the handrail.
  if (e.model.startsWith('stairs')) return getMaterial(m.body).color;
  const id = (e.slots.includes('top') && m.top) || m.fabric || m.front || m.finish || m.body;
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
  fireplace: 'LAREIRA',
  'tv-unit': 'TV',
  bookcase: 'ESTANTE',
  sideboard: 'APARADOR',
  dresser: 'CÓMODA',
  'bath-cabinet': 'COL.',
  'filing-cabinet': 'GAV.',
  shelving: 'ESTANTE',
  'pantry-shelf': 'DESPENSA',
  workbench: 'BANCADA',
  'garage-cabinet': 'ARMÁRIO',
  'dumbbell-rack': 'HALTERES',
  'exercise-bike': 'BICICLETA',
  'utility-sink': 'TANQUE',
};

/** Shapes drawn as ellipses rather than rectangles. */
const ROUND = new Set(['stool', 'pendant', 'table-round', 'table-oval', 'plant', 'floor-lamp', 'side-table', 'stairs-spiral']);
/** Symbols that have no meaningful front edge. */
const NO_FRONT = new Set([
  'stool',
  'pendant',
  'table',
  'table-round',
  'table-oval',
  'countertop',
  'shelf',
  'cooktop-induction',
  'cooktop-gas',
  'sink',
  'rug',
  'yoga-mat',
  'plant',
  'floor-lamp',
  'side-table',
  'coffee-table',
  'car',
  'bike',
  'power-rack',
  'stairs-straight',
  'stairs-l',
  'stairs-spiral',
  'treadmill',
  'weight-bench',
  'sofa-corner',
]);

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

  lines.push(...houseDetails(m, w, d, ink));

  // Front edge marker (shows which way the item faces).
  const frontMarker =
    !NO_FRONT.has(m) ? (
      <line x1={x0 + 3} x2={-x0 - 3} y1={-y0 - 2.5} y2={-y0 - 2.5} stroke={ink} strokeWidth={1.4} opacity={0.55} {...NS} />
    ) : null;

  const shape =
    m === 'sofa-corner' ? (
      <path d={sofaCornerPath(w, d)} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
    ) : m === 'stairs-l' ? (
      <path d={lStairsPath(w, d)} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
    ) : ROUND.has(m) ? (
      <ellipse rx={w / 2} ry={d / 2} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} {...NS} />
    ) : (
      <rect x={x0} y={y0} width={w} height={d} rx={m === 'table' ? 4 : m === 'chair' ? 6 : m === 'car' ? Math.min(w, d) * 0.22 : m === 'bathtub' || m === 'washbasin' ? 6 : 0.5} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} {...NS} />
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

const sofaMainDepth = (d: number) => Math.min(98, d * 0.55);
const sofaChaiseWidth = (w: number) => Math.min(95, w * 0.35);

function sofaCornerPath(w: number, d: number) {
  const md = sofaMainDepth(d);
  const cw = sofaChaiseWidth(w);
  const x0 = -w / 2;
  const y0 = -d / 2;
  return `M${x0} ${y0}H${-x0}V${-y0}H${-x0 - cw}V${y0 + md}H${x0}Z`;
}

const lStairsWidth = (w: number, d: number) => Math.min(100, w * 0.45, d * 0.45);

function lStairsPath(w: number, d: number) {
  const sw = lStairsWidth(w, d);
  return `M${-w / 2} ${-d / 2}H${w / 2}V${d / 2}H${w / 2 - sw}V${-d / 2 + sw}H${-w / 2}Z`;
}

/** Arrow pointing from `a` to `b` (walking direction of a stair). */
function arrow(a: [number, number], b: [number, number], ink: string, key: string) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const h = Math.min(10, l * 0.25);
  return (
    <path
      key={key}
      d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${b[0] - ux * h - uy * h * 0.6} ${b[1] - uy * h + ux * h * 0.6}L${b[0]} ${b[1]}L${b[0] - ux * h + uy * h * 0.6} ${b[1] - uy * h - ux * h * 0.6}`}
      fill="none"
      stroke={ink}
      strokeWidth={1.2}
      {...NS}
    />
  );
}

/** Plan details for the whole-house catalogue (front faces +y, back at -d/2). */
function houseDetails(m: string, w: number, d: number, ink: string): React.ReactNode[] {
  const x0 = -w / 2;
  const y0 = -d / 2;
  const out: React.ReactNode[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, key: string, extra: React.SVGProps<SVGLineElement> = {}) => (
    <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={0.9} opacity={0.75} {...NS} {...extra} />
  );
  const rect = (x: number, y: number, rw: number, rh: number, key: string, extra: React.SVGProps<SVGRectElement> = {}) => (
    <rect key={key} x={x} y={y} width={rw} height={rh} fill="none" stroke={ink} strokeWidth={0.9} opacity={0.75} {...NS} {...extra} />
  );
  switch (m) {
    case 'sofa':
    case 'armchair': {
      const arm = m === 'armchair' ? 15 : 18;
      out.push(rect(x0, y0, w, 22, 'back'));
      out.push(rect(x0, y0 + 22, arm, d - 22, 'al'), rect(-x0 - arm, y0 + 22, arm, d - 22, 'ar'));
      const n = Math.max(1, Math.round((w - 2 * arm) / 68));
      for (let i = 1; i < n; i++) out.push(line(x0 + arm + ((w - 2 * arm) / n) * i, y0 + 22, x0 + arm + ((w - 2 * arm) / n) * i, -y0, `c${i}`));
      break;
    }
    case 'sofa-corner': {
      const md = sofaMainDepth(d);
      const cw = sofaChaiseWidth(w);
      out.push(line(x0, y0 + 22, -x0, y0 + 22, 'back'));
      out.push(line(x0 + 18, y0 + 22, x0 + 18, y0 + md, 'arm'));
      out.push(line(-x0 - cw, y0 + 22, -x0 - cw, y0 + md, 'split'));
      break;
    }
    case 'coffee-table':
      out.push(rect(x0 + 5, y0 + 5, w - 10, d - 10, 'shelf', { strokeDasharray: '3 3' }));
      break;
    case 'tv':
      break;
    case 'bed': {
      const pillows = w > 120 ? 2 : 1;
      const pw = (w - 20) / pillows;
      out.push(line(x0, y0 + 6, -x0, y0 + 6, 'head', { strokeWidth: 2 }));
      for (let i = 0; i < pillows; i++) out.push(rect(x0 + 10 + pw * i + 3, y0 + 10, pw - 6, 34, `p${i}`, { rx: 4 }));
      out.push(line(x0 + 2, y0 + d * 0.32, -x0 - 2, y0 + d * 0.32, 'fold'));
      out.push(line(x0 + 2, y0 + d * 0.32, -x0 - 2, -y0 - 2, 'diag', { strokeDasharray: '4 4', opacity: 0.35 }));
      break;
    }
    case 'crib':
      out.push(rect(x0 + 3, y0 + 3, w - 6, d - 6, 'in'));
      break;
    case 'wardrobe': {
      // Hanging rail, dashed through the middle.
      out.push(line(x0 + 4, 0, -x0 - 4, 0, 'rail', { strokeDasharray: '6 4' }));
      const n = Math.max(1, Math.round(w / 50));
      for (let i = 1; i < n; i++) out.push(line(x0 + (w / n) * i, -y0 - 4, x0 + (w / n) * i, -y0, `dv${i}`));
      break;
    }
    case 'toilet':
      out.push(rect(x0, y0, w, 18, 'tank'));
      out.push(<ellipse key="bowl" cx={0} cy={y0 + 18 + (d - 18) / 2} rx={w / 2 - 2} ry={(d - 18) / 2 - 1} fill="none" stroke={ink} strokeWidth={0.9} {...NS} />);
      break;
    case 'bidet':
      out.push(<ellipse key="bowl" cx={0} cy={2} rx={w / 2 - 3} ry={d / 2 - 5} fill="none" stroke={ink} strokeWidth={0.9} {...NS} />);
      break;
    case 'vanity': {
      const basins = w >= 110 ? 2 : 1;
      for (let i = 0; i < basins; i++) {
        const cx = basins === 1 ? 0 : (i === 0 ? -1 : 1) * w * 0.25;
        out.push(<ellipse key={`b${i}`} cx={cx} cy={2} rx={16} ry={13} fill="#eef2f4" stroke={ink} strokeWidth={0.9} {...NS} />);
      }
      break;
    }
    case 'washbasin':
    case 'utility-sink':
      out.push(<ellipse key="b" cx={0} cy={3} rx={w / 2 - 5} ry={d / 2 - 8} fill="#eef2f4" stroke={ink} strokeWidth={0.9} {...NS} />);
      break;
    case 'shower':
      out.push(line(x0, y0, -x0, -y0, 'x1'), line(-x0, y0, x0, -y0, 'x2'));
      out.push(<circle key="drain" r={3} fill="none" stroke={ink} strokeWidth={0.9} {...NS} />);
      out.push(line(x0, -y0, -x0, -y0, 'glass', { stroke: '#5aa0c8', strokeWidth: 2, opacity: 1 }));
      out.push(line(-x0, y0, -x0, -y0, 'glass2', { stroke: '#5aa0c8', strokeWidth: 2, opacity: 1 }));
      break;
    case 'bathtub':
      out.push(rect(x0 + 7, y0 + 7, w - 14, d - 14, 'in', { rx: d * 0.25 }));
      out.push(<circle key="drain" cx={x0 + 18} cy={0} r={2.5} fill="none" stroke={ink} strokeWidth={0.9} {...NS} />);
      break;
    case 'desk':
      out.push(line(x0 + 4, y0 + 4, x0 + 4, -y0 - 4, 'l'), line(-x0 - 4, y0 + 4, -x0 - 4, -y0 - 4, 'r'));
      break;
    case 'office-chair':
      out.push(<circle key="seat" r={Math.min(w, d) / 2 - 8} fill="none" stroke={ink} strokeWidth={0.9} {...NS} />);
      out.push(rect(x0 + 8, y0 + 2, w - 16, 7, 'back', { rx: 3 }));
      break;
    case 'monitor':
      break;
    case 'car': {
      out.push(rect(x0 + w * 0.22, y0 + 10, w * 0.46, d - 20, 'cabin', { rx: 10 }));
      out.push(line(x0 + w * 0.22, y0 + 14, x0 + w * 0.22, -y0 - 14, 'ws', { strokeWidth: 2 }));
      out.push(line(-x0 - w * 0.32, y0 + 14, -x0 - w * 0.32, -y0 - 14, 'rw', { strokeWidth: 2 }));
      break;
    }
    case 'bike':
      out.push(line(x0 + 5, 0, -x0 - 5, 0, 'frame', { strokeWidth: 2 }));
      out.push(line(w * 0.22, -22, w * 0.22, 22, 'bar', { strokeWidth: 1.5 }));
      break;
    case 'treadmill':
      out.push(rect(x0 + 6, y0 + d * 0.2, w - 40, d * 0.6, 'belt', { fill: '#2a2b2e', opacity: 0.4 }));
      break;
    case 'power-rack':
      [-1, 1].forEach((sx) => [-1, 1].forEach((sy) => out.push(rect(sx * (w / 2 - 7) - 3.5, sy * (d / 2 - 7) - 3.5, 7, 7, `p${sx}${sy}`, { fill: ink }))));
      out.push(line(x0 - 25, -y0 - 7, -x0 + 25, -y0 - 7, 'bar', { strokeWidth: 1.6, opacity: 1 }));
      break;
    case 'weight-bench':
      out.push(rect(x0, -15, w, 30, 'pad', { rx: 4 }));
      break;
    case 'rug':
      out.push(rect(x0 + 6, y0 + 6, w - 12, d - 12, 'border', { strokeDasharray: '2 3' }));
      break;
    case 'yoga-mat':
      break;
    case 'plant':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        out.push(<ellipse key={i} cx={Math.cos(a) * w * 0.22} cy={Math.sin(a) * d * 0.22} rx={w * 0.16} ry={d * 0.09} transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * w * 0.22} ${Math.sin(a) * d * 0.22})`} fill="#5b8a4e" opacity={0.85} />);
      }
      break;
    case 'floor-lamp':
      out.push(<circle key="pole" r={2} fill={ink} />);
      break;
    case 'fireplace':
      out.push(rect(x0 + w * 0.18, y0 + 6, w * 0.64, d - 6, 'box', { fill: '#2a2a2a', opacity: 0.5 }));
      break;
    case 'radiator':
    case 'towel-rail':
      break;
    case 'stairs-straight': {
      const n = Math.max(3, Math.round(270 / 18));
      for (let i = 1; i < n; i++) out.push(line(x0, -y0 - (d / n) * i, -x0, -y0 - (d / n) * i, `t${i}`));
      out.push(arrow([0, -y0 - 8], [0, y0 + 10], ink, 'up'));
      break;
    }
    case 'stairs-l': {
      const sw = lStairsWidth(w, d);
      const n = 15;
      const n1 = Math.floor((n - 1) / 2);
      const n2 = n - n1 - 1;
      const td1 = (d - sw) / n1;
      const td2 = (w - sw) / n2;
      for (let i = 1; i <= n1; i++) out.push(line(w / 2 - sw, -y0 - td1 * i, w / 2, -y0 - td1 * i, `a${i}`));
      for (let i = 1; i < n2; i++) out.push(line(w / 2 - sw - td2 * i, y0, w / 2 - sw - td2 * i, y0 + sw, `b${i}`));
      out.push(arrow([w / 2 - sw / 2, -y0 - 8], [w / 2 - sw / 2, y0 + sw / 2], ink, 'up1'));
      out.push(arrow([w / 2 - sw / 2, y0 + sw / 2], [x0 + 10, y0 + sw / 2], ink, 'up2'));
      break;
    }
    case 'stairs-spiral': {
      const R = Math.min(w, d) / 2;
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * Math.PI * 2;
        out.push(line(Math.cos(a) * 5, -Math.sin(a) * 5, Math.cos(a) * R, -Math.sin(a) * R, `r${i}`));
      }
      out.push(<circle key="pole" r={5} fill={ink} />);
      break;
    }
  }
  return out;
}
