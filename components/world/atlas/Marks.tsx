"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type WorldData, type Pick, type Project, PEN, FAMILY_INK, plinth, districtSpot } from "./model";

/* Everything painted or planted on the world to help people find their way,
   plus a couple of things that reward wandering. */

const INK = "#1b2437";
export const CAMERA_YAW = Math.atan2(30, 44);   // the default view; painted words face it

/** A drag turns the world; only a press that barely moved counts as a click. */
export const tap = (e: ThreeEvent<MouseEvent>) => e.delta <= 6;

/* ---------------- paint ---------------- */

type PaintOpts = { size?: number; ink?: string; bg?: string; weight?: number; pad?: number };
const painted = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>();

/** Lettering on a transparent canvas, sized to the text. Cached, because the
 *  same few words are painted on every road. */
export function paint(text: string, o: PaintOpts = {}) {
  const key = JSON.stringify([text, o]);
  const hit = painted.get(key);
  if (hit) return hit;
  const size = o.size ?? 64, pad = o.pad ?? 18, weight = o.weight ?? 800;
  const c = document.createElement("canvas");
  const g0 = c.getContext("2d")!;
  g0.font = `${weight} ${size}px system-ui, sans-serif`;
  c.width = Math.ceil(g0.measureText(text).width + pad * 2);
  c.height = Math.ceil(size * 1.5);
  const g = c.getContext("2d")!;
  if (o.bg) { g.fillStyle = o.bg; g.beginPath(); g.roundRect(0, 0, c.width, c.height, c.height / 2.4); g.fill(); }
  g.font = `${weight} ${size}px system-ui, sans-serif`;
  g.fillStyle = o.ink ?? INK; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2 + size * 0.05);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const out = { tex, aspect: c.width / c.height };
  painted.set(key, out);
  return out;
}

/** A painted word lying flat on the ground; `h` is its height in world units. */
export function Decal({ text, h, at, yaw = 0, ...o }: {
  text: string; h: number; at: [number, number, number]; yaw?: number;
} & PaintOpts) {
  const { tex, aspect } = useMemo(() => paint(text, o), [text, o.ink, o.bg, o.size, o.weight]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[h * aspect, h]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A label that always faces the camera. */
function Sign({ text, at, h, ink = "#ffffff", bg = INK, size = 40 }: {
  text: string; at: [number, number, number]; h: number; ink?: string; bg?: string; size?: number;
}) {
  const { tex, aspect } = useMemo(() => paint(text, { ink, bg, size, weight: 700 }), [text, ink, bg, size]);
  return (
    <sprite position={at} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={tex} toneMapped={false} />
    </sprite>
  );
}

/** Does text along a road at angle `a` read upright from the default view? */
const upright = (a: number) => Math.cos(a + CAMERA_YAW) >= 0;

/* ---------------- 1. where the roles changed ---------------- */

function RoleLines({ w }: { w: WorldData }) {
  const n = w.districts.length, sector = (Math.PI * 2) / n;
  // the role that begins at each boundary, oldest first
  const marks = [...w.roles].reverse().map((r, i) => ({
    r: r.r_start,
    text: i === 0 ? `Joined as ${r.title} · ${r.dates.split("–")[0].trim()}` : `Became ${r.title} · ${r.dates.split("–")[0].trim()}`,
  }));
  return (
    <group>
      {w.districts.map((d, i) => {
        const a = (i + 0.5) * sector - Math.PI / 2;
        return (
          <group key={d} rotation={[0, -a, 0]}>
            {marks.map((m) => (
              <group key={m.r}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[m.r, 0.045, 0]}>
                  <planeGeometry args={[0.45, 3.6]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
                <Sign text={m.text} at={[m.r, 1.2, -2.9]} h={0.7} size={30} />
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- 2. the way back to now, on every road ---------------- */

function HomeArrows({ w }: { w: WorldData }) {
  const n = w.districts.length, sector = (Math.PI * 2) / n;
  return (
    <group>
      {w.districts.map((d, i) => {
        const a = (i + 0.5) * sector - Math.PI / 2;
        const up = upright(a);
        return (
          <group key={d} rotation={[0, -a, 0]}>
            {w.rings.filter((y) => y.r > w.plaza + 6).map((y) => (
              <Decal key={y.year} text={up ? "← NOW" : "NOW →"} h={0.8} at={[y.r + 3.4, 0.04, 0]}
                     yaw={up ? 0 : Math.PI} ink={PEN[d]} weight={800} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- 3. a pennant on every written-up project ---------------- */

function Pennant({ p }: { p: Project }) {
  const flag = useRef<THREE.Mesh>(null);
  const h = plinth(p);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(1.9, -0.5); s.lineTo(0, -1); s.lineTo(0, 0);
    return new THREE.ShapeGeometry(s);
  }, []);
  useFrame((st) => {
    if (flag.current) flag.current.rotation.y = Math.sin(st.clock.elapsedTime * 2.2 + p.x) * 0.35;
  });
  return (
    <group position={[p.x + 1.9, h, p.z - 1.9]}>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 4.4, 6]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh ref={flag} geometry={shape} position={[0, 4.3, 0]}>
        <meshBasicMaterial color={PEN[p.domain]} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ---------------- 4. footprints from the road to every project with stories ---------------- */

function Footprints({ w }: { w: WorldData }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const prints = useMemo(() => {
    const n = w.districts.length, sector = (Math.PI * 2) / n;
    const out: { x: number; z: number; yaw: number }[] = [];
    const told = new Set(w.stories.map((s) => s.project));
    w.projects.filter((p) => told.has(p.slug)).forEach((p) => {
      const i = w.districts.indexOf(p.domain);
      const a = (i + 0.5) * sector - Math.PI / 2;
      const r = Math.hypot(p.x, p.z);
      const from = new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);   // the road, at the same distance
      const to = new THREE.Vector2(p.x, p.z);
      const len = from.distanceTo(to) - 2.4;
      if (len < 1) return;
      const dir = to.clone().sub(from).normalize();
      const side = new THREE.Vector2(-dir.y, dir.x);
      const yaw = Math.atan2(dir.x, dir.y);
      for (let k = 0, t = 1.6; t < len; k++, t += 1.1) {
        const o = side.clone().multiplyScalar(k % 2 ? 0.28 : -0.28);
        out.push({ x: from.x + dir.x * t + o.x, z: from.y + dir.y * t + o.y, yaw });
      }
    });
    return out;
  }, [w]);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Object3D();
    prints.forEach((f, i) => {
      m.position.set(f.x, 0.05, f.z);
      m.rotation.set(-Math.PI / 2, 0, -f.yaw);
      m.scale.set(0.22, 0.38, 1);
      m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [prints]);
  if (!prints.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, prints.length]}>
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial color={INK} transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  );
}

/* ---------------- 5. an arch where each road leaves the plaza ---------------- */

function Arches({ w }: { w: WorldData }) {
  const n = w.districts.length, sector = (Math.PI * 2) / n;
  const r = w.plaza + 6.5;
  return (
    <group>
      {w.districts.map((d, i) => {
        const a = (i + 0.5) * sector - Math.PI / 2;
        return (
          <group key={d} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            {[-2.3, 2.3].map((z) => (
              <mesh key={z} position={[0, 2.1, z]}>
                <boxGeometry args={[0.45, 4.2, 0.45]} />
                <meshBasicMaterial color={PEN[d]} />
              </mesh>
            ))}
            <mesh position={[0, 4.45, 0]}>
              <boxGeometry args={[0.6, 0.7, 5.4]} />
              <meshBasicMaterial color={PEN[d]} />
            </mesh>
            <lineSegments position={[0, 4.45, 0]}>
              <edgesGeometry args={[new THREE.BoxGeometry(0.6, 0.7, 5.4)]} />
              <lineBasicMaterial color={INK} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- 6. the edge of the record ---------------- */

function EdgeSign({ w }: { w: WorldData }) {
  const z = -(w.rim + 9);
  return (
    <group position={[0, 0, z]}>
      <mesh position={[-1.6, 1.6, 0]}><boxGeometry args={[0.25, 3.2, 0.25]} /><meshBasicMaterial color={INK} /></mesh>
      <mesh position={[1.6, 1.6, 0]}><boxGeometry args={[0.25, 3.2, 0.25]} /><meshBasicMaterial color={INK} /></mesh>
      <Sign text="Edge of the record" at={[0, 3.6, 0]} h={1.1} size={40} />
      <Sign text="Before 2019: a mechanical engineering degree and three research internships" at={[0, 2.5, 0]} h={0.62} size={30} bg="#ffffff" ink={INK} />
    </group>
  );
}

/* ---------------- 7. the skill groups, named on the ground by their stones ---------------- */

function SkillGroupNames({ w, spots }: { w: WorldData; spots: Record<string, [number, number]> }) {
  const groups = useMemo(() => {
    const by: Record<string, { x: number; z: number; n: number; family: string }> = {};
    w.skills.forEach((s) => {
      const p = spots[s.slug];
      if (!p) return;
      const g = (by[s.group] ??= { x: 0, z: 0, n: 0, family: s.family });
      g.x += p[0]; g.z += p[1]; g.n++;
    });
    return Object.entries(by).map(([name, g]) => {
      const a = Math.atan2(g.z / g.n, g.x / g.n);
      return { name, family: g.family, x: Math.cos(a) * 16.4, z: Math.sin(a) * 16.4 };
    });
  }, [w, spots]);
  return (
    <group>
      {groups.map((g) => (
        <Decal key={g.name} text={g.name.toUpperCase()} h={0.95} at={[g.x, 0.04, g.z]} yaw={CAMERA_YAW}
               ink={FAMILY_INK[g.family] ?? INK} weight={800} />
      ))}
    </group>
  );
}

/* ---------------- 8. a compass rose by NOW: outward is the past ---------------- */

function Rose() {
  const ticks = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r0 = i % 4 ? 1.5 : 1.1, r1 = 1.9;
      pts.push(Math.cos(a) * r0, 0.05, Math.sin(a) * r0, Math.cos(a) * r1, 0.05, Math.sin(a) * r1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <group position={[-8.8, 0, 2.0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <ringGeometry args={[1.9, 2.05, 40]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <lineSegments geometry={ticks}><lineBasicMaterial color={INK} /></lineSegments>
      {/* the avenue of years runs north, so north is the past */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -0.9]}>
        <circleGeometry args={[0.55, 3, Math.PI / 2]} />
        <meshBasicMaterial color="#e0557f" />
      </mesh>
      <Decal text="PAST" h={0.7} at={[0, 0.05, -2.8]} ink="#e0557f" weight={900} />
      <Decal text="any road outward is the past" h={0.5} at={[0, 0.05, 2.7]} yaw={CAMERA_YAW} ink="#4e5a74" weight={600} />
    </group>
  );
}

/* ---------------- 10. things that reward wandering ---------------- */

function Egg({ at, children, note, onOpen }: {
  at: [number, number, number]; children: React.ReactNode; note: string; onOpen?: () => void;
}) {
  const [found, setFound] = useState(false);
  return (
    <group
      position={at}
      onClick={(e) => { e.stopPropagation(); if (!tap(e)) return; setFound(true); onOpen?.(); setTimeout(() => setFound(false), 4200); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {children}
      {found && (
        <Html position={[0, 2.4, 0]} center zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
          <div className="egg-note">{note}</div>
        </Html>
      )}
    </group>
  );
}

function Ludo() {
  const q = ["#e0557f", "#12a98a", "#d8871a", "#2b92d8"];
  return (
    <group>
      <mesh position={[0, 0.12, 0]}><boxGeometry args={[2.4, 0.24, 2.4]} /><meshBasicMaterial color="#ffffff" /></mesh>
      {q.map((c, i) => (
        <mesh key={c} position={[(i % 2 ? 0.6 : -0.6), 0.25, (i < 2 ? -0.6 : 0.6)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial color={c} />
        </mesh>
      ))}
      {q.map((c, i) => (
        <mesh key={"t" + c} position={[(i % 2 ? 0.6 : -0.6), 0.45, (i < 2 ? -0.6 : 0.6)]}>
          <coneGeometry args={[0.17, 0.42, 10]} />
          <meshBasicMaterial color={c} />
        </mesh>
      ))}
      <mesh position={[0.1, 0.42, 0.05]} rotation={[0.4, 0.6, 0]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </group>
  );
}

function RestingPlane() {
  return (
    <group rotation={[0, 0.7, 0.12]} scale={1.3}>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[(() => { const s = new THREE.Shape(); s.moveTo(-1, -0.7); s.lineTo(1.2, 0); s.lineTo(-1, 0.7); s.lineTo(-0.5, 0); s.lineTo(-1, -0.7); return s; })()]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.06, 3]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  );
}

/* ---------------- everything together ---------------- */

export function WorldMarks({ w, spots, onPick }: {
  w: WorldData; spots: Record<string, [number, number]>; onPick: (p: Pick) => void;
}) {
  const told = w.projects.filter((p) => p.tier === 3);
  const n = w.districts.length;
  const [px, pz] = districtSpot(2, n, w.rim + 5);
  return (
    <group>
      <RoleLines w={w} />
      <HomeArrows w={w} />
      {told.map((p) => <Pennant key={p.slug} p={p} />)}
      <Footprints w={w} />
      <Arches w={w} />
      <EdgeSign w={w} />
      <SkillGroupNames w={w} spots={spots} />
      <Rose />
      <Egg at={[-5.5, 0, 11.8]} note="You found the Ludo board. It is real: myludo.life, where one phone can seat several players.">
        <Ludo />
      </Egg>
      <Egg at={[px, 0, pz]} note="A paper plane made it all the way out here. Throw one yourself?"
           onOpen={() => setTimeout(() => onPick({ kind: "reach" }), 1400)}>
        <RestingPlane />
      </Egg>
    </group>
  );
}
