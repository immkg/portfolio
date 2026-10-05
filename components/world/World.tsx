"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import Cutout from "./Cutout";
import * as THREE from "three";

const PEN: Record<string, string> = {
  "document-ai": "#5a62e8",
  "conversational-ai": "#12a98a",
  "search-commerce": "#e0557f",
  "product-saas": "#d8871a",
  "data-crawling": "#2b92d8",
  "automation": "#9a56c7",
  "platform-internal": "#6b953a",
};
const FILL: Record<string, string> = {
  "document-ai": "#dcdefb",
  "conversational-ai": "#cdf0e6",
  "search-commerce": "#fbd9e3",
  "product-saas": "#fbe6c6",
  "data-crawling": "#d2e9fa",
  "automation": "#ecd9f7",
  "platform-internal": "#dfecc9",
};

export const FACADE: Record<string, string> = {
  "regulatory-medical-writing": "facade-document",
  "hybrid-chat": "facade-conversation",
  "omnichannel-inbox": "facade-inbox",
  talkingdb: "facade-questions",
  "kray-search-platform": "facade-search",
  "more-work": "facade-more-work",
  "internal-platform": "facade-platform",
};
/** Five facades are drawn tall, two wide. The emblem and the sign have to sit
 *  above whichever it is, so the height is declared rather than guessed. */
export const FACADE_TOP: Record<string, number> = {
  "regulatory-medical-writing": 19.5, "hybrid-chat": 19.5, "omnichannel-inbox": 19.5,
  talkingdb: 19.5, "kray-search-platform": 19.5,
  "more-work": 6.2, "internal-platform": 6.2,
};
export const EMBLEM: Record<string, string> = {
  "document-ai": "emblem-inspect",
  "conversational-ai": "emblem-listen",
  "search-commerce": "emblem-search",
  "product-saas": "emblem-walk",
  "data-crawling": "emblem-connect",
  automation: "emblem-simulate",
  "platform-internal": "emblem-build",
};

export type Landmark = {
  slug: string; label: string; line: string; domain: string;
  first: string; last: string; people: number; href: string | null;
  tags: string[]; count?: number;
};
export type Speck = { x: number; z: number; r: number; domain: string };

/* ---------------- ground ---------------- */

function Ground({ onMove }: { onMove: (p: THREE.Vector3) => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow={false}
      onPointerDown={(e) => {
        e.stopPropagation();
        onMove(e.point.clone());
      }}
    >
      <planeGeometry args={[220, 220]} />
      <meshBasicMaterial color="#fbfcff" />
    </mesh>
  );
}

function GridLines() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = -100; i <= 100; i += 5) {
      pts.push(-100, 0.02, i, 100, 0.02, i, i, 0.02, -100, i, 0.02, 100);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#dfe5f2" transparent opacity={0.9} />
    </lineSegments>
  );
}

/* ---------------- district pad ---------------- */

function Pad({ x, z, domain, r }: { x: number; z: number; domain: string; r: number }) {
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[r, 48]} />
      <meshBasicMaterial color={FILL[domain]} transparent opacity={0.75} />
    </mesh>
  );
}

/* ---------------- a landmark ---------------- */

function Building({ lm, pos, near }: { lm: Landmark; pos: [number, number]; near: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const top = FACADE_TOP[lm.slug] ?? 10;
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = near ? Math.sin(t * 2) * 0.12 + 0.12 : 0;
  });
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <group ref={ref}>
        {/* the facade itself, standing on the plinth */}
        <Cutout src={FACADE[lm.slug] ?? "facade-more-work"} width={9} position={[0, 1.1, 0]} anchor="bottom" />
        {/* the district's emblem above it */}
        <Cutout src={EMBLEM[lm.domain]} width={1.7} position={[0, top + 1.4, 0]} billboard />
        {/* plinth, in the district's own pen, so colour reads from far off */}
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[9.4, 1.1, 3]} />
          <meshBasicMaterial color={PEN[lm.domain]} />
        </mesh>
      </group>
      <Html position={[0, top + 4.2, 0]} center distanceFactor={16} zIndexRange={[20, 0]}>
        <div className={`world-sign${near ? " is-near" : ""}`} data-domain={lm.domain}>
          <b>{lm.label}</b>
          <span>
            {lm.first.slice(0, 4)}–{lm.last.slice(0, 4)}
            {lm.count ? ` · ${lm.count} projects` : ` · ${lm.people} people`}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ---------------- the 77 markers, one draw call ---------------- */

function Specks({ specks }: { specks: Speck[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Object3D();
    const c = new THREE.Color();
    specks.forEach((s, i) => {
      m.position.set(s.x, 0.34 + s.r * 0.22, s.z);
      m.scale.setScalar(0.22 + s.r * 0.26);
      m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix);
      ref.current!.setColorAt(i, c.set(PEN[s.domain]));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [specks]);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.07;
  });
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, specks.length]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.82} />
    </instancedMesh>
  );
}

/* ---------------- the visitor, and the camera that follows ---------------- */

function Visitor({
  target,
  onPos,
  motion,
}: {
  target: React.MutableRefObject<THREE.Vector3 | null>;
  onPos: (v: THREE.Vector3) => void;
  motion: "full" | "static";
}) {
  const body = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const pos = useRef(new THREE.Vector3(0, 0, 10));
  const vel = useRef(new THREE.Vector3());
  const faceRef = useRef("front");
  const [face, setFace] = useState("front");

  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase()))
        e.preventDefault();
    };
    const u = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  }, []);

  useFrame((_, dt) => {
    const k = keys.current;
    const step = new THREE.Vector3();
    if (k["w"] || k["arrowup"]) step.z -= 1;
    if (k["s"] || k["arrowdown"]) step.z += 1;
    if (k["a"] || k["arrowleft"]) step.x -= 1;
    if (k["d"] || k["arrowright"]) step.x += 1;

    if (step.lengthSq() > 0) {
      target.current = null;
      step.normalize().multiplyScalar(17);
    } else if (target.current) {
      const to = target.current.clone().setY(0).sub(pos.current);
      if (to.length() < 0.6) target.current = null;
      else step.copy(to.normalize().multiplyScalar(15));
    }

    if (motion === "static") vel.current.copy(step);
    else vel.current.lerp(step, Math.min(1, dt * 7));
    pos.current.addScaledVector(vel.current, dt);
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, -95, 95);
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, -95, 95);

    if (body.current) {
      body.current.position.copy(pos.current);
      const speed = vel.current.length();
      body.current.position.y =
        motion === "static" ? 0 : Math.abs(Math.sin(performance.now() / 110)) * speed * 0.016;
      if (speed > 0.4) {
        const a = Math.atan2(vel.current.x, vel.current.z);
        const next =
          a > 2.0 || a < -2.0 ? "back" : a > 0.6 ? "right" : a < -0.6 ? "left" : "front";
        if (next !== faceRef.current) {
          faceRef.current = next;
          setFace(next);
        }
      }
    }

    // a phone sees a much narrower slice, so stand further off
    const far = window.innerWidth < 720 ? 1.55 : 1;
    const want = new THREE.Vector3(
      pos.current.x + 30 * far, 38 * far, pos.current.z + 44 * far
    );
    if (motion === "static") camera.position.copy(want);
    else camera.position.lerp(want, Math.min(1, dt * 2.6));
    camera.lookAt(pos.current.x, 2.2, pos.current.z);

    onPos(pos.current);
  });

  return (
    <group ref={body}>
      {/* four drawn views, swapped by heading */}
      <Cutout src={`walker-${face}`} width={2.6} position={[0, 0, 0]} anchor="bottom" billboard />
      {/* the shadow is a disc, because paper dolls do not cast real ones */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 20]} />
        <meshBasicMaterial color="#1b2437" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

/* ---------------- scene ---------------- */

function Scene({
  landmarks,
  specks,
  onNear,
  motion,
}: {
  landmarks: Landmark[];
  specks: Speck[];
  onNear: (lm: Landmark | null) => void;
  motion: "full" | "static";
}) {
  const target = useRef<THREE.Vector3 | null>(null);
  const [nearSlug, setNearSlug] = useState<string | null>(null);

  const spots = useMemo<[number, number][]>(
    () =>
      landmarks.map((_, i) => {
        const a = (i / landmarks.length) * Math.PI * 2 - Math.PI / 2;
        return [Math.cos(a) * 46, Math.sin(a) * 46];
      }),
    [landmarks]
  );

  const check = (p: THREE.Vector3) => {
    let found: Landmark | null = null;
    spots.forEach((s, i) => {
      if (Math.hypot(p.x - s[0], p.z - s[1]) < 11) found = landmarks[i];
    });
    const slug = found ? (found as Landmark).slug : null;
    if (slug !== nearSlug) {
      setNearSlug(slug);
      onNear(found);
    }
  };

  return (
    <>
      <color attach="background" args={["#f4f7fd"]} />
      <fog attach="fog" args={["#f4f7fd", 150, 360]} />
      <Ground onMove={(p) => (target.current = p)} />
      <GridLines />
      {landmarks.map((lm, i) => (
        <Pad key={lm.slug} x={spots[i][0]} z={spots[i][1]} domain={lm.domain} r={11.5} />
      ))}
      <Specks specks={specks} />
      {landmarks.map((lm, i) => (
        <Building key={lm.slug} lm={lm} pos={spots[i]} near={nearSlug === lm.slug} />
      ))}
      <Visitor target={target} onPos={check} motion={motion} />
    </>
  );
}

/* ---------------- the mounted world ---------------- */

export default function World({
  landmarks,
  specks,
  motion = "full",
}: {
  landmarks: Landmark[];
  specks: Speck[];
  motion?: "full" | "static";
}) {
  const [near, setNear] = useState<Landmark | null>(null);
  const [dpr, setDpr] = useState(1.25);
  const [help, setHelp] = useState("Tap the ground to walk");
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setHelp(touch ? "Tap the ground to walk there" : "Click the ground to walk · arrow keys or W A S D");
  }, []);

  return (
    <div className="world">
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [30, 38, 86], fov: 34 }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <AdaptiveDpr pixelated />
        <Suspense fallback={null}>
          <Scene landmarks={landmarks} specks={specks} onNear={setNear} motion={motion} />
        </Suspense>
      </Canvas>

      <a className="world-leave" href="/portfolio/work/">Read it as pages</a>
      <div className="world-help">{help}</div>

      {near && (
        <div className="world-card" data-domain={near.domain}>
          <div className="world-card-kind">
            {near.first.slice(0, 4)}–{near.last.slice(0, 4)}
          </div>
          <h2>{near.label}</h2>
          <p>{near.line}</p>
          <ul className="stack">
            {near.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {near.href && (
            <a className="world-enter" href={near.href}>
              Read this one
            </a>
          )}
        </div>
      )}
    </div>
  );
}
