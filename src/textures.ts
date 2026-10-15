import type { MaterialDef } from './materials';

/** Small deterministic PRNG so every material always looks the same. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Value noise on a grid that wraps every `px` × `py` cells. Sample it as n(u * px, v * py)
 * with u, v in [0, 1] and the texture tiles seamlessly.
 */
function makeNoise(rand: () => number, px: number, py = px) {
  const g = new Float32Array(px * py).map(() => rand());
  const at = (x: number, y: number) => g[(((y % py) + py) % py) * px + (((x % px) + px) % px)];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const SIZE = 512;
const cache = new Map<string, HTMLCanvasElement>();

/** Draws (once) a tileable procedural texture for a material. */
export function materialCanvas(m: MaterialDef): HTMLCanvasElement {
  const hit = cache.get(m.id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const rand = rng(hash(m.id) + (m.seed ?? 0));
  const base = hexToRgb(m.color);
  const acc = (m.accents ?? []).map(hexToRgb);
  const img = ctx.createImageData(SIZE, SIZE);
  const px = img.data;
  const put = (i: number, col: [number, number, number]) => {
    px[i] = col[0];
    px[i + 1] = col[1];
    px[i + 2] = col[2];
    px[i + 3] = 255;
  };

  switch (m.pattern) {
    case 'wood':
    case 'planks': {
      const warpN = makeNoise(rand, 4, 2);
      const fibre = makeNoise(rand, 128, 6);
      const streak = makeNoise(rand, 3, 2);
      const planks = m.pattern === 'planks';
      const plankCount = 6;
      const offsets = Array.from({ length: plankCount }, () => rand());
      const tints = Array.from({ length: plankCount }, () => (rand() - 0.5) * 0.25);
      const rings = planks ? 12 : 34;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          let u = x / SIZE;
          const vv = y / SIZE;
          let plank = 0;
          let tint = 0;
          if (planks) {
            plank = Math.floor(u * plankCount);
            u = u * plankCount - plank;
            tint = tints[plank];
          }
          const off = planks ? offsets[plank] * 4 : 0;
          // Grain runs along v (vertical in texture space); rings are warped bands across u.
          const warp = warpN(u * 4 + off, vv * 2 + off) * 1.6 + streak(u * 3, vv * 2) * 0.6;
          const band = Math.sin((u * rings + warp) * Math.PI * 2) * 0.5 + 0.5;
          const late = Math.pow(band, 7);
          const f = fibre(u * 128, vv * 6);
          let col = mix(base, acc[1] ?? base, Math.max(0, streak(u * 3 + 1.5, vv * 2) - 0.45) * 1.4);
          col = mix(col, acc[0] ?? base, Math.min(1, late * 0.8 + f * 0.28 + band * 0.12));
          if (tint) col = tint > 0 ? mix(col, [255, 255, 255], tint * 0.4) : mix(col, [0, 0, 0], -tint * 0.6);
          if (planks) {
            const plankLen = 0.5 + offsets[plank] * 0.5;
            const joint = (vv + offsets[plank]) % plankLen;
            if (u < 0.012 || u > 0.988 || joint < 0.004) col = mix(col, [40, 25, 15], 0.55);
          }
          put(i, col);
        }
      }
      ctx.putImageData(img, 0, 0);
      break;
    }
    case 'herringbone': {
      const n = makeNoise(rand, 32);
      ctx.fillStyle = m.color;
      ctx.fillRect(0, 0, SIZE, SIZE);
      const w = SIZE / 8;
      const l = w * 4;
      for (let row = -4; row < 12; row++) {
        for (let col = -4; col < 12; col++) {
          for (const dir of [0, 1]) {
            ctx.save();
            const ox = col * w * 2 + (dir ? w : 0);
            const oy = row * w * 2 + col * w * 2 - (dir ? w : 0);
            ctx.translate(((ox % (SIZE * 2)) + SIZE * 2) % (SIZE * 2) - SIZE / 2, oy % (SIZE * 2) - SIZE / 2);
            ctx.rotate(dir ? -Math.PI / 4 : Math.PI / 4);
            const t = n(row * 3 + col, dir * 7 + row) * 0.6;
            const c1 = mix(base, acc[t > 0.3 ? 0 : 1] ?? base, t);
            ctx.fillStyle = `rgb(${c1.map(Math.round).join(',')})`;
            ctx.fillRect(0, 0, l, w);
            ctx.strokeStyle = 'rgba(40,25,15,0.45)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, l, w);
            ctx.globalAlpha = 0.25;
            for (let g = 0; g < 6; g++) {
              ctx.strokeStyle = `rgb(${(acc[0] ?? base).join(',')})`;
              ctx.beginPath();
              const gy = rand() * w;
              ctx.moveTo(0, gy);
              ctx.bezierCurveTo(l / 3, gy + (rand() - 0.5) * 6, (2 * l) / 3, gy + (rand() - 0.5) * 6, l, gy);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
          }
        }
      }
      break;
    }
    case 'marble': {
      const periods = [3, 6, 12, 24];
      const oct = periods.map((p) => makeNoise(rand, p));
      const cloud = makeNoise(rand, 4);
      const fine = makeNoise(rand, 64);
      // Integer direction so the vein bands tile.
      const dirs = [
        [1, 1],
        [2, 1],
        [1, 2],
        [1, -1],
        [2, -1],
      ];
      const [A, B] = dirs[Math.floor(rand() * dirs.length)];
      const [A2, B2] = dirs[Math.floor(rand() * dirs.length)];
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const u = x / SIZE;
          const vv = y / SIZE;
          let turb = 0;
          let amp = 0.5;
          oct.forEach((n, k) => {
            turb += n(u * periods[k], vv * periods[k]) * amp;
            amp *= 0.5;
          });
          const main = Math.abs(Math.sin((u * A + vv * B + turb * 0.9) * Math.PI));
          const minor = Math.abs(Math.sin((u * A2 * 2 + vv * B2 * 2 + turb * 1.4) * Math.PI));
          const vein = Math.pow(1 - main, 18) + Math.pow(1 - minor, 40) * 0.5;
          const halo = Math.pow(1 - main, 4) * 0.22;
          let col = mix(base, acc[1] ?? base, cloud(u * 4, vv * 4) * 0.35 + halo + fine(u * 64, vv * 64) * 0.06);
          col = mix(col, acc[0] ?? base, Math.min(1, vein));
          put(i, col);
        }
      }
      ctx.putImageData(img, 0, 0);
      break;
    }
    case 'granite':
    case 'terrazzo': {
      const n = makeNoise(rand, 64);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const t = n((x / SIZE) * 64, (y / SIZE) * 64) * 0.25;
          put(i, mix(base, acc[0] ?? base, t));
        }
      }
      ctx.putImageData(img, 0, 0);
      const count = m.pattern === 'granite' ? 9000 : 700;
      for (let k = 0; k < count; k++) {
        const col = acc[Math.floor(rand() * acc.length)] ?? base;
        ctx.fillStyle = `rgb(${col.join(',')})`;
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        const r = m.pattern === 'granite' ? 0.6 + rand() * 2.2 : 2 + rand() * 9;
        const sides = 5 + Math.floor(rand() * 3);
        const poly: [number, number][] = [];
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * Math.PI * 2;
          const rr = r * (0.6 + rand() * 0.6);
          poly.push([Math.cos(a) * rr, Math.sin(a) * rr]);
        }
        // Draw again on the opposite side near the edges so speckles tile.
        for (const dx of [0, -SIZE, SIZE]) {
          for (const dy of [0, -SIZE, SIZE]) {
            const cx = x + dx;
            const cy = y + dy;
            if (cx < -12 || cy < -12 || cx > SIZE + 12 || cy > SIZE + 12) continue;
            ctx.beginPath();
            poly.forEach(([px2, py2], k) => (k ? ctx.lineTo(cx + px2, cy + py2) : ctx.moveTo(cx + px2, cy + py2)));
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'concrete':
    case 'slate':
    case 'travertine': {
      const lo = m.pattern === 'slate' ? makeNoise(rand, 4, 24) : m.pattern === 'travertine' ? makeNoise(rand, 8, 3) : makeNoise(rand, 6);
      const hi = makeNoise(rand, 128);
      const pits = makeNoise(rand, 90, 30);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const u = x / SIZE;
          const vv = y / SIZE;
          let t: number;
          if (m.pattern === 'slate') t = lo(u * 4, vv * 24) * 0.7 + hi(u * 128, vv * 128) * 0.3;
          else if (m.pattern === 'travertine') t = Math.abs(Math.sin((vv * 10 + lo(u * 8, vv * 3) * 1.5) * Math.PI)) * 0.6 + hi(u * 128, vv * 128) * 0.4;
          else t = lo(u * 6, vv * 6) * 0.6 + hi(u * 128, vv * 128) * 0.4;
          let col = mix(acc[0] ?? base, acc[1] ?? base, t);
          col = mix(base, col, 0.75);
          if (m.pattern === 'travertine' && pits(u * 90, vv * 30) > 0.82) col = mix(col, acc[2] ?? base, 0.7);
          put(i, col);
        }
      }
      ctx.putImageData(img, 0, 0);
      break;
    }
    case 'fabric': {
      // Fine woven texture: warp and weft threads with a little irregularity.
      const n = makeNoise(rand, 64);
      const threads = 96;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const u = x / SIZE;
          const vv = y / SIZE;
          const warp = Math.abs(Math.sin(u * threads * Math.PI));
          const weft = Math.abs(Math.sin(vv * threads * Math.PI));
          const over = (Math.floor(u * threads) + Math.floor(vv * threads)) % 2 === 0 ? warp : weft;
          const t = (1 - over) * 0.55 + n(u * 64, vv * 64) * 0.35;
          put(i, mix(base, acc[0] ?? base, Math.min(1, t)));
        }
      }
      ctx.putImageData(img, 0, 0);
      break;
    }
    case 'leather': {
      const n = makeNoise(rand, 48);
      const n2 = makeNoise(rand, 160);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const u = x / SIZE;
          const vv = y / SIZE;
          // Pebbled grain: cells from thresholded noise plus soft mottling.
          const cell = Math.pow(n2(u * 160, vv * 160), 3);
          const t = n(u * 48, vv * 48) * 0.45 + cell * 0.5;
          put(i, mix(acc[0] ?? base, acc[1] ?? base, t));
        }
      }
      ctx.putImageData(img, 0, 0);
      break;
    }
    case 'brushed': {
      const n1 = makeNoise(rand, 256, 6);
      const n2 = makeNoise(rand, 512, 12);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const u = x / SIZE;
          const vv = y / SIZE;
          const t = n1(u * 256, vv * 6) * 0.6 + n2(u * 512, vv * 12) * 0.4;
          put(i, mix(acc[0] ?? base, acc[1] ?? base, t));
        }
      }
      ctx.putImageData(img, 0, 0);
      break;
    }
    case 'tiles': {
      const n = makeNoise(rand, 16);
      const hydraulic = acc.length >= 3;
      const cells = hydraulic ? 2 : m.id === 'floor-terracotta' ? 2 : 2;
      const cs = SIZE / cells;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const cx = Math.floor(x / cs);
          const cy = Math.floor(y / cs);
          const t = n((x / SIZE) * 16, (y / SIZE) * 16) * 0.18 + (((cx * 7 + cy * 13) % 5) / 5) * 0.08;
          put(i, mix(base, acc[0] ?? base, t));
        }
      }
      ctx.putImageData(img, 0, 0);
      if (hydraulic) {
        for (let cy = 0; cy < cells; cy++) {
          for (let cx = 0; cx < cells; cx++) {
            const ox = cx * cs + cs / 2;
            const oy = cy * cs + cs / 2;
            ctx.save();
            ctx.translate(ox, oy);
            ctx.fillStyle = `rgb(${acc[1].join(',')})`;
            for (let k = 0; k < 4; k++) {
              ctx.rotate(Math.PI / 2);
              ctx.beginPath();
              ctx.ellipse(0, -cs * 0.22, cs * 0.09, cs * 0.2, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(cs / 2, cs / 2, cs * 0.18, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = `rgb(${acc[2].join(',')})`;
            ctx.beginPath();
            ctx.arc(0, 0, cs * 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
      ctx.strokeStyle = `rgba(${(acc[0] ?? base).map((x) => Math.round(x * 0.75)).join(',')},0.9)`;
      ctx.lineWidth = 3;
      for (let k = 0; k <= cells; k++) {
        ctx.beginPath();
        ctx.moveTo(k * cs, 0);
        ctx.lineTo(k * cs, SIZE);
        ctx.moveTo(0, k * cs);
        ctx.lineTo(SIZE, k * cs);
        ctx.stroke();
      }
      break;
    }
    default: {
      // Plain colour with very subtle noise so lighting doesn't look flat.
      const n = makeNoise(rand, 128);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          const t = (n((x / SIZE) * 128, (y / SIZE) * 128) - 0.5) * 6;
          put(i, [base[0] + t, base[1] + t, base[2] + t]);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  }
  cache.set(m.id, c);
  return c;
}

const thumbCache = new Map<string, string>();

export function materialThumb(m: MaterialDef): string {
  const hit = thumbCache.get(m.id);
  if (hit) return hit;
  const src = materialCanvas(m);
  const t = document.createElement('canvas');
  t.width = t.height = 96;
  const ctx = t.getContext('2d')!;
  // Show roughly 30 cm of the material so the pattern reads at thumbnail size.
  const frac = Math.min(1, 0.45 / (m.scale ?? 1));
  ctx.drawImage(src, 0, 0, SIZE * frac, SIZE * frac, 0, 0, 96, 96);
  if (m.category === 'metal') {
    const g = ctx.createLinearGradient(0, 0, 96, 96);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
  }
  const url = t.toDataURL('image/jpeg', 0.85);
  thumbCache.set(m.id, url);
  return url;
}
