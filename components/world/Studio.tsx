"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Cutout from "./Cutout";

const PAL: Record<string, string> = {
  doc: "#5a62e8", conv: "#12a98a", search: "#e0557f", saas: "#d8871a",
  crawl: "#2b92d8", auto: "#9a56c7", plat: "#6b953a",
  ink: "#1b2437", paper: "#fbfcff",
};
const SOFT: Record<string, string> = {
  doc: "#dcdefb", conv: "#cdf0e6", search: "#fbd9e3", saas: "#fbe6c6",
  crawl: "#d2e9fa", auto: "#ecd9f7", plat: "#dfecc9",
  ink: "#4e5a74", paper: "#ffffff",
};

export type Thing = {
  id: string; label: string; group: string; tex?: string;
  pos: [number, number, number]; size: [number, number, number];
  shape: string; color: string; fact: string | null;
};

/* ---------------- cut-paper primitives ---------------- */

/** Everything in the room is a primitive with a navy edge, which is what
 *  makes it read as cut paper rather than as untextured 3D. */
function Paper({ geo, color, position, rotation }: any) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo}>
        <meshBasicMaterial color={SOFT[color] ?? "#fff"} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color="#1b2437" />
      </lineSegments>
    </group>
  );
}

function shapeGeometry(t: Thing): THREE.BufferGeometry {
  const [w, h, d] = t.size;
  switch (t.shape) {
    case "cyl": return new THREE.CylinderGeometry(w, w, h, 10);
    case "plane": return new THREE.BoxGeometry(w, h, d);
    case "torus": return new THREE.TorusGeometry(w, 0.07, 6, 16);
    default: return new THREE.BoxGeometry(w, h, d);
  }
}

function Thing3D({
  t, active, onPick,
}: { t: Thing; active: boolean; onPick: (t: Thing) => void }) {
  const g = useRef<THREE.Group>(null);
  const geo = useMemo(() => shapeGeometry(t), [t]);
  const [hover, setHover] = useState(false);

  useFrame((s) => {
    if (!g.current) return;
    const lift = active ? 0.55 : hover ? 0.12 : 0;
    g.current.position.y = THREE.MathUtils.lerp(g.current.position.y, t.pos[1] + lift, 0.14);
    g.current.rotation.y = active
      ? s.clock.elapsedTime * 0.5
      : THREE.MathUtils.lerp(g.current.rotation.y, 0, 0.14);
  });

  const stack = t.shape === "books" || t.shape === "heap";
  return (
    <group
      ref={g}
      position={t.pos}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); onPick(t); }}
    >
      {t.tex ? (
        // a drawn object stands on its own footprint, facing into the room
        <Cutout src={t.tex} width={Math.max(t.size[0], 0.9) * 1.5} position={[0, -t.size[1] / 2, 0]} anchor="bottom" billboard />
      ) : stack ? (
        // a stack or heap is several slabs, which reads better than one box
        [0, 1, 2, 3].map((i) => (
          <Paper
            key={i}
            geo={new THREE.BoxGeometry(t.size[0] - i * 0.12, t.size[1] / 4.4, t.size[2])}
            color={t.color}
            position={[i % 2 ? 0.05 : -0.05, i * (t.size[1] / 4) - t.size[1] / 2, 0]}
            rotation={[0, (i % 2 ? 1 : -1) * 0.06, 0]}
          />
        ))
      ) : t.shape === "plant" ? (
        <>
          <Paper geo={new THREE.CylinderGeometry(0.17, 0.13, 0.3, 8)} color="saas" position={[0, -0.2, 0]} />
          {[0, 1, 2].map((i) => (
            <Paper
              key={i}
              geo={new THREE.CircleGeometry(0.2, 7)}
              color="plat"
              position={[Math.sin(i * 2.1) * 0.12, 0.1 + i * 0.13, Math.cos(i * 2.1) * 0.1]}
              rotation={[0, i * 1.4, 0.3]}
            />
          ))}
        </>
      ) : t.shape === "bike" ? (
        <>
          <Paper geo={new THREE.TorusGeometry(0.55, 0.06, 6, 18)} color={t.color} position={[-0.7, -0.3, 0]} />
          <Paper geo={new THREE.TorusGeometry(0.55, 0.06, 6, 18)} color={t.color} position={[0.7, -0.3, 0]} />
          <Paper geo={new THREE.BoxGeometry(1.5, 0.08, 0.08)} color="ink" position={[0, 0.1, 0]} rotation={[0, 0, 0.12]} />
        </>
      ) : (
        <Paper geo={geo} color={t.color} position={[0, 0, 0]} />
      )}

      {(hover || active) && (
        <Html center distanceFactor={11} position={[0, t.size[1] / 2 + 0.55, 0]} zIndexRange={[20, 0]}>
          <div className={`studio-tag${t.fact ? "" : " is-blank"}`}>{t.label}</div>
        </Html>
      )}
    </group>
  );
}

/* ---------------- the room ---------------- */

function Room() {
  const floor = useMemo(() => new THREE.BoxGeometry(14, 0.2, 10), []);
  const back = useMemo(() => new THREE.BoxGeometry(14, 8, 0.2), []);
  const side = useMemo(() => new THREE.BoxGeometry(0.2, 8, 10), []);
  const win = useMemo(() => new THREE.BoxGeometry(0.06, 2.6, 3.4), []);
  return (
    <>
      <Paper geo={floor} color="saas" position={[0, -0.1, 0]} />
      <Paper geo={back} color="paper" position={[0, 4, -5]} />
      <Paper geo={side} color="paper" position={[-7, 4, 0]} />
      {/* the window, cut into the left wall */}
      <Paper geo={win} color="crawl" position={[-7.12, 3.6, 0.6]} />
      {/* Bangalore beyond it: blocks of flats and rooftops, stepped back */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const h = 1.6 + ((i * 7) % 5) * 0.9;
        return (
          <Paper
            key={i}
            geo={new THREE.BoxGeometry(1.5 + (i % 3) * 0.4, h, 1.5)}
            color={["crawl", "auto", "doc", "plat"][i % 4]}
            position={[-11.5 - (i % 3) * 2.8, h / 2 - 0.4, -3.6 + i * 1.5]}
          />
        );
      })}
    </>
  );
}

/* ---------------- camera that composes a view of what you picked ---------------- */

const HOME = new THREE.Vector3(15, 12.5, 19);
const HOME_NARROW = new THREE.Vector3(22, 18, 28);

function Director({ target }: { target: Thing | null }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 2.2, 0));
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.4);
    if (target) {
      const p = new THREE.Vector3(...target.pos);
      // stand off along the line from the room centre, so the object is never
      // viewed through a wall
      const dir = p.clone().sub(new THREE.Vector3(0, 2, 0)).normalize();
      const reach = Math.max(2.6, Math.max(...target.size) * 2.4);
      const want = p.clone().add(dir.multiplyScalar(reach)).add(new THREE.Vector3(0, 1.6, 0));
      want.y = Math.max(want.y, 2.4);
      camera.position.lerp(want, k);
      look.current.lerp(p, k);
    } else {
      camera.position.lerp(window.innerWidth < 720 ? HOME_NARROW : HOME, k);
      look.current.lerp(new THREE.Vector3(0, 2.2, 0), k);
    }
    camera.lookAt(look.current);
  });
  return null;
}

/* ---------------- mounted studio ---------------- */

export default function Studio({ things }: { things: Thing[] }) {
  const [picked, setPicked] = useState<Thing | null>(null);
  const [dpr, setDpr] = useState(1.25);
  const [help, setHelp] = useState("Click anything in the room");
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) setHelp("Tap anything in the room");
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  return (
    <div className="world">
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: HOME.toArray() as [number, number, number], fov: 34 }}
        onPointerMissed={() => setPicked(null)}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <AdaptiveDpr pixelated />
        <color attach="background" args={["#f4f7fd"]} />
        {/* the drawn objects suspend while their art loads; the room should
            not vanish, and neither should the page chrome around it */}
        <Room />
        <Suspense fallback={null}>
          {things.map((t) => (
            <Thing3D key={t.id} t={t} active={picked?.id === t.id} onPick={setPicked} />
          ))}
        </Suspense>
        <Director target={picked} />
      </Canvas>

      <a className="world-leave" href="/portfolio/about/">Read it as a page</a>
      <div className="world-help">{help}</div>

      {picked && (
        <div className="world-card" data-domain="document-ai">
          <div className="world-card-kind">{picked.label}</div>
          {picked.fact ? (
            picked.fact.split("\n").map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p className="studio-blank">
              Nothing written about this one yet.
            </p>
          )}
          <button className="world-enter" onClick={() => setPicked(null)}>
            Put it back
          </button>
        </div>
      )}
    </div>
  );
}
