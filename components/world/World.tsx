"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect, Suspense } from "react";
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
  const h = 6 + (lm.count ? 2 : lm.people / 14);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = near ? Math.sin(t * 2) * 0.12 + 0.12 : 0;
  });
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <group ref={ref}>
        {/* façade slab — the ChatGPT texture will map onto this face */}
        <mesh position={[0, h / 2, 0]} castShadow={false}>
          <boxGeometry args={[5.2, h, 5.2]} />
          <meshBasicMaterial color={FILL[lm.domain]} />
        </mesh>
        <mesh position={[0, h / 2, 2.62]}>
          <planeGeometry args={[5.2, h]} />
          <meshBasicMaterial color={FILL[lm.domain]} />
        </mesh>
        {/* plinth, in the district's own pen, so colour reads from far off */}
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[6, 1.1, 6]} />
          <meshBasicMaterial color={PEN[lm.domain]} />
        </mesh>
        {/* roof pennant */}
        <mesh position={[1.6, h + 1.1, 0]}>
          <planeGeometry args={[1.8, 1.1]} />
          <meshBasicMaterial color={PEN[lm.domain]} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[1.6, h + 0.6, 0]}>
          <boxGeometry args={[0.08, 2.2, 0.08]} />
          <meshBasicMaterial color="#1b2437" />
        </mesh>
        {/* edge outline, the cut-paper look */}
        <lineSegments position={[0, h / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(5.2, h, 5.2)]} />
          <lineBasicMaterial color="#1b2437" />
        </lineSegments>
      </group>
      <Html position={[0, h + 2.4, 0]} center distanceFactor={13} zIndexRange={[20, 0]}>
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
}: {
  target: React.MutableRefObject<THREE.Vector3 | null>;
  onPos: (v: THREE.Vector3) => void;
}) {
  const body = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const pos = useRef(new THREE.Vector3(0, 0, 10));
  const vel = useRef(new THREE.Vector3());

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

    vel.current.lerp(step, Math.min(1, dt * 7));
    pos.current.addScaledVector(vel.current, dt);
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, -95, 95);
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, -95, 95);

    if (body.current) {
      body.current.position.copy(pos.current);
      const speed = vel.current.length();
      body.current.position.y = Math.abs(Math.sin(performance.now() / 110)) * speed * 0.016;
      if (speed > 0.4)
        body.current.rotation.y = Math.atan2(vel.current.x, vel.current.z);
    }

    const want = new THREE.Vector3(pos.current.x + 30, 38, pos.current.z + 44);
    camera.position.lerp(want, Math.min(1, dt * 2.6));
    camera.lookAt(pos.current.x, 2.2, pos.current.z);

    onPos(pos.current);
  });

  return (
    <group ref={body}>
      <mesh position={[0, 1.45, 0]}>
        <capsuleGeometry args={[0.68, 1.5, 4, 12]} />
        <meshBasicMaterial color="#5a62e8" />
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <sphereGeometry args={[0.66, 16, 12]} />
        <meshBasicMaterial color="#f6e3d4" />
      </mesh>
      <lineSegments position={[0, 1.1, 0]}>
        <edgesGeometry args={[new THREE.CapsuleGeometry(0.52, 1.1, 2, 8)]} />
        <lineBasicMaterial color="#1b2437" />
      </lineSegments>
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
}: {
  landmarks: Landmark[];
  specks: Speck[];
  onNear: (lm: Landmark | null) => void;
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
      <Visitor target={target} onPos={check} />
    </>
  );
}

/* ---------------- the mounted world ---------------- */

export default function World({
  landmarks,
  specks,
}: {
  landmarks: Landmark[];
  specks: Speck[];
}) {
  const [near, setNear] = useState<Landmark | null>(null);
  const [dpr, setDpr] = useState(1.25);

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
          <Scene landmarks={landmarks} specks={specks} onNear={setNear} />
        </Suspense>
      </Canvas>

      <a className="world-leave" href="/portfolio/work/">Read it as pages</a>
      <div className="world-help">
        Tap the ground to walk · arrow keys or W A S D
      </div>

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
