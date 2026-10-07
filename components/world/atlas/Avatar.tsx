"use client";

import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BASE } from "../Cutout";
import { tap } from "./Marks";
import type { Pick } from "./model";

/* The drawn me, and everything my walking leaves on the world. Visitor in
   Scene.tsx decides where I am; this decides how I look while getting there:
   a walk with lean, sway and a step squash, a paper flip when I turn, a paper
   plane for long trips, a point on arrival, and something to do when idle. */

export type Face = "front" | "back" | "left" | "right";
export type Pose = "point" | "wave" | "sit" | "coffee";

export type Anim = {
  face: Face;
  v: number;                 // ground speed
  side: number;              // sideways speed as the camera sees it, for the lean
  phase: number;             // walking phase
  floor: number;             // ground height under me
  flying: boolean;           // on the paper plane
  heading: number;           // direction of travel, world angle
  bank: number;              // the plane's roll
  landed: { t: number; x: number; z: number } | null;
  present: { until: number; mirror: boolean } | null;
  idle: number;              // seconds standing still
  prints: { x: number; z: number; a: number; t: number; s: number }[];
  route: [number, number][] | null;
  dest: [number, number] | null;
};

export const newAnim = (): Anim => ({
  face: "front", v: 0, side: 0, phase: 0, floor: 0, flying: false, heading: 0, bank: 0,
  landed: null, present: null, idle: 0, prints: [], route: null, dest: null,
});

const INK = "#1b2437";
const W = 2.6;               // the walker's drawn width; the art is twice as tall
const FACES: Face[] = ["front", "back", "left", "right"];
/* pose drawings that exist in public/world; add a name here when its file lands */
const POSES: Pose[] = [];

/** Pose art is optional: until a file exists the walker acts it out with
 *  the four turnaround drawings instead. */
function usePoseArt() {
  const [art, setArt] = useState<Partial<Record<Pose, THREE.Texture>>>({});
  useEffect(() => {
    let live = true;
    const loader = new THREE.TextureLoader();
    POSES.forEach((p) =>
      loader.load(`${BASE}/walker-${p}.webp`, (t) => {
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        if (live) setArt((a) => ({ ...a, [p]: t }));
      }, undefined, () => {}));
    return () => { live = false; };
  }, []);
  return art;
}

/** What to show when idle: glance about, wave, sip a coffee, and after a
 *  while sit down with the laptop. Returns a pose, a face, or nothing. */
function idleAct(idle: number, art: Partial<Record<Pose, THREE.Texture>>): { pose?: Pose; face?: Face; wiggle?: boolean } {
  if (idle < 6) return {};
  if (idle > 20 && art.sit) return { pose: "sit" };
  const c = (idle - 6) % 11;
  if (c < 0.9) return { face: "left" };
  if (c < 1.8) return { face: "right" };
  if (c > 4 && c < 5.5) return art.wave ? { pose: "wave" } : { wiggle: true };
  if (c > 7.5 && c < 10 && art.coffee) return { pose: "coffee" };
  return {};
}

export function Avatar({ me, anim, motion, onPick }: {
  me: React.MutableRefObject<THREE.Vector3>; anim: React.MutableRefObject<Anim>;
  motion: "full" | "static"; onPick: (p: Pick) => void;
}) {
  const faceTex = useTexture(FACES.map((f) => `${BASE}/walker-${f}.webp`));
  useMemo(() => faceTex.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }), [faceTex]);
  const poses = usePoseArt();
  const posesRef = useRef(poses);
  posesRef.current = poses;

  const root = useRef<THREE.Group>(null);
  const sprite = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.SpriteMaterial>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const plane = useRef<THREE.Group>(null);
  const puff = useRef<THREE.Mesh>(null);
  const shown = useRef<THREE.Texture | null>(null);
  const flipAt = useRef(0);

  const planeShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 1); s.lineTo(0.62, -0.6); s.lineTo(0, -0.28); s.lineTo(-0.62, -0.6); s.lineTo(0, 1);
    return new THREE.ShapeGeometry(s);
  }, []);

  useFrame(() => {
    const a = anim.current, p = me.current, now = performance.now() / 1000;
    const still = motion === "static";
    if (!root.current || !sprite.current || !mat.current) return;
    root.current.position.set(p.x, 0, p.z);

    // which drawing: a pose if one is playing and drawn, else the way I face
    const art = posesRef.current;
    let pose: Pose | undefined, face = a.face, mirror = false, wiggle = false;
    if (a.flying) pose = art.sit ? "sit" : undefined, face = art.sit ? face : "front";
    else if (a.present && now < a.present.until) {
      if (art.point) { pose = "point"; mirror = a.present.mirror; }
      else face = a.present.mirror ? "left" : "right";
    } else if (!still && a.v < 0.4) {
      const act = idleAct(a.idle, art);
      if (act.pose) pose = act.pose;
      if (act.face) face = act.face;
      wiggle = !!act.wiggle;
    }
    const tex = pose && art[pose] ? art[pose]! : faceTex[FACES.indexOf(face)];
    if (tex !== shown.current) {
      // a paper turn: the cut-out folds edge-on and opens again as the new drawing
      if (shown.current && !still) flipAt.current = now;
      shown.current = tex; mat.current.map = tex; mat.current.needsUpdate = true;
    }

    // the walk: a hop per step, a squash as the foot lands, a lean into turns
    const walking = a.v > 0.4 && !a.flying;
    const k = Math.min(1, a.v / 10);
    const step = walking && !still ? Math.abs(Math.sin(a.phase)) : 0;
    const flip = still ? 1 : Math.min(1, (now - flipAt.current) / 0.16);
    const breathe = !walking && !a.flying && !still ? Math.sin(now * 2.3) * 0.012 : 0;
    const sx = (1 + (1 - step) * 0.035 * k) * (0.15 + 0.85 * flip) * (mirror ? -1 : 1);
    const sy = 1 - (1 - step) * 0.05 * k + breathe;
    const ratio = (tex.image as any)?.height / (tex.image as any)?.width || 2;
    const seated = pose === "sit" ? 0.92 : 1;
    sprite.current.scale.set(W * sx * seated, W * ratio * sy * seated, 1);
    sprite.current.position.y = p.y + (a.flying ? 0.1 : step * 0.32 * k);
    mat.current.rotation = still ? 0
      : -THREE.MathUtils.clamp(a.side * 0.012, -0.16, 0.16)
        + (walking ? Math.sin(a.phase) * 0.035 * k : 0)
        + (wiggle ? Math.sin(now * 11) * 0.09 : 0)
        + (a.flying ? -a.bank * 0.4 : 0);

    // riding the plane: me on top, the plane under my feet, nose to the travel
    if (plane.current) {
      plane.current.visible = a.flying;
      if (a.flying) {
        // the shape's nose points along -z once laid flat, hence the half turn
        plane.current.position.set(0, p.y - 0.05, 0);
        plane.current.rotation.set(0, a.heading + Math.PI, 0);
        plane.current.children[0].rotation.set(-Math.PI / 2, a.bank, 0);
      }
    }
    if (shadow.current) {
      // the shadow stays on the ground and shrinks the higher I go
      const h = Math.max(0, p.y - a.floor);
      shadow.current.scale.setScalar(1 / (1 + h * 0.08));
      shadow.current.position.y = a.floor + 0.05;
    }
    if (puff.current) {
      const age = a.landed ? now - a.landed.t : 9;
      puff.current.visible = age < 0.6 && !still;
      if (puff.current.visible && a.landed) {
        puff.current.position.set(a.landed.x - p.x, a.floor + 0.08, a.landed.z - p.z);
        puff.current.scale.setScalar(1 + age * 5);
        (puff.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - age / 0.6);
      }
    }
  });

  return (
    <group ref={root}>
      <sprite
        ref={sprite} center={[0.5, 0]}
        onClick={(e) => { e.stopPropagation(); if (tap(e)) onPick({ kind: "about" }); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <spriteMaterial ref={mat} map={faceTex[0]} alphaTest={0.5} toneMapped={false} />
      </sprite>
      <mesh ref={shadow} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 20]} />
        <meshBasicMaterial color={INK} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <group ref={plane} visible={false} scale={2.6}>
        <group>
          <mesh geometry={planeShape}><meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
          <lineSegments><edgesGeometry args={[planeShape]} /><lineBasicMaterial color={INK} /></lineSegments>
        </group>
      </group>
      <mesh ref={puff} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.05, 28]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------- footprints: a short trail that fades within a few seconds ---------- */

const PRINTS = 40, LIFE = 3.2;

export function Footprints({ anim }: { anim: React.MutableRefObject<Anim> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => { const g = new THREE.CircleGeometry(0.5, 10); g.scale(0.42, 1, 1); g.rotateX(-Math.PI / 2); return g; }, []);
  const m = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const now = performance.now() / 1000;
    const list = anim.current.prints;
    while (list.length && now - list[0].t > LIFE) list.shift();
    while (list.length > PRINTS) list.shift();
    list.forEach((f, i) => {
      const life = 1 - (now - f.t) / LIFE;
      m.position.set(f.x + Math.cos(f.a) * 0.32 * f.s, 0.045, f.z - Math.sin(f.a) * 0.32 * f.s);
      m.rotation.set(0, f.a, 0);
      m.scale.setScalar(Math.max(0.01, life));
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, PRINTS]} frustumCulled={false}>
      <meshBasicMaterial color={INK} transparent opacity={0.16} depthWrite={false} />
    </instancedMesh>
  );
}

/* ---------- the way ahead: dots along the road, and a ring where I'll stop ---------- */

const DOTS = 90, GAP = 1.7;

export function RouteMarks({ me, anim }: { me: React.MutableRefObject<THREE.Vector3>; anim: React.MutableRefObject<Anim> }) {
  const dots = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const m = useMemo(() => { const o = new THREE.Object3D(); o.rotation.x = -Math.PI / 2; return o; }, []);
  useFrame(() => {
    const a = anim.current, p = me.current, mesh = dots.current;
    if (!mesh) return;
    let n = 0;
    const r = a.route;
    if (r && r.length > 1 && !a.flying) {
      // dots from where I stand, along what is left of the route
      let px = p.x, pz = p.z, carry = GAP * 0.6;
      for (let i = 0; i < r.length && n < DOTS; i++) {
        const [qx, qz] = r[i];
        const d = Math.hypot(qx - px, qz - pz);
        let t = carry;
        while (t < d && n < DOTS) {
          m.position.set(px + ((qx - px) * t) / d, 0.05, pz + ((qz - pz) * t) / d);
          m.updateMatrix(); mesh.setMatrixAt(n++, m.matrix);
          t += GAP;
        }
        carry = t - d; px = qx; pz = qz;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (ring.current) {
      ring.current.visible = !!a.dest;
      if (a.dest) {
        const s = 1 + Math.sin(performance.now() / 180) * 0.12;
        ring.current.position.set(a.dest[0], 0.06, a.dest[1]);
        ring.current.scale.setScalar(s);
      }
    }
  });
  return (
    <>
      <instancedMesh ref={dots} args={[undefined, undefined, DOTS]} frustumCulled={false}>
        <circleGeometry args={[0.2, 10]} />
        <meshBasicMaterial color="#e0557f" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </instancedMesh>
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.25, 32]} />
        <meshBasicMaterial color="#e0557f" transparent opacity={0.75} depthWrite={false} />
      </mesh>
    </>
  );
}
