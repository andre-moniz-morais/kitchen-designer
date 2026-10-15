import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { deg2rad, dist, faceAt, getWalls, interiorHost, miter, outerPolygon, projectBounds, roomFaces } from '../geometry';
import { useStore } from '../store';
import type { Item, Opening, Room, Vec2 } from '../types';
import { color3, M, mat3 } from './materials3d';
import { ItemModel } from './models';
import { HouseModel, isHouseModel } from './houseModels';
import { getEntry } from '../catalog';

const S = 0.01; // cm → m

export interface Viewer3DHandle {
  screenshot: () => void;
  setView: (v: 'perspective' | 'top' | 'front') => void;
}

// Camera survives switching between 2D and 3D.
const camState: { pos?: THREE.Vector3; target?: THREE.Vector3; roomKey?: string } = {};

export const Viewer3D = forwardRef<Viewer3DHandle>(function Viewer3D(_, ref) {
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const viewApi = useRef<(v: 'perspective' | 'top' | 'front') => void>(() => {});
  useImperativeHandle(ref, () => ({
    screenshot: () => {
      const gl = glRef.current;
      if (!gl) return;
      const a = document.createElement('a');
      a.href = gl.domElement.toDataURL('image/png');
      a.download = 'cozinha-3d.png';
      a.click();
    },
    setView: (v) => viewApi.current(v),
  }));

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: 45, near: 0.05, far: 200, position: [6, 5, 7] }}
      onCreated={({ gl }) => {
        glRef.current = gl;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.92;
      }}
      onPointerMissed={(e) => e.button === 0 && useStore.getState().select(null)}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#d9dde1']} />
      <Scene viewApi={viewApi} />
    </Canvas>
  );
});

function Scene({ viewApi }: { viewApi: React.MutableRefObject<(v: 'perspective' | 'top' | 'front') => void> }) {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const wallsMode = useStore((s) => s.settings.wallsMode);
  const { room, items, openings } = project;
  const b = projectBounds(project);
  const cx = ((b.minX + b.maxX) / 2) * S;
  const cz = ((b.minY + b.maxY) / 2) * S;
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 200) * S;
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  // Portrait screens need the camera further back to fit the room.
  const fitK = Math.max(1, 1.0 / Math.max(0.3, size.width / Math.max(1, size.height)));

  const roomKey = `${b.minX},${b.minY},${b.maxX},${b.maxY}`;
  useEffect(() => {
    if (camState.pos && camState.target && camState.roomKey === roomKey) {
      camera.position.copy(camState.pos);
      controls.current?.target.copy(camState.target);
    } else {
      camera.position.set(cx + span * 0.55 * fitK, span * 0.95 * fitK + 1.5, cz + span * 1.05 * fitK);
      controls.current?.target.set(cx, 0.9, cz);
    }
    controls.current?.update();
    return () => {
      camState.pos = camera.position.clone();
      camState.target = controls.current?.target.clone();
      camState.roomKey = roomKey;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  viewApi.current = (v) => {
    const t = new THREE.Vector3(cx, v === 'top' ? 0 : 0.9, cz);
    if (v === 'top') camera.position.set(cx, span * 1.9 * fitK + 2, cz + 0.001);
    else if (v === 'front') camera.position.set(cx, 1.6, cz + span * 1.25 * fitK + 1);
    else camera.position.set(cx + span * 0.55 * fitK, span * 0.95 * fitK + 1.5, cz + span * 1.05 * fitK);
    controls.current?.target.copy(t);
    controls.current?.update();
  };

  const H = room.wallHeight;
  return (
    <>
      <hemisphereLight args={['#ffffff', '#a89a86', 0.55]} />
      <directionalLight
        position={[cx + span * 0.6, H * S * 3, cz + span * 0.9]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
      >
        <object3D attach="target" position={[cx, 0, cz]} />
      </directionalLight>
      <RoomEnv />

      <group scale={S}>
        {room.closed && room.points.length >= 3 && <Floor room={room} />}
        <ZoneFloors />
        <Walls room={room} openings={openings} mode={wallsMode} />
        <InteriorWalls room={room} openings={openings} mode={wallsMode} />
        {items.map((it) => (
          <ItemNode key={it.id} it={it} selected={selection?.kind === 'item' && selection.id === it.id} ceiling={H} />
        ))}
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        maxPolarAngle={deg2rad(89)}
        minDistance={0.5}
        maxDistance={40}
        target={[cx, 0.9, cz]}
      />
    </>
  );
}

/** Neutral studio reflections (no network needed), so metals and gloss finishes read correctly. */
function RoomEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function ItemNode({ it, selected, ceiling }: { it: Item; selected: boolean; ceiling: number }) {
  const ceilingGap = ceiling - (it.elevation + it.height);
  const edges = useMemo(() => {
    if (!selected) return null;
    const g = new THREE.BoxGeometry(it.width + 2, it.height + 2, it.depth + 2);
    return new THREE.EdgesGeometry(g);
  }, [selected, it.width, it.height, it.depth]);
  return (
    <group
      position={[it.x, it.elevation, it.y]}
      rotation={[0, -deg2rad(it.rotation), 0]}
      onClick={(e) => {
        e.stopPropagation();
        useStore.getState().select({ kind: 'item', id: it.id });
      }}
    >
      {isHouseModel(getEntry(it.type).model) ? <HouseModel it={it} /> : <ItemModel it={it} ceilingGap={ceilingGap} />}
      {edges && (
        <lineSegments geometry={edges} position={[0, it.height / 2, 0]}>
          <lineBasicMaterial color="#d4683a" depthTest={false} transparent opacity={0.9} />
        </lineSegments>
      )}
    </group>
  );
}

function Floor({ room }: { room: Room }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape(room.points.map((p) => new THREE.Vector2(p.x, -p.y)));
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    // ShapeGeometry UVs are the shape coords (cm); flip v back to plan y.
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, -uv.getY(i));
    return g;
  }, [room.points]);
  return <mesh geometry={geo} material={mat3(room.floorMaterial)} receiveShadow />;
}

/** Extruded prism from a plan polygon (cm), from y0 to y0+h. */
function prismGeometry(pts: { x: number; y: number }[], h: number) {
  const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, -p.y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

function Walls({ room, openings, mode }: { room: Room; openings: Opening[]; mode: 'auto' | 'full' | 'low' }) {
  const walls = useMemo(() => getWalls(room), [room]);
  const outer = useMemo(() => outerPolygon(room), [room]);
  const wallMat = useMemo(() => color3(room.wallColor, 0.92), [room.wallColor]);
  const H = mode === 'low' ? Math.min(30, room.wallHeight) : room.wallHeight;
  const groups = useRef<(THREE.Group | null)[]>([]);
  const pillars = useRef<(THREE.Mesh | null)[]>([]);
  const camera = useThree((s) => s.camera);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  // "Dollhouse" mode: hide the walls standing between the camera and the room.
  useFrame(() => {
    const cam = tmp.copy(camera.position).multiplyScalar(1 / S);
    const hidden = walls.map((w) => mode === 'auto' && (cam.x - w.a.x) * w.out.x + (cam.z - w.a.y) * w.out.y > 1);
    walls.forEach((_, i) => {
      const g = groups.current[i];
      if (g) g.visible = !hidden[i];
    });
    pillars.current.forEach((m, i) => {
      if (!m) return;
      const prev = (i - 1 + walls.length) % walls.length;
      m.visible = !hidden[i] && !hidden[prev];
    });
  });

  const pillarGeos = useMemo(() => {
    if (!room.closed || outer.length < 3) return [];
    return room.points.map((p, i) => {
      const w1 = walls[(i - 1 + walls.length) % walls.length];
      const w2 = walls[i];
      // Only convex corners leave a gap on the outside.
      if (w2.dir.x * w1.in.x + w2.dir.y * w1.in.y < 1e-6) return null;
      const t = room.wallThickness;
      const a = { x: p.x + w1.out.x * t, y: p.y + w1.out.y * t };
      const m = miter(p, w1.out, w2.out, t);
      const c = { x: p.x + w2.out.x * t, y: p.y + w2.out.y * t };
      return prismGeometry([p, a, m, c], H);
    });
  }, [room, walls, outer, H]);

  return (
    <group>
      {walls.map((w, i) => (
        <group key={i} ref={(g) => (groups.current[i] = g)}>
          <WallMesh
            base={w.a}
            dir={w.dir}
            out={w.out}
            length={w.length}
            t={room.wallThickness}
            h={H}
            openings={mode === 'low' ? [] : openings.filter((o) => !o.interiorWallId && o.wallIndex === i)}
            mat={wallMat}
          />
        </group>
      ))}
      {pillarGeos.map((g, i) => g && <mesh key={i} ref={(m) => (pillars.current[i] = m)} geometry={g} material={wallMat} castShadow receiveShadow />)}
    </group>
  );
}

/** Interior walls: centred on their line, full height unless set lower, with their own doors and windows. */
function InteriorWalls({ room, openings, mode }: { room: Room; openings: Opening[]; mode: 'auto' | 'full' | 'low' }) {
  const iwalls = useStore((s) => s.project.interiorWalls) ?? [];
  const wallMat = useMemo(() => color3(room.wallColor, 0.92), [room.wallColor]);
  return (
    <group>
      {iwalls.map((w) => {
        if (dist(w.a, w.b) < 1) return null;
        const hst = interiorHost(w);
        const full = Math.min(room.wallHeight, w.height ?? room.wallHeight);
        const h = mode === 'low' ? Math.min(30, full) : full;
        return (
          <WallMesh
            key={w.id}
            base={hst.base}
            dir={hst.dir}
            out={hst.out}
            length={hst.length}
            t={w.thickness}
            h={h}
            ext={w.thickness / 2}
            openings={mode === 'low' ? [] : openings.filter((o) => o.interiorWallId === w.id)}
            mat={wallMat}
          />
        );
      })}
    </group>
  );
}

/** Each labelled room gets its own floor, laid over the main floor inside the walls around the label. */
function ZoneFloors() {
  const room = useStore((s) => s.project.room);
  const iwalls = useStore((s) => s.project.interiorWalls);
  const zones = useStore((s) => s.project.zones) ?? [];
  const faces = useMemo(() => roomFaces({ room, interiorWalls: iwalls }), [room, iwalls]);
  return (
    <group>
      {zones.map((z) => {
        const f = z.floorMaterial ? faceAt({ x: z.x, y: z.y }, faces) : null;
        return f ? <ZoneFloor key={z.id} pts={f} material={z.floorMaterial!} /> : null;
      })}
    </group>
  );
}

function ZoneFloor({ pts, material }: { pts: { x: number; y: number }[]; material: string }) {
  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, -p.y))));
    g.rotateX(-Math.PI / 2);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, -uv.getY(i));
    return g;
  }, [pts]);
  return <mesh geometry={geo} material={mat3(material)} position={[0, 0.4, 0]} receiveShadow />;
}

function WallMesh({
  base,
  dir,
  out,
  length: L,
  t,
  h,
  openings,
  mat,
  ext = 0,
}: {
  base: Vec2;
  dir: Vec2;
  out: Vec2;
  length: number;
  t: number;
  h: number;
  openings: Opening[];
  mat: THREE.Material;
  /** Extra length at both ends (interior walls overlap their neighbours so corners close). */
  ext?: number;
}) {
  // Choose the wall's local frame so it is right-handed: u along the wall, v up, extrusion outwards.
  const flip = dir.x * out.y - out.x * dir.y < 0;
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-ext, 0);
    s.lineTo(L + ext, 0);
    s.lineTo(L + ext, h);
    s.lineTo(-ext, h);
    s.closePath();
    for (const o of openings) {
      const c = flip ? L - o.offset : o.offset;
      const x0 = Math.max(1, c - o.width / 2);
      const x1 = Math.min(L - 1, c + o.width / 2);
      const y0 = Math.max(o.kind === 'window' ? 1 : 0.01, o.elevation);
      const y1 = Math.min(h - 1, o.elevation + o.height);
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      const hole = new THREE.Path();
      hole.moveTo(x0, y0);
      hole.lineTo(x0, y1);
      hole.lineTo(x1, y1);
      hole.lineTo(x1, y0);
      hole.closePath();
      s.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 1 });
  }, [L, h, t, openings, flip, ext]);

  const start = flip ? { x: base.x + dir.x * L, y: base.y + dir.y * L } : base;
  const d = flip ? { x: -dir.x, y: -dir.y } : dir;
  // Basis: X = wall dir (plan x,y → world x,z), Y = up, Z = outward normal.
  const matrix = useMemo(() => {
    const m = new THREE.Matrix4();
    m.makeBasis(new THREE.Vector3(d.x, 0, d.y), new THREE.Vector3(0, 1, 0), new THREE.Vector3(out.x, 0, out.y));
    m.setPosition(start.x, 0, start.y);
    return m;
  }, [d.x, d.y, out.x, out.y, start.x, start.y]);

  return (
    <group matrix={matrix} matrixAutoUpdate={false}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {openings.map((o) => (
        <OpeningModel key={o.id} o={o} L={L} t={t} flip={flip} wallH={h} />
      ))}
    </group>
  );
}

/** Door leaf or window frame placed inside a wall hole (wall-local coordinates). */
function OpeningModel({ o, L, t, flip, wallH }: { o: Opening; L: number; t: number; flip: boolean; wallH: number }) {
  if (o.kind === 'passage') return null;
  const c = flip ? L - o.offset : o.offset;
  const top = Math.min(wallH - 1, o.elevation + o.height);
  const h = top - o.elevation;
  if (o.kind === 'window') {
    const fr = 5;
    const frame = color3('#3a3d42', 0.45, 0.3);
    return (
      <group position={[c, o.elevation, t / 2]}>
        <mesh position={[0, h - fr / 2, 0]} material={frame}>
          <boxGeometry args={[o.width, fr, 6]} />
        </mesh>
        <mesh position={[0, fr / 2, 0]} material={frame}>
          <boxGeometry args={[o.width, fr, 6]} />
        </mesh>
        {[-1, 0, 1].map((s) => (
          <mesh key={s} position={[(s * (o.width - fr)) / 2, h / 2, 0]} material={frame}>
            <boxGeometry args={[s === 0 ? fr * 0.7 : fr, h, 6]} />
          </mesh>
        ))}
        <mesh position={[0, h / 2, 0]} material={M.glass}>
          <boxGeometry args={[o.width - fr, h - fr, 0.8]} />
        </mesh>
        {o.elevation > 5 && (
          <mesh position={[0, -1.5, -t / 2 - 2]} material={frame} receiveShadow>
            <boxGeometry args={[o.width + 6, 3, 5]} />
          </mesh>
        )}
      </group>
    );
  }
  // Door: frame + slightly open leaf so it reads as a door.
  // Interior doors are light and slim; exterior doors are heavier, dark, with a glazed strip and a threshold.
  const ext = o.kind === 'door-ext';
  const fr = ext ? 8 : 5;
  const leafT = ext ? 6 : 4;
  const frameMat = ext ? color3('#33363b', 0.45, 0.3) : color3('#f4f3ef', 0.55);
  const leafMat = ext ? color3('#3b3e44', 0.5, 0.2) : color3('#f7f6f2', 0.55);
  const hingeLeft = flip ? !o.flip : o.flip;
  const hx = hingeLeft ? o.width / 2 - fr : -o.width / 2 + fr;
  const leafW = o.width - fr * 2;
  const leafH = h - fr - (ext ? 2 : 0);
  const dir = hingeLeft ? -1 : 1;
  const ang = (o.swingOut ? -1 : 1) * (hingeLeft ? -1 : 1) * 0.35;
  return (
    <group position={[c, o.elevation, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (o.width - fr)) / 2, h / 2, t / 2]} material={frameMat} castShadow>
          <boxGeometry args={[fr, h, t + 2]} />
        </mesh>
      ))}
      <mesh position={[0, h - fr / 2, t / 2]} material={frameMat}>
        <boxGeometry args={[o.width, fr, t + 2]} />
      </mesh>
      {ext && (
        <mesh position={[0, 1, t / 2]} material={color3('#8d9096', 0.35, 0.8)} receiveShadow>
          <boxGeometry args={[o.width, 2, t + 6]} />
        </mesh>
      )}
      <group position={[hx, ext ? 2 : 0, o.swingOut ? t : 0]} rotation={[0, ang, 0]}>
        <mesh position={[(dir * leafW) / 2, leafH / 2, 0]} material={leafMat} castShadow>
          <boxGeometry args={[leafW, leafH, leafT]} />
        </mesh>
        {ext ? (
          <>
            {/* Narrow glazed strip near the hinge side and a long pull bar on both faces. */}
            <mesh position={[dir * leafW * 0.28, leafH * 0.55, 0]} material={M.darkGlass}>
              <boxGeometry args={[leafW * 0.14, leafH * 0.7, leafT + 0.4]} />
            </mesh>
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[dir * (leafW - 9), 105, sd * (leafT / 2 + 3)]} material={M.handle}>
                <boxGeometry args={[2.4, 80, 2.4]} />
              </mesh>
            ))}
          </>
        ) : (
          [-1, 1].map((sd) => (
            <mesh key={sd} position={[dir * (leafW - 7), 100, sd * (leafT / 2 + 2)]} material={M.handle}>
              <boxGeometry args={[12, 1.6, 1.6]} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}
