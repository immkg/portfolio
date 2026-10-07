"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
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
/* The puppet: the turnaround drawings cut into body, arms and legs by
   relaunch/scripts/cut_puppet.py, every layer on the same 384x768 frame and
   hinged where a paper split-pin would be. The side view is drawn facing
   left; facing right is the same puppet turned over. */
const FRAME = [384, 768];
const PX = W / FRAME[0];                         // frame pixels to world units
const PIVOT = {
  front: { arm_l: [100, 300], arm_r: [284, 300], leg_l: [150, 492], leg_r: [234, 492] },
  side: { arm: [220, 288], leg: [200, 466] },
} as const;
const HAND = [195, 505] as const;                         // the side arm's hand, for props
const LAYERS = ["front-body", "front-arm_l", "front-arm_r", "front-leg_l", "front-leg_r",
  "back-body", "back-arm_l", "back-arm_r", "back-leg_l", "back-leg_r",
  "side-body", "side-arm", "side-leg"];

type View = "front" | "back" | "side";
type Act = { pose?: Pose; face?: Face };

/** Idle, I glance about, wave, sip a coffee, and after a while sit down with
 *  the laptop. */
function idleAct(idle: number): Act {
  if (idle < 6) return {};
  if (idle > 22) return { pose: "sit" };
  const c = (idle - 6) % 12;
  if (c < 0.9) return { face: "left" };
  if (c < 1.8) return { face: "right" };
  if (c > 3.5 && c < 5.3) return { pose: "wave" };
  if (c > 7.5 && c < 10.5) return { pose: "coffee" };
  return {};
}

/* a frame-pixel point to the puppet's own units: x across, y up from the feet */
const at = (x: number, y: number) => [(x - FRAME[0] / 2) * PX, (FRAME[1] - y) * PX] as const;

/** One drawn layer, hung from its hinge so turning the group swings it. */
function Part({ tex, pivot, z, tint, partRef }: {
  tex: THREE.Texture; pivot: readonly [number, number]; z: number; tint?: string;
  partRef?: React.Ref<THREE.Group>;
}) {
  const [px, py] = at(...pivot);
  const [cx, cy] = at(FRAME[0] / 2, FRAME[1] / 2);
  return (
    <group ref={partRef} position={[px, py, z]}>
      <mesh position={[cx - px, cy - py, 0]}>
        <planeGeometry args={[W, W * 2]} />
        <meshBasicMaterial map={tex} alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} color={tint ?? "#ffffff"} />
      </mesh>
    </group>
  );
}

export function Avatar({ me, anim, motion, onPick }: {
  me: React.MutableRefObject<THREE.Vector3>; anim: React.MutableRefObject<Anim>;
  motion: "full" | "static"; onPick: (p: Pick) => void;
}) {
  const texs = useTexture([...LAYERS.map((n) => `${BASE}/puppet/${n}.webp`), `${BASE}/laptop.webp`, `${BASE}/mug.webp`]);
  useMemo(() => texs.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }), [texs]);
  const T = Object.fromEntries(LAYERS.map((n, i) => [n, texs[i]])) as Record<string, THREE.Texture>;
  const laptop = texs[LAYERS.length], mug = texs[LAYERS.length + 1];

  const root = useRef<THREE.Group>(null);       // at my feet, turned to the camera
  const rig = useRef<THREE.Group>(null);        // lean, squash, flip, sit
  const views = { front: useRef<THREE.Group>(null), back: useRef<THREE.Group>(null), side: useRef<THREE.Group>(null) };
  const limbs = {
    front: { al: useRef<THREE.Group>(null), ar: useRef<THREE.Group>(null), ll: useRef<THREE.Group>(null), lr: useRef<THREE.Group>(null) },
    back: { al: useRef<THREE.Group>(null), ar: useRef<THREE.Group>(null), ll: useRef<THREE.Group>(null), lr: useRef<THREE.Group>(null) },
    side: { arm: useRef<THREE.Group>(null), near: useRef<THREE.Group>(null), far: useRef<THREE.Group>(null) },
  };
  const lap = useRef<THREE.Mesh>(null);
  const cup = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const plane = useRef<THREE.Group>(null);
  const puff = useRef<THREE.Mesh>(null);
  const shownView = useRef<string>("front");
  const flipAt = useRef(0);
  const { camera } = useThree();

  const planeShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 1); s.lineTo(0.62, -0.6); s.lineTo(0, -0.28); s.lineTo(-0.62, -0.6); s.lineTo(0, 1);
    return new THREE.ShapeGeometry(s);
  }, []);

  useFrame(() => {
    const a = anim.current, p = me.current, now = performance.now() / 1000;
    const still = motion === "static";
    if (!root.current || !rig.current) return;
    root.current.position.set(p.x, p.y, p.z);
    // stand upright and turn to face the camera round the vertical only
    root.current.rotation.set(0, Math.atan2(camera.position.x - p.x, camera.position.z - p.z), 0);

    // what I'm doing: riding, presenting, idling, or walking the way I face
    let pose: Pose | undefined, face = a.face, mirror = false;
    if (a.flying) pose = "sit";
    else if (a.present && now < a.present.until) { pose = "point"; mirror = a.present.mirror; }
    else if (!still && a.v < 0.4) { const act = idleAct(a.idle); pose = act.pose; face = act.face ?? face; }
    if (pose === "point") face = mirror ? "left" : "right";
    if (pose === "sit" || pose === "coffee") face = face === "right" ? "right" : "left";
    if (pose === "wave") face = "front";
    const view: View = face === "front" ? "front" : face === "back" ? "back" : "side";
    const flipX = face === "right" ? -1 : 1;     // the side art faces left

    const key = view + flipX;
    if (key !== shownView.current) { if (!still) flipAt.current = now; shownView.current = key; }
    (["front", "back", "side"] as View[]).forEach((v) => { const g = views[v].current; if (g) g.visible = v === view; });

    // the walk: legs and arms swing from their pins, a bob per step, a squash
    const walking = a.v > 0.4 && !a.flying && !still;
    const k = Math.min(1, a.v / 9);
    const sw = walking ? Math.sin(a.phase) : 0;
    const step = walking ? Math.abs(Math.sin(a.phase)) : 0;
    const flip = still ? 1 : Math.min(1, (now - flipAt.current) / 0.16);
    const breathe = !walking && !a.flying && !still ? Math.sin(now * 2.3) * 0.012 : 0;
    const sit = pose === "sit";
    rig.current.scale.set(flipX * (0.15 + 0.85 * flip) * (1 + (1 - step) * 0.03 * k), 1 - (1 - step) * 0.04 * k + breathe, 1);
    // seated, the hips come down to the ground (or the plane)
    rig.current.position.y = sit ? -(FRAME[1] - PIVOT.side.leg[1]) * PX + 0.2 : step * 0.26 * k;
    rig.current.rotation.z = still ? 0
      : -THREE.MathUtils.clamp(a.side * 0.012, -0.14, 0.14) * flipX + (a.flying ? -a.bank * 0.4 : 0);

    const s = limbs.side, f = limbs[view === "back" ? "back" : "front"];
    if (view === "side") {
      // forward is to the art's left, which is a negative turn
      let arm = -sw * 0.45 * k, near = sw * 0.5 * k, far = -sw * 0.5 * k;
      if (sit) { near = far = -1.45; arm = -0.75 + Math.sin(now * 14) * 0.04; }      // typing
      if (pose === "point") arm = -1.45;
      if (pose === "coffee") arm = -1.0 + Math.sin(now * 1.6) * 0.08;
      s.arm.current?.rotation.set(0, 0, arm);
      s.near.current?.rotation.set(0, 0, near);
      s.far.current?.rotation.set(0, 0, far);
      // the props ride in the hand
      const [hx, hy] = at(...HAND), [ax, ay] = at(...PIVOT.side.arm);
      const c = Math.cos(arm), si = Math.sin(arm), dx = hx - ax, dy = hy - ay;
      const handX = ax + dx * c - dy * si, handY = ay + dx * si + dy * c;
      if (lap.current) { lap.current.visible = sit; lap.current.position.set(-1.05, at(0, PIVOT.side.leg[1])[1] + 0.32, 0.05); }
      if (cup.current) { cup.current.visible = pose === "coffee"; cup.current.position.set(handX - 0.05, handY + 0.12, 0.06); }
    } else {
      if (lap.current) lap.current.visible = false;
      if (cup.current) cup.current.visible = false;
      // seen from in front, a stride is a foot lifting and the arms swaying out
      const lift = (x: number) => Math.max(0, x) * 0.16 * k;
      f.ll.current?.position.setY(at(...PIVOT.front.leg_l)[1] + lift(sw));
      f.lr.current?.position.setY(at(...PIVOT.front.leg_r)[1] + lift(-sw));
      let al = -0.06 - sw * 0.07 * k, ar = 0.06 - sw * 0.07 * k;
      // his right hand is on the viewer's left from the front
      if (pose === "wave") al = -2.55 + Math.sin(now * 9) * 0.25;
      f.al.current?.rotation.set(0, 0, view === "back" ? -ar : al);
      f.ar.current?.rotation.set(0, 0, view === "back" ? -al : ar);
    }

    // riding the plane: me sitting on top, the plane under me, nose to the travel
    if (plane.current) {
      plane.current.visible = a.flying;
      if (a.flying) {
        // the shape's nose points along -z once laid flat, hence the half turn
        plane.current.position.set(p.x, p.y - 0.05, p.z);
        plane.current.rotation.set(0, a.heading + Math.PI, 0);
        plane.current.children[0].rotation.set(-Math.PI / 2, a.bank, 0);
      }
    }
    if (shadow.current) {
      // the shadow stays on the ground and shrinks the higher I go
      shadow.current.position.set(p.x, a.floor + 0.05, p.z);
      shadow.current.scale.setScalar(1 / (1 + Math.max(0, p.y - a.floor) * 0.08));
    }
    if (puff.current) {
      const age = a.landed ? now - a.landed.t : 9;
      puff.current.visible = age < 0.6 && !still;
      if (puff.current.visible && a.landed) {
        puff.current.position.set(a.landed.x, a.floor + 0.08, a.landed.z);
        puff.current.scale.setScalar(1 + age * 5);
        (puff.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - age / 0.6);
      }
    }
  });

  const hover = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (tap(e)) onPick({ kind: "about" }); },
    onPointerOver: () => (document.body.style.cursor = "pointer"),
    onPointerOut: () => (document.body.style.cursor = ""),
  };
  const FAR = "#c9cbd6";        // the far leg, a shade back
  const body = (v: "front" | "back") => (
    <group ref={views[v]} visible={v === "front"}>
      <Part tex={T[`${v}-leg_l`]} pivot={PIVOT.front.leg_l} z={-0.02} partRef={limbs[v].ll} />
      <Part tex={T[`${v}-leg_r`]} pivot={PIVOT.front.leg_r} z={-0.02} partRef={limbs[v].lr} />
      <Part tex={T[`${v}-body`]} pivot={[192, 384]} z={0} />
      <Part tex={T[`${v}-arm_l`]} pivot={PIVOT.front.arm_l} z={0.02} partRef={limbs[v].al} />
      <Part tex={T[`${v}-arm_r`]} pivot={PIVOT.front.arm_r} z={0.02} partRef={limbs[v].ar} />
    </group>
  );

  return (
    <>
      <group ref={root}>
        <group ref={rig} {...hover}>
          {body("front")}
          {body("back")}
          <group ref={views.side} visible={false}>
            <Part tex={T["side-leg"]} pivot={PIVOT.side.leg} z={-0.03} tint={FAR} partRef={limbs.side.far} />
            <Part tex={T["side-leg"]} pivot={PIVOT.side.leg} z={-0.015} partRef={limbs.side.near} />
            <Part tex={T["side-body"]} pivot={[192, 384]} z={0} />
            <mesh ref={lap} visible={false}>
              <planeGeometry args={[1.5, 1.5]} />
              <meshBasicMaterial map={laptop} alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <Part tex={T["side-arm"]} pivot={PIVOT.side.arm} z={0.03} partRef={limbs.side.arm} />
            <mesh ref={cup} visible={false} position={[0, 0, 0.06]}>
              <planeGeometry args={[0.8, 0.8]} />
              <meshBasicMaterial map={mug} alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
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
    </>
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
