"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Cutout from "../Cutout";
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
};

/* A drag turns the world; only a press that barely moved counts as a click. */
const tap = (e: ThreeEvent<MouseEvent>) => e.delta <= 6;

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
function yearTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1b2437";
  g.beginPath(); g.roundRect(4, 8, 120, 48, 10); g.fill();
  g.fillStyle = "#ffffff";
  g.font = "600 34px system-ui, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 64, 33);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Roads({ w }: { w: WorldData }) {
  const n = w.districts.length;
  const sector = (Math.PI * 2) / n;
  const tex = useMemo(() => Object.fromEntries(w.rings.map((y) => [y.year, yearTexture(String(y.year))])), [w]);
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
              <sprite key={y.year} position={[y.r, 1.1, 2.4]} scale={[2.6, 1.3, 1]}>
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

function Visitor({ shared, motion }: { shared: Shared; motion: "full" | "static" }) {
  const body = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const faceRef = useRef("front");
  const [face, setFace] = useState("front");
  const look = useRef(new THREE.Vector3(0, 2, 0));

  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.("input, textarea");
    const d = (e: KeyboardEvent) => {
      if (typing(e)) return;
      keys.current[e.key.toLowerCase()] = true;
      if (e.key.startsWith("Arrow")) e.preventDefault();
    };
    const u = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const k = keys.current, pos = shared.me.current, target = shared.target;
    const step = new THREE.Vector3();
    // Q and E turn, R and F tilt; walking is relative to where the camera faces
    const turn = (k["q"] ? 1 : 0) - (k["e"] ? 1 : 0);
    const tilt = (k["r"] ? 1 : 0) - (k["f"] ? 1 : 0);
    if (turn) shared.yaw.current += turn * dt * 1.6;
    if (tilt) shared.pitch.current = THREE.MathUtils.clamp(shared.pitch.current + tilt * dt * 0.9, 0.12, 1.45);
    if (k["w"] || k["arrowup"]) step.z -= 1;
    if (k["s"] || k["arrowdown"]) step.z += 1;
    if (k["a"] || k["arrowleft"]) step.x -= 1;
    if (k["d"] || k["arrowright"]) step.x += 1;
    const speed = 18 * Math.max(1, shared.far.current * 0.8);

    if (step.lengthSq() > 0) {
      step.applyAxisAngle(new THREE.Vector3(0, 1, 0), shared.yaw.current);
      target.current = null;
      step.normalize().multiplyScalar(speed);
    } else if (target.current) {
      const to = target.current.clone().setY(0).sub(pos);
      if (motion === "static") { pos.copy(target.current).setY(0); target.current = null; }
      else if (to.length() < 0.6) target.current = null;
      // long journeys go faster, so nobody waits to cross the map
      else step.copy(to.normalize().multiplyScalar(Math.max(speed, Math.min(70, to.length() * 1.6))));
    }

    if (motion === "static") vel.current.copy(step);
    else vel.current.lerp(step, Math.min(1, dt * 7));
    pos.addScaledVector(vel.current, dt);
    const r = Math.hypot(pos.x, pos.z), lim = 150;
    if (r > lim) pos.multiplyScalar(lim / r);

    if (body.current) {
      body.current.position.copy(pos);
      const v = vel.current.length();
      body.current.position.y = motion === "static" ? 0 : Math.abs(Math.sin(performance.now() / 110)) * Math.min(v, 20) * 0.016;
      if (v > 0.4) {
        // which drawing to show depends on heading relative to the camera
        let a = Math.atan2(vel.current.x, vel.current.z) - shared.yaw.current;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        const next = a > 2.0 || a < -2.0 ? "back" : a > 0.6 ? "right" : a < -0.6 ? "left" : "front";
        if (next !== faceRef.current) { faceRef.current = next; setFace(next); }
      }
    }

    const narrow = window.innerWidth < 720 ? 1.55 : 1;
    const f = shared.far.current * narrow;
    const R = 63 * f, yw = shared.yaw.current, pt = shared.pitch.current;
    const want = new THREE.Vector3(
      pos.x + R * Math.sin(yw) * Math.cos(pt), R * Math.sin(pt), pos.z + R * Math.cos(yw) * Math.cos(pt));
    if (motion === "static") { camera.position.copy(want); look.current.set(pos.x, 2, pos.z); }
    else {
      camera.position.lerp(want, Math.min(1, dt * 2.6));
      look.current.lerp(new THREE.Vector3(pos.x, 2, pos.z), Math.min(1, dt * 4));
    }
    camera.lookAt(look.current);
  });

  return (
    <group ref={body}>
      <Cutout src={`walker-${face}`} width={2.6} position={[0, 0, 0]} anchor="bottom" billboard />
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 20]} />
        <meshBasicMaterial color={INK} transparent opacity={0.12} />
      </mesh>
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
      <Gates w={w} shared={shared} onPick={onPick} />
      <Plinths w={w} lit={litP} onPick={onPick} onHover={setHoverP} />
      <SkillStones w={w} shared={shared} spots={spots} lit={litS} onPick={onPick} onHover={setHoverS} />
      <Threads w={w} pick={pick} spots={spots} />
      <Suspense fallback={null}><Visitor shared={shared} motion={motion} /></Suspense>
      <Suspense fallback={null}><Centre w={w} onPick={onPick} /></Suspense>
      <Suspense fallback={null}><ProjectArt w={w} shared={shared} lit={litP} onPick={onPick} /></Suspense>
      <Stories w={w} shared={shared} onPick={onPick} />
      <HoverTag w={w} project={hoverP} skill={hoverS} spots={spots} />
    </>
  );
}
