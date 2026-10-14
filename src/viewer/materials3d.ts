import * as THREE from 'three';
import { getMaterial } from '../materials';
import { materialCanvas } from '../textures';

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** Shared three.js material for a catalogue material id. Geometry UVs are expected in cm. */
export function mat3(id: string | undefined): THREE.MeshStandardMaterial {
  const def = getMaterial(id);
  const hit = cache.get(def.id);
  if (hit) return hit;
  const tex = new THREE.CanvasTexture(materialCanvas(def));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const s = 1 / ((def.scale ?? 1) * 100);
  tex.repeat.set(s, s);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: def.roughness,
    metalness: def.metalness ?? 0,
    envMapIntensity: def.category === 'metal' ? 1.2 : 0.6,
  });
  cache.set(def.id, m);
  return m;
}

const plain = new Map<string, THREE.MeshStandardMaterial>();

export function color3(hex: string, roughness = 0.5, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) {
  const key = `${hex}|${roughness}|${metalness}|${JSON.stringify(extra)}`;
  const hit = plain.get(key);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, ...extra });
  plain.set(key, m);
  return m;
}

export const M = {
  get handle() {
    return color3('#b9bcc0', 0.25, 1);
  },
  get blackGlass() {
    return color3('#0b0c0e', 0.06, 0.2, { envMapIntensity: 1.4 });
  },
  get darkGlass() {
    return color3('#1a2026', 0.05, 0.1, { transparent: true, opacity: 0.75, envMapIntensity: 1.5 });
  },
  get glass() {
    return color3('#cfe3ee', 0.02, 0, { transparent: true, opacity: 0.22, envMapIntensity: 1.5, depthWrite: false });
  },
  get rubber() {
    return color3('#202124', 0.8, 0);
  },
  get plastic() {
    return color3('#e9e9e7', 0.4, 0);
  },
  get display() {
    return color3('#0d0f12', 0.2, 0, { emissive: '#39c0ff', emissiveIntensity: 0.25 });
  },
  get ring() {
    return color3('#6b6f75', 0.4, 0);
  },
  get bulb() {
    return color3('#fff4d6', 0.3, 0, { emissive: '#ffe2a8', emissiveIntensity: 2.2 });
  },
  get frame() {
    return color3('#f4f4f2', 0.5, 0);
  },
  get selection() {
    return new THREE.LineBasicMaterial({ color: '#d4683a' });
  },
};

/**
 * Box geometry with UVs in centimetres, so textures keep their real-world size.
 * `grain` decides whether the texture's v axis runs vertically (default) or horizontally.
 */
export function boxGeometry(w: number, h: number, d: number, grain: 'v' | 'h' = 'v') {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f];
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      const u = uv.getX(idx) * su;
      const vv = uv.getY(idx) * sv;
      // Horizontal grain: swap so the texture's v follows the longest horizontal axis.
      if (grain === 'h') uv.setXY(idx, vv, u);
      else uv.setXY(idx, u, vv);
    }
  }
  uv.needsUpdate = true;
  return g;
}
