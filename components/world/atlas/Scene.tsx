"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Cutout from "../Cutout";
import { Decal, CAMERA_YAW, tap, paint, WorldMarks, Sky } from "./Marks";
import { type AimTarget, buildColliders, buildTargets, groundAt, slide } from "./Colliders";
import { type Anim, Avatar, Footprints, RouteMarks, newAnim } from "./Avatar";
import { planTrip } from "./Trip";
import {
  type WorldData, type Pick, type Project, PEN, FILL, FAMILY_INK, ICON,
  districtSpot, skillSpots, plinth, span,
} from "./model";

/* The five drawn facades from the first world stand in for their projects. */
const FACADE: Record<string, string> = {
  "regulatory-medical-writing": "facade-document",
  "hybrid-chat": "facade-conversation",
  "omnichannel-inbox": "facade-inbox",
  talkingdb: "facade-questions",
  "kray-search-platform": "facade-search",
};
const INK = "#1b2437";
const SEE = 62;             // icons further than this from the visitor are not drawn

export type Shared = {
  /** where the visitor stands, written every frame */
  me: React.MutableRefObject<THREE.Vector3>;
  /** where the visitor is walking to, or null */
  target: React.MutableRefObject<THREE.Vector3 | null>;
  /** camera distance multiplier: 1 is street level, 3 is high ground */
  far: React.MutableRefObject<number>;
  /** camera heading round the visitor, and its tilt above the ground */
  yaw: React.MutableRefObject<number>;
  pitch: React.MutableRefObject<number>;
  /** which view is wanted, and how far the camera has gone into it (0 above, 1 at the eyes) */
  view: React.MutableRefObject<"tp" | "fpv">;
  blend: React.MutableRefObject<number>;
  /** first-person head tilt, up and down */
  look: React.MutableRefObject<number>;
  /** the phone joystick, -1..1 each way */
  stick: React.MutableRefObject<{ x: number; y: number }>;
  /** what the crosshair rests on; the HUD reads it */
  aim: React.MutableRefObject<AimTarget | null>;
  /** set to a time to throw a paper plane from the eyes */
  plane: React.MutableRefObject<number | null>;
  /** soft footsteps, off unless the visitor turns them on */
  sound: React.MutableRefObject<boolean>;
  /** a hop was asked for */
  hop: React.MutableRefObject<boolean>;
  /** the trip under way, for the minimap: its route, and whether it is flown */
  trip: React.MutableRefObject<{ pts: [number, number][]; fly: boolean } | null>;
  /** a card waiting for me to arrive: opened when I reach this goal */
  arrive: React.MutableRefObject<{ goal: THREE.Vector3; focus: [number, number]; open: () => void } | null>;
};


/* Signs drawn with <Html> live inside the canvas's own element, so a click on
   one would bubble on to the 3D layer and pick whatever stands behind it. */
const stop = { onClick: (e: React.MouseEvent) => e.stopPropagation(),
               onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

/* ---------------- an icon on a stick ---------------- */

type IconProps = {
  name: string; at: [number, number, number]; size: number; always?: boolean;
  me: React.MutableRefObject<THREE.Vector3>; onClick?: () => void; dim?: boolean;
};
/* each icon loads on its own, so one slow file never holds back the rest */
function Icon(props: IconProps) {
  return <Suspense fallback={null}><IconArt {...props} /></Suspense>;
}

function IconArt({ name, at, size, always = false, me, onClick, dim = false }: {
  name: string; at: [number, number, number]; size: number; always?: boolean;
  me: React.MutableRefObject<THREE.Vector3>; onClick?: () => void; dim?: boolean;
}) {
  const tex = useTexture(ICON(name));
  const ref = useRef<THREE.Sprite>(null);
  useMemo(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }, [tex]);
  useFrame(() => {
    if (!ref.current || always) return;
    ref.current.visible = Math.hypot(me.current.x - at[0], me.current.z - at[2]) < SEE;
  });
  return (
    <sprite
      ref={ref}
      position={at}
      scale={[size, size, 1]}
      onClick={onClick && ((e) => { e.stopPropagation(); if (tap(e)) onClick(); })}
      onPointerOver={onClick && (() => (document.body.style.cursor = "pointer"))}
      onPointerOut={onClick && (() => (document.body.style.cursor = ""))}
    >
      <spriteMaterial map={tex} alphaTest={0.5} toneMapped={false} opacity={dim ? 0.35 : 1} transparent={dim} />
    </sprite>
  );
}

/* ---------------- the ground: paper disc, year rings, avenue, wedges ---------------- */

function Ground({ w, onMove }: { w: WorldData; onMove: (p: THREE.Vector3) => void }) {
  const rings = useMemo(() => {
    const pts: number[] = [];
    const add = (r: number) => {
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * Math.PI * 2, b = ((i + 1) / 160) * Math.PI * 2;
        pts.push(Math.cos(a) * r, 0.03, Math.sin(a) * r, Math.cos(b) * r, 0.03, Math.sin(b) * r);
      }
    };
    w.rings.forEach((x) => add(x.r));
    add(w.plaza);
    // the lanes between districts, from the plaza to the rim
    const n = w.districts.length;
    for (let i = 1; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      pts.push(Math.cos(a) * w.plaza, 0.03, Math.sin(a) * w.plaza,
               Math.cos(a) * (w.rim + 10), 0.03, Math.sin(a) * (w.rim + 10));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [w]);

  const n = w.districts.length;
  const sector = (Math.PI * 2) / n;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); if (tap(e)) onMove(e.point.clone()); }}>
        <circleGeometry args={[w.rim + 22, 96]} />
        <meshBasicMaterial color="#fbfcff" />
      </mesh>
      {/* each district is a pastel wedge in its own pen */}
      {w.districts.map((d, i) => (
        <mesh key={d} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          {/* ringGeometry runs anticlockwise in its own plane; flipping it onto
              the ground mirrors z, so the angle is negated to match atan2 */}
          <ringGeometry args={[w.plaza, w.rim + 10, 24, 1,
            -((i + 0.06) * sector - Math.PI / 2) - sector * 0.88, sector * 0.88]} />
          <meshBasicMaterial color={FILL[d]} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
      {/* the plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[w.plaza, 64]} />
        <meshBasicMaterial color="#f1f4fb" />
      </mesh>
      {/* the avenue of years, running north out of the plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -(w.plaza + w.rim) / 2 - 4]}>
        <planeGeometry args={[3.2, w.rim - w.plaza + 14]} />
        <meshBasicMaterial color="#e6ebf6" />
      </mesh>
      <lineSegments geometry={rings}>
        <lineBasicMaterial color="#c9d2e6" />
      </lineSegments>
    </group>
  );
}

/* year posts along the avenue, and the role each stretch of years belongs to */
function Years({ w }: { w: WorldData }) {
  return (
    <group>
      {w.rings.map((y) => (
        <group key={y.year} position={[0, 0, -y.r]}>
          <mesh position={[2.4, 1.1, 0]}>
            <boxGeometry args={[0.22, 2.2, 0.22]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          <Html position={[2.4, 2.9, 0]} center distanceFactor={28} zIndexRange={[8, 0]}>
            <div className="atlas-year" {...stop}>{y.year}</div>
          </Html>
        </group>
      ))}
      {w.roles.map((r, i) => {
        const mid = (r.r_start + r.r_end) / 2;
        return (
          <group key={r.id}>
            {/* a coloured kerb marks how far each role reached */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.1, 0.04, -mid]}>
              <planeGeometry args={[0.6, Math.max(0.5, r.r_start - r.r_end - 0.6)]} />
              <meshBasicMaterial color={["#1b2437", "#4e5a74", "#7b87a3"][i % 3]} />
            </mesh>
            <Html position={[-3, 1.4, -mid]} center distanceFactor={30} zIndexRange={[8, 0]}>
              <div className="atlas-role" {...stop}><b>{r.title}</b><span>{r.dates}</span></div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- a road out to each district, with its years marked ---------------- */

/** One small drawn label per year, shared by every road. */
/** One drawn marker per year, shared by every road: the year, and how far
 *  back it is, for anyone who would rather not do the arithmetic. */
function yearTexture(year: number, now: number) {
  const c = document.createElement("canvas");
  c.width = 176; c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1b2437";
  g.beginPath(); g.roundRect(4, 4, 168, 88, 14); g.fill();
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "700 40px system-ui, sans-serif";
  g.fillText(String(year), 88, 36);
  const back = now - year;
  g.fillStyle = "#c9d2e6"; g.font = "600 22px system-ui, sans-serif";
  g.fillText(back <= 0 ? "this year" : back === 1 ? "1 yr back" : `${back} yrs back`, 88, 71);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Roads({ w }: { w: WorldData }) {
  const n = w.districts.length;
  const sector = (Math.PI * 2) / n;
  const tex = useMemo(() => Object.fromEntries(w.rings.map((y) => [y.year, yearTexture(y.year, +w.now.slice(0, 4))])), [w]);
  const len = w.rim + 8 - w.plaza;
  return (
    <group>
      {w.districts.map((d, i) => {
        const a = (i + 0.5) * sector - Math.PI / 2;
        return (
          <group key={d} rotation={[0, -a, 0]}>
            {/* the road itself, a pale strip edged in the district's pen */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w.plaza + len / 2, 0.025, 0]}>
              <planeGeometry args={[len, 2.6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {[-1.4, 1.4].map((o) => (
              <mesh key={o} rotation={[-Math.PI / 2, 0, 0]} position={[w.plaza + len / 2, 0.03, o]}>
                <planeGeometry args={[len, 0.22]} />
                <meshBasicMaterial color={PEN[d]} />
              </mesh>
            ))}
            {/* chevrons pointing outward: further along is further back in time */}
            {Array.from({ length: Math.floor(len / 9) }, (_, k) => (
              <mesh key={k} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} position={[w.plaza + 6 + k * 9, 0.035, 0]}>
                <circleGeometry args={[0.55, 3]} />
                <meshBasicMaterial color={PEN[d]} transparent opacity={0.55} />
              </mesh>
            ))}
            {/* the year, where the road crosses each ring */}
            {w.rings.map((y) => (
              <sprite key={y.year} position={[y.r, 1.3, 2.6]} scale={[2.9, 1.58, 1]}>
                <spriteMaterial map={tex[y.year]} toneMapped={false} />
              </sprite>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- the district gates at the plaza's edge ---------------- */

function Gates({ w, shared, onPick }: { w: WorldData; shared: Shared; onPick: (p: Pick) => void }) {
  const label = Object.fromEntries(w.domains.map((d) => [d.id, d]));
  return (
    <group>
      {w.districts.map((d, i) => {
        const [x, z] = districtSpot(i, w.districts.length, w.plaza + 2.5);
        return (
          <group key={d} position={[x, 0, z]}>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[1.9, 2.1, 0.7, 24]} />
              <meshBasicMaterial color={PEN[d]} />
            </mesh>
            <Icon name={`domain-${d}`} at={[0, 3, 0]} size={3.6} always me={shared.me}
                  onClick={() => onPick({ kind: "district", id: d })} />
            <Html position={[0, 5.6, 0]} center distanceFactor={26} zIndexRange={[9, 0]}>
              <button className="atlas-gate" style={{ ["--pen" as any]: PEN[d] }} onPointerDown={stop.onPointerDown}
                      onClick={(e) => { e.stopPropagation(); onPick({ kind: "district", id: d }); }}>
                {label[d]?.label ?? d}<span>{label[d]?.count}</span>
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- projects: plinths in one draw call, icons on top ---------------- */

function Plinths({ w, lit, onPick, onHover }: {
  w: WorldData; lit: Set<string> | null;
  onPick: (p: Pick) => void; onHover: (p: Project | null) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const edges = useMemo(() => {
    // every plinth's outline merged into one line buffer
    const e = new THREE.EdgesGeometry(box);
    const src = e.getAttribute("position").array as Float32Array;
    const out: number[] = [];
    w.projects.forEach((p) => {
      const h = plinth(p), s = p.tier === 3 ? 3.4 : 2.4;
      for (let i = 0; i < src.length; i += 3)
        out.push(p.x + src[i] * s, src[i + 1] * h + h / 2, p.z + src[i + 2] * s);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    return g;
  }, [w, box]);

  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Object3D(), c = new THREE.Color();
    w.projects.forEach((p, i) => {
      const h = plinth(p), s = p.tier === 3 ? 3.4 : 2.4;
      m.position.set(p.x, h / 2, p.z);
      m.scale.set(s, h, s);
      m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix);
      const on = !lit || lit.has(p.slug);
      // with nothing picked, case studies wear the full pen; once something is
      // picked, everything it touches does, and the rest goes pale
      ref.current!.setColorAt(i, c.set(!on ? "#f1f3f8" : lit || p.tier === 3 ? PEN[p.domain] : FILL[p.domain]));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [w, lit]);

  return (
    <group>
      <instancedMesh
        ref={ref}
        args={[box, undefined as any, w.projects.length]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.instanceId != null && tap(e)) onPick({ kind: "project", slug: w.projects[e.instanceId].slug });
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (e.instanceId != null) { onHover(w.projects[e.instanceId]); document.body.style.cursor = "pointer"; }
        }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={INK} transparent opacity={lit ? 0.35 : 0.8} />
      </lineSegments>
    </group>
  );
}

function ProjectArt({ w, shared, lit, onPick }: {
  w: WorldData; shared: Shared; lit: Set<string> | null; onPick: (p: Pick) => void;
}) {
  return (
    <group>
      {w.projects.map((p) => {
        const h = plinth(p);
        const dim = !!lit && !lit.has(p.slug);
        const go = () => onPick({ kind: "project", slug: p.slug });
        if (FACADE[p.slug])
          return (
            <group key={p.slug} position={[p.x, h, p.z]} onClick={(e) => { e.stopPropagation(); if (tap(e)) go(); }}>
              <Cutout src={FACADE[p.slug]} width={4.6} position={[0, 0, 0]} anchor="bottom" billboard />
            </group>
          );
        return (
          <Icon key={p.slug} name={`project-${p.slug}`} at={[p.x, h + (p.tier === 3 ? 2.4 : 1.7), p.z]}
                size={p.tier === 3 ? 4.2 : 2.9} me={shared.me} onClick={go} dim={dim} />
        );
      })}
    </group>
  );
}

/* stories hang in a slow orbit round the project they happened on */
function Stories({ w, shared, onPick }: { w: WorldData; shared: Shared; onPick: (p: Pick) => void }) {
  const at = Object.fromEntries(w.projects.map((p) => [p.slug, p]));
  const groups = useMemo(() => {
    const g: Record<string, string[]> = {};
    w.stories.forEach((s) => (g[s.project] ??= []).push(s.id));
    return Object.entries(g).filter(([k]) => at[k]);
  }, [w]); // eslint-disable-line react-hooks/exhaustive-deps
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((st) => {
    refs.current.forEach((r, i) => { if (r) r.rotation.y = st.clock.elapsedTime * 0.18 + i; });
  });
  return (
    <group>
      {groups.map(([slug, ids], gi) => {
        const p = at[slug];
        const h = plinth(p) + (FACADE[slug] ? 7.5 : 5.5);
        return (
          <group key={slug} position={[p.x, h, p.z]} ref={(r) => { refs.current[gi] = r; }}>
            {ids.map((id, k) => {
              const a = (k / ids.length) * Math.PI * 2;
              const rad = 3 + ids.length * 0.35;
              return (
                <Icon key={id} name={`story-${id}`} at={[Math.cos(a) * rad, (k % 2) * 0.8, Math.sin(a) * rad]}
                      size={1.9} me={shared.me} onClick={() => onPick({ kind: "story", id })} />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- skills: a ring of stones round the plaza ---------------- */

function SkillStones({ w, shared, spots, lit, onPick, onHover }: {
  w: WorldData; shared: Shared; spots: Record<string, [number, number]>;
  lit: Set<string> | null; onPick: (p: Pick) => void; onHover: (name: string | null) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.42, 0.55, 1, 8), []);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Object3D(), c = new THREE.Color();
    w.skills.forEach((s, i) => {
      const [x, z] = spots[s.slug];
      const h = 0.4 + s.strength * 0.4;
      m.position.set(x, h / 2, z);
      m.scale.set(1, h, 1);
      m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix);
      const on = !lit || lit.has(s.slug);
      ref.current!.setColorAt(i, c.set(on ? FAMILY_INK[s.family] ?? INK : "#e3e7f0"));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [w, spots, lit]);

  return (
    <group>
      <instancedMesh
        ref={ref}
        args={[geo, undefined as any, w.skills.length]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.instanceId != null && tap(e)) onPick({ kind: "skill", slug: w.skills[e.instanceId].slug });
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (e.instanceId != null) { onHover(w.skills[e.instanceId].slug); document.body.style.cursor = "pointer"; }
        }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {w.skills.map((s) => {
        const [x, z] = spots[s.slug];
        return (
          <Icon key={s.slug} name={s.icon} at={[x, 0.95 + s.strength * 0.4, z]} size={1.15}
                me={shared.me} dim={!!lit && !lit.has(s.slug)}
                onClick={() => onPick({ kind: "skill", slug: s.slug })} />
        );
      })}
    </group>
  );
}

/* threads from a skill stone to every project that used it, or the reverse */
function Threads({ w, pick, spots }: { w: WorldData; pick: Pick | null; spots: Record<string, [number, number]> }) {
  const geo = useMemo(() => {
    if (!pick || (pick.kind !== "skill" && pick.kind !== "project")) return null;
    const bySlug = Object.fromEntries(w.projects.map((p) => [p.slug, p]));
    const byName = Object.fromEntries(w.skills.map((s) => [s.name.toLowerCase(), s]));
    const pairs: [THREE.Vector3, THREE.Vector3, string][] = [];
    const top = (p: Project) => new THREE.Vector3(p.x, plinth(p) + 0.2, p.z);
    const stone = (slug: string, strength: number) =>
      new THREE.Vector3(spots[slug][0], 0.5 + strength * 0.4, spots[slug][1]);
    if (pick.kind === "skill") {
      const s = w.skills.find((x) => x.slug === pick.slug);
      s?.projects.forEach((slug) => bySlug[slug] &&
        pairs.push([stone(s.slug, s.strength), top(bySlug[slug]), FAMILY_INK[s.family]]));
    } else {
      const p = bySlug[pick.slug];
      p?.skills.forEach((name) => {
        const s = byName[name.toLowerCase()];
        if (s && spots[s.slug]) pairs.push([top(p), stone(s.slug, s.strength), FAMILY_INK[s.family]]);
      });
    }
    const pos: number[] = [], col: number[] = [];
    const c = new THREE.Color();
    pairs.forEach(([a, b, ink]) => {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += 6 + a.distanceTo(b) * 0.22;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const pts = curve.getPoints(28);
      c.set(ink);
      for (let i = 0; i < pts.length - 1; i++) {
        pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [w, pick, spots]);
  if (!geo) return null;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors toneMapped={false} />
    </lineSegments>
  );
}

/* ---------------- the plaza's markings ---------------- */


function PlazaMarks({ w, onPick }: { w: WorldData; onPick: (p: Pick) => void }) {
  const n = w.districts.length;
  const sector = (Math.PI * 2) / n;
  const label = Object.fromEntries(w.domains.map((d) => [d.id, d.label]));
  const R0 = 7, R1 = w.plaza;               // spokes run from the centre's edge to the plaza's
  const ringR = w.plaza - 2.6;

  /* the ring road's centre line, as dashes in one draw call */
  const dashes = useMemo(() => {
    const pts: number[] = [];
    const k = 64;
    for (let i = 0; i < k; i += 1) {
      const a0 = (i / k) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / k) * 0.5;
      for (const [a, b] of [[a0, a1]]) {
        const steps = 4;
        for (let j = 0; j < steps; j++) {
          const x0 = a + (b - a) * (j / steps), x1 = a + (b - a) * ((j + 1) / steps);
          pts.push(Math.cos(x0) * ringR, 0.04, Math.sin(x0) * ringR, Math.cos(x1) * ringR, 0.04, Math.sin(x1) * ringR);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [ringR]);

  return (
    <group>
      {/* 3. the ring road joining every road head */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[ringR - 1.3, ringR + 1.3, 96]} />
        <meshBasicMaterial color="#dfe5f2" />
      </mesh>
      <lineSegments geometry={dashes}><lineBasicMaterial color="#ffffff" /></lineSegments>

      {w.districts.map((d, i) => {
        const a = (i + 0.5) * sector - Math.PI / 2;
        const len = R1 - R0;
        return (
          <group key={d} rotation={[0, -a, 0]}>
            {/* 1. a coloured spoke from me to the district's road */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R0 + len / 2, 0.025, 0]}>
              <planeGeometry args={[len, 2.2]} />
              <meshBasicMaterial color={PEN[d]} transparent opacity={0.32} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[R0 + len / 2, 0.028, 0]}>
              <planeGeometry args={[len, 0.18]} />
              <meshBasicMaterial color={PEN[d]} />
            </mesh>
            {/* 6. a zebra crossing where the spoke passes through the skill stones */}
            {Array.from({ length: 6 }, (_, k) => (
              <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[19.6 + k * 1.05, 0.032, 0]}>
                <planeGeometry args={[0.5, 2.2]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            ))}
            {/* 2. the district's name painted on its spoke, reading outward */}
            {/* turned to read upright from the default view; the arrow still points out */}
            {Math.cos(a + CAMERA_YAW) >= 0
              ? <Decal text={`${label[d] ?? d} →`} h={1.5} at={[13.2, 0.036, 0]} ink={INK} weight={800} />
              : <Decal text={`← ${label[d] ?? d}`} h={1.5} at={[13.2, 0.036, 0]} yaw={Math.PI} ink={INK} weight={800} />}
          </group>
        );
      })}

      {/* 4. the plaza is now */}
      <group rotation={[0, CAMERA_YAW, 0]}>
        <Decal text="NOW" h={3.6} at={[0, 0.04, 6.4]} ink="#1b2437" weight={900} />
        <Decal text="every ring out is a year further back" h={0.85} at={[0, 0.04, 8.7]} ink="#4e5a74" weight={600} />
      </group>

      {/* 5. a fingerpost by me, one board per district; click one to go */}
      <Fingerpost w={w} onPick={onPick} label={label} />
    </group>
  );
}

function Board({ text, back, color, onClick }: { text: string; back: string; color: string; onClick: () => void }) {
  const front = useMemo(() => paint(text, { size: 44, ink: "#ffffff", weight: 700 }), [text]);
  const rear = useMemo(() => paint(back, { size: 44, ink: "#ffffff", weight: 700 }), [back]);
  const L = 3.6, H = 0.62;
  const fit = (aspect: number) => Math.min(L - 0.3, (H - 0.12) * aspect);
  return (
    <group
      onClick={(e) => { e.stopPropagation(); if (tap(e)) onClick(); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh position={[L / 2 + 0.15, 0, 0]}>
        <boxGeometry args={[L, H, 0.09]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[L / 2 + 0.15, 0, 0.05]}>
        <planeGeometry args={[fit(front.aspect), fit(front.aspect) / front.aspect]} />
        <meshBasicMaterial map={front.tex} transparent toneMapped={false} />
      </mesh>
      <mesh position={[L / 2 + 0.15, 0, -0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[fit(rear.aspect), fit(rear.aspect) / rear.aspect]} />
        <meshBasicMaterial map={rear.tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function Fingerpost({ w, onPick, label }: { w: WorldData; onPick: (p: Pick) => void; label: Record<string, string> }) {
  const n = w.districts.length;
  const sector = (Math.PI * 2) / n;
  return (
    <group position={[6.2, 0, 2.2]}>
      <mesh position={[0, 3.4, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 6.8, 10]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[0, 6.95, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshBasicMaterial color="#e0557f" />
      </mesh>
      {w.districts.map((d, i) => {
        const a = (i + 0.5) * sector - Math.PI / 2;
        return (
          <group key={d} position={[0, 6.3 - i * 0.74, 0]} rotation={[0, -a, 0]}>
            <Board text={`${label[d] ?? d} →`} back={`← ${label[d] ?? d}`} color={PEN[d]}
                   onClick={() => onPick({ kind: "district", id: d })} />
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- the person at the centre ---------------- */

function Centre({ w, onPick }: { w: WorldData; onPick: (p: Pick) => void }) {
  return (
    <group onClick={(e) => { e.stopPropagation(); if (tap(e)) onPick({ kind: "about" }); }}>
      <mesh position={[0, 0.3, -4]}>
        <cylinderGeometry args={[5.2, 5.6, 0.6, 40]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Cutout src="icons/hero-mayank" width={10} position={[0, 0.6, -4]} anchor="bottom" billboard />
      <Html position={[0, 9.4, -4]} center distanceFactor={24} zIndexRange={[10, 0]}>
        <button className="atlas-gate is-me" onPointerDown={stop.onPointerDown}
                onClick={(e) => { e.stopPropagation(); onPick({ kind: "about" }); }}>
          {w.profile.name}<span>{w.profile.headline.split("|")[0].trim()}</span>
        </button>
      </Html>
    </group>
  );
}

/* ---------------- the visitor, and the camera that follows ---------------- */

const EYE = 3.2;              // eye height in first person
let audio: AudioContext | null = null;

/** A soft paper footstep: a short burst of filtered noise. Only ever played
 *  after the visitor turns sound on, which is itself a gesture. */
function footstep() {
  try {
    audio ??= new AudioContext();
    const n = audio.sampleRate * 0.06;
    const buf = audio.createBuffer(1, n, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const src = audio.createBufferSource(); src.buffer = buf;
    const f = audio.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    const g = audio.createGain(); g.gain.value = 0.18;
    src.connect(f).connect(g).connect(audio.destination); src.start();
  } catch { /* no audio, no steps */ }
}

function Visitor({ w, shared, motion, onPick }: {
  w: WorldData; shared: Shared; motion: "full" | "static"; onPick: (p: Pick) => void;
}) {
  const { camera, scene } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const vy = useRef(0);                     // vertical speed, for hops
  const lookAt = useRef(new THREE.Vector3(0, 2, 0));
  const lastStep = useRef(0);
  const colliders = useMemo(() => buildColliders(w), [w]);
  const targets = useMemo(() => buildTargets(w), [w]);
  const aimAt = useRef(0);
  const anim = useRef<Anim>(newAnim());

  /* the trip under way: the route's points and how far along, or a flight */
  const trip = useRef<{
    goal: THREE.Vector3; pts: [number, number][]; i: number; len: number;
    best: number; since: number;            // closest yet to the next point, and when
    fly: { t0: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; top: number } | null;
  } | null>(null);
  /* the camera turns to look down the road, unless the visitor turns it */
  const cam = useRef({ yaw0: 0, set: 0, mine: false, settle: false });

  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.("input, textarea");
    const d = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
      if (k === " ") shared.hop.current = true;
      if (k === "f" && shared.view.current === "fpv") shared.plane.current = performance.now();
    };
    const u = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, [shared]);

  /** Reached the goal: turn to what was picked, point at it, then open its card. */
  const arrive = (goal: THREE.Vector3) => {
    const a = anim.current, pending = shared.arrive.current;
    a.dest = null; a.route = null; shared.trip.current = null;
    if (!pending || pending.goal !== goal) return;
    shared.arrive.current = null;
    const p = shared.me.current, yw = shared.yaw.current;
    // is the thing to my left or right, as the camera sees it?
    const side = (pending.focus[0] - p.x) * Math.cos(yw) - (pending.focus[1] - p.z) * Math.sin(yw);
    if (motion === "static") { pending.open(); return; }
    a.present = { until: performance.now() / 1000 + 0.4, mirror: side < 0 };
    setTimeout(pending.open, 320);
  };

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const k = keys.current, pos = shared.me.current, target = shared.target;
    const fpv = shared.view.current === "fpv";
    const a = anim.current, now = performance.now();
    const still = motion === "static";

    // ease the camera between above and the eyes (a cut for reduced motion)
    const want = fpv ? 1 : 0;
    shared.blend.current = still ? want : THREE.MathUtils.damp(shared.blend.current, want, 3.2, dt);
    const t = shared.blend.current;

    // did the visitor turn the camera themselves since we last turned it?
    if (Math.abs(shared.yaw.current - cam.current.set) > 1e-4) { cam.current.mine = true; cam.current.settle = false; }

    const step = new THREE.Vector3();
    const turn = (k["q"] ? 1 : 0) - (k["e"] ? 1 : 0);
    const tilt = (k["r"] ? 1 : 0) - (!fpv && k["f"] ? 1 : 0);
    if (turn) shared.yaw.current += turn * dt * 1.6;
    if (tilt && !fpv) shared.pitch.current = THREE.MathUtils.clamp(shared.pitch.current + tilt * dt * 0.9, 0.12, 1.45);
    if (k["w"] || k["arrowup"]) step.z -= 1;
    if (k["s"] || k["arrowdown"]) step.z += 1;
    if (k["a"] || k["arrowleft"]) step.x -= 1;
    if (k["d"] || k["arrowright"]) step.x += 1;
    step.x += shared.stick.current.x; step.z += shared.stick.current.y;   // the phone joystick
    const run = k["shift"] ? 2 : 1;
    const speed = fpv ? 9 * run : 18 * Math.max(1, shared.far.current * 0.8) * run;

    // a new place to go: plan the trip there
    if (target.current && (!trip.current || trip.current.goal !== target.current)) {
      const goal = target.current;
      const plan = planTrip(w, [pos.x, pos.z], [goal.x, goal.z]);
      trip.current = { goal, pts: plan.pts, i: 1, len: plan.len, fly: null, best: Infinity, since: now };
      if (plan.fly && !still && !fpv) {
        const dist = plan.len;
        trip.current.fly = {
          t0: now, dur: THREE.MathUtils.clamp(dist / 55, 1.3, 2.6) * 1000,
          from: pos.clone(), to: new THREE.Vector3(goal.x, 0, goal.z), top: Math.min(26, 6 + dist * 0.12),
        };
      }
      a.route = plan.fly ? null : plan.pts.slice(1);
      a.dest = [goal.x, goal.z];
      shared.trip.current = { pts: plan.pts, fly: !!trip.current.fly };
      a.idle = 0; a.present = null;
      cam.current = { yaw0: shared.yaw.current, set: shared.yaw.current, mine: fpv || still, settle: false };
    }

    let heading: number | null = null;     // which way the trip is going, for the camera
    if (step.lengthSq() > 0.01) {
      // the visitor took the wheel: drop the trip and anything waiting on it
      const mag = Math.min(1, step.length());
      step.applyAxisAngle(new THREE.Vector3(0, 1, 0), shared.yaw.current);
      if (trip.current && !trip.current.fly) {
        trip.current = null; target.current = null; shared.arrive.current = null;
        a.route = null; a.dest = null; shared.trip.current = null;
      }
      step.normalize().multiplyScalar(speed * mag);
      a.idle = 0; a.present = null; cam.current.settle = false;
    } else if (trip.current && !trip.current.fly) {
      const tr = trip.current;
      if (still) {
        pos.x = tr.goal.x; pos.z = tr.goal.z;
        trip.current = null; target.current = null; arrive(tr.goal);
      } else {
        // walk the route point by point; long routes walk briskly
        const [nx, nz] = tr.pts[tr.i];
        const to = new THREE.Vector3(nx - pos.x, 0, nz - pos.z);
        const last = tr.i === tr.pts.length - 1;
        // something solid in the way of this point: if I have stopped getting
        // closer for a moment, call it reached and carry on
        const d = to.length();
        if (d < tr.best - 0.05) { tr.best = d; tr.since = now; }
        const stuck = now - tr.since > 300;
        if (stuck || d < (last ? 0.6 : 1.1)) {
          tr.best = Infinity; tr.since = now;
          if (last) { trip.current = null; target.current = null; arrive(tr.goal); }
          else { tr.i += 1; a.route = tr.pts.slice(tr.i); shared.trip.current = { pts: tr.pts.slice(tr.i - 1), fly: false }; }
        } else {
          const brisk = Math.max(speed, Math.min(38, tr.len / 1.9));
          step.copy(to.normalize().multiplyScalar(last ? Math.min(brisk, Math.max(10, to.length() * 4)) : brisk));
          heading = Math.atan2(step.x, step.z);
        }
      }
    }

    const fl = trip.current?.fly;
    if (fl) {
      // the paper plane: up in an arc, a gentle bank, and down by the goal
      const s = Math.min(1, (now - fl.t0) / fl.dur);
      const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
      const prevX = pos.x, prevZ = pos.z;
      pos.x = THREE.MathUtils.lerp(fl.from.x, fl.to.x, e);
      pos.z = THREE.MathUtils.lerp(fl.from.z, fl.to.z, e);
      pos.y = THREE.MathUtils.lerp(fl.from.y, 0, s) + 4 * fl.top * s * (1 - s);
      a.flying = s < 1;
      a.heading = Math.atan2(fl.to.x - fl.from.x, fl.to.z - fl.from.z);
      heading = a.heading;
      a.bank = Math.sin(s * Math.PI * 2) * 0.35;
      vel.current.set((pos.x - prevX) / dt, 0, (pos.z - prevZ) / dt);
      a.floor = 0; vy.current = 0;
      if (s >= 1) {
        a.flying = false;
        pos.y = groundAt(colliders, pos.x, pos.z, 0);
        slide(colliders, pos, pos.y);
        a.landed = { t: now / 1000, x: pos.x, z: pos.z };
        vel.current.set(0, 0, 0);
        const goal = trip.current!.goal;
        trip.current = null; target.current = null; arrive(goal);
      }
    } else {
      if (still) vel.current.copy(step);
      else vel.current.lerp(step, Math.min(1, dt * 7));
      pos.x += vel.current.x * dt; pos.z += vel.current.z * dt;
      const r = Math.hypot(pos.x, pos.z), lim = 150;
      if (r > lim) { pos.x *= lim / r; pos.z *= lim / r; }

      // hop, gravity, standing on whatever is underfoot, sliding round the rest
      if (shared.hop.current) {
        shared.hop.current = false;
        if (pos.y <= groundAt(colliders, pos.x, pos.z, pos.y) + 0.05) vy.current = 9.5;
      }
      vy.current -= 26 * dt;
      pos.y += vy.current * dt;
      const floor = groundAt(colliders, pos.x, pos.z, pos.y);
      if (pos.y < floor) { pos.y = floor; vy.current = 0; }
      slide(colliders, pos, pos.y);
      a.floor = floor;
    }

    // the walking rhythm: head bob, steps if sound is on, and a footprint per step
    const v = Math.hypot(vel.current.x, vel.current.z);
    const grounded = !a.flying && pos.y <= a.floor + 0.05;
    if (v > 0.5 && grounded) {
      a.phase += dt * Math.min(v, 22) * 0.9;
      if (a.phase - lastStep.current > Math.PI) {
        lastStep.current = a.phase;
        if (shared.sound.current && fpv) footstep();
        if (!fpv && !still) {
          const ang = Math.atan2(vel.current.x, vel.current.z);
          a.prints.push({ x: pos.x, z: pos.z, a: ang, t: now / 1000, s: a.prints.length % 2 ? 1 : -1 });
        }
      }
    }
    a.v = a.flying ? 0 : v;
    if (v < 0.4 && !trip.current && !a.flying) a.idle += dt; else if (v >= 0.4) a.idle = 0;
    if (fpv) a.idle = 0;

    // which way I face, as the camera sees it, and how hard I lean sideways
    const yw0 = shared.yaw.current;
    if (v > 0.4 && !a.flying) {
      let ang = Math.atan2(vel.current.x, vel.current.z) - yw0;
      ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      a.face = ang > 2.0 || ang < -2.0 ? "back" : ang > 0.6 ? "right" : ang < -0.6 ? "left" : "front";
    }
    a.side = vel.current.x * Math.cos(yw0) - vel.current.z * Math.sin(yw0);

    // on a trip, the camera swings round to look the way I am going; after
    // it, it settles back where the visitor left it
    if (!cam.current.mine && !fpv) {
      if (heading !== null) {
        const want = heading + Math.PI;            // the camera sits behind me
        const d = Math.atan2(Math.sin(want - shared.yaw.current), Math.cos(want - shared.yaw.current));
        shared.yaw.current += d * Math.min(1, dt * 0.9);
        cam.current.settle = true;
      } else if (cam.current.settle && !trip.current) {
        const d = Math.atan2(Math.sin(cam.current.yaw0 - shared.yaw.current), Math.cos(cam.current.yaw0 - shared.yaw.current));
        shared.yaw.current += d * Math.min(1, dt * 1.8);
        if (Math.abs(d) < 0.01) cam.current.settle = false;
      }
      cam.current.set = shared.yaw.current;
    }

    // where each view would put the camera, mixed by the blend
    const narrow = window.innerWidth < 720 ? 1.55 : 1;
    const f = shared.far.current * narrow;
    const R = 63 * f, yw = shared.yaw.current, pt = shared.pitch.current;
    // in flight the camera keeps nearer the ground than I do, so the arc shows
    const camY = a.flying ? pos.y * 0.45 : pos.y;
    const tpCam = new THREE.Vector3(
      pos.x + R * Math.sin(yw) * Math.cos(pt), camY + R * Math.sin(pt), pos.z + R * Math.cos(yw) * Math.cos(pt));
    const tpLook = new THREE.Vector3(pos.x, camY + 2, pos.z);
    const bob = still ? 0 : Math.sin(a.phase * 2) * 0.09 * Math.min(1, v / 6);
    const fpCam = new THREE.Vector3(pos.x, pos.y + EYE + bob, pos.z);
    const lk = shared.look.current;
    const fpLook = fpCam.clone().add(new THREE.Vector3(-Math.sin(yw) * Math.cos(lk), Math.sin(lk), -Math.cos(yw) * Math.cos(lk)).multiplyScalar(10));
    const camWant = tpCam.lerp(fpCam, t);
    const lookWant = tpLook.lerp(fpLook, t);
    if (still || t > 0.98) { camera.position.copy(camWant); lookAt.current.copy(lookWant); }
    else {
      camera.position.lerp(camWant, Math.min(1, dt * (2.6 + t * 12)));
      lookAt.current.lerp(lookWant, Math.min(1, dt * (4 + t * 12)));
    }
    camera.lookAt(lookAt.current);

    // fog closes in at eye level, for depth and to spare the far draw calls
    const fog = scene.fog as THREE.Fog | null;
    if (fog) { fog.near = THREE.MathUtils.lerp(170, 55, t); fog.far = THREE.MathUtils.lerp(420, 230, t); }

    // the crosshair: the target nearest the centre of view, within reach
    if (fpv && now - aimAt.current > 90) {
      aimAt.current = now;
      const eye = camera.position, dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      let best: AimTarget | null = null, bestScore = Infinity;
      for (const o of targets) {
        const to = new THREE.Vector3(o.x - eye.x, o.y - eye.y, o.z - eye.z);
        const d = to.length();
        if (d > 48 || d < 1) continue;
        const off = to.normalize().angleTo(dir);
        const allow = Math.atan2(o.size, d) + 0.03;
        if (off < allow && off * d < bestScore) { bestScore = off * d; best = o; }
      }
      shared.aim.current = best;
    } else if (!fpv) shared.aim.current = null;
  });

  return (
    <>
      {/* in first person, you are me, so the drawn me steps aside */}
      <AvatarWhenOutside shared={shared} anim={anim} motion={motion} onPick={onPick} />
      <Footprints anim={anim} />
      <RouteMarks me={shared.me} anim={anim} />
    </>
  );
}

/** The drawn me, hidden once the camera is behind my eyes. */
function AvatarWhenOutside({ shared, anim, motion, onPick }: {
  shared: Shared; anim: React.MutableRefObject<Anim>; motion: "full" | "static"; onPick: (p: Pick) => void;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (g.current) g.current.visible = shared.blend.current < 0.6; });
  return <group ref={g}><Avatar me={shared.me} anim={anim} motion={motion} onPick={onPick} /></group>;
}

/* ---------------- a paper plane thrown from the eyes ---------------- */

function ThrownPlane({ shared, onPick }: { shared: Shared; onPick: (p: Pick) => void }) {
  const ref = useRef<THREE.Group>(null);
  const flight = useRef<{ t0: number; from: THREE.Vector3; dir: THREE.Vector3 } | null>(null);
  const { camera } = useThree();
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.9); s.lineTo(0.6, -0.6); s.lineTo(0, -0.25); s.lineTo(-0.6, -0.6); s.lineTo(0, 0.9);
    return new THREE.ShapeGeometry(s);
  }, []);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (shared.plane.current && !flight.current) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      flight.current = { t0: shared.plane.current, from: camera.position.clone().add(dir.clone().multiplyScalar(1.5)).add(new THREE.Vector3(0, -0.6, 0)), dir };
      shared.plane.current = null;
    }
    const fl = flight.current;
    g.visible = !!fl;
    if (!fl) return;
    const s = (performance.now() - fl.t0) / 1000;
    // a glide: forward, a little lift, then a sink, with a gentle roll
    g.position.copy(fl.from).addScaledVector(fl.dir, s * 14).add(new THREE.Vector3(0, Math.sin(s * 2.4) * 0.8 - s * s * 0.8, 0));
    g.lookAt(g.position.clone().add(fl.dir));
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.sin(s * 3) * 0.4);
    if (s > 1.7) { flight.current = null; onPick({ kind: "reach" }); }
  });
  return (
    <group ref={ref} visible={false}>
      <mesh geometry={shape}><meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
      <lineSegments><edgesGeometry args={[shape]} /><lineBasicMaterial color={INK} /></lineSegments>
    </group>
  );
}

/* ---------------- what the pointer is over ---------------- */

function HoverTag({ w, project, skill, spots }: {
  w: WorldData; project: Project | null; skill: string | null; spots: Record<string, [number, number]>;
}) {
  if (project)
    return (
      <Html position={[project.x, plinth(project) + 6.2, project.z]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
        <div className="atlas-tag" style={{ ["--pen" as any]: PEN[project.domain] }}>
          <b>{project.label}</b><span>{span(project)}</span>
        </div>
      </Html>
    );
  if (skill) {
    const s = w.skills.find((x) => x.slug === skill)!;
    const [x, z] = spots[skill];
    return (
      <Html position={[x, 4.2, z]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
        <div className="atlas-tag" style={{ ["--pen" as any]: FAMILY_INK[s.family] }}>
          <b>{s.name}</b><span>{s.group} · {s.projects.length} projects</span>
        </div>
      </Html>
    );
  }
  return null;
}

/* ---------------- scene ---------------- */

export default function Scene({ w, shared, pick, onPick, motion }: {
  w: WorldData; shared: Shared; pick: Pick | null; onPick: (p: Pick) => void; motion: "full" | "static";
}) {
  const spots = useMemo(() => skillSpots(w.skills), [w]);
  const [hoverP, setHoverP] = useState<Project | null>(null);
  const [hoverS, setHoverS] = useState<string | null>(null);

  /* what stays lit while something is picked: the thing and what it touches */
  const { litP, litS } = useMemo(() => {
    if (!pick) return { litP: null, litS: null };
    const byName = Object.fromEntries(w.skills.map((s) => [s.name.toLowerCase(), s.slug]));
    if (pick.kind === "skill") {
      const s = w.skills.find((x) => x.slug === pick.slug);
      return { litP: new Set(s?.projects ?? []), litS: new Set([pick.slug]) };
    }
    if (pick.kind === "project") {
      const p = w.projects.find((x) => x.slug === pick.slug);
      return {
        litP: new Set([pick.slug]),
        litS: new Set((p?.skills ?? []).map((n) => byName[n.toLowerCase()]).filter(Boolean)),
      };
    }
    if (pick.kind === "district")
      return { litP: new Set(w.projects.filter((p) => p.domain === pick.id).map((p) => p.slug)), litS: null };
    return { litP: null, litS: null };
  }, [w, pick]);

  return (
    <>
      <color attach="background" args={["#f4f7fd"]} />
      <fog attach="fog" args={["#f4f7fd", 170, 420]} />
      <Ground w={w} onMove={(p) => (shared.target.current = p)} />
      <Years w={w} />
      <Roads w={w} />
      <PlazaMarks w={w} onPick={onPick} />
      <WorldMarks w={w} spots={spots} onPick={onPick} blend={shared.blend} />
      <Sky />
      <Gates w={w} shared={shared} onPick={onPick} />
      <Plinths w={w} lit={litP} onPick={onPick} onHover={setHoverP} />
      <SkillStones w={w} shared={shared} spots={spots} lit={litS} onPick={onPick} onHover={setHoverS} />
      <Threads w={w} pick={pick} spots={spots} />
      <Suspense fallback={null}><Visitor w={w} shared={shared} motion={motion} onPick={onPick} /><ThrownPlane shared={shared} onPick={onPick} /></Suspense>
      <Suspense fallback={null}><Centre w={w} onPick={onPick} /></Suspense>
      <Suspense fallback={null}><ProjectArt w={w} shared={shared} lit={litP} onPick={onPick} /></Suspense>
      <Stories w={w} shared={shared} onPick={onPick} />
      <HoverTag w={w} project={hoverP} skill={hoverS} spots={spots} />
    </>
  );
}
