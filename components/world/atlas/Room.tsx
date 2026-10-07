"use client";

import { useTexture } from "@react-three/drei";
import { type ThreeEvent } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { BASE } from "../Cutout";
import { paint, tap } from "./Marks";
import { ICON, type Pick } from "./model";
import type { Exhibit, RoomDef } from "./Rooms";

/* Inside a room: an open-fronted box seen like a doll's house, its exhibits
   on the walls and floor, and a way back out at the front left. Drawn from
   simple shapes and the art the world already has; the room art sheets
   replace the walls and furniture when they land. */

const INK = "#1b2437";

/** Painted words on an upright plate, sized by height, never wider than `max`. */
function Words({ text, h, max, at, yaw = 0, ink = INK, bg, weight = 800 }: {
  text: string; h: number; max?: number; at: [number, number, number]; yaw?: number;
  ink?: string; bg?: string; weight?: number;
}) {
  const { tex, aspect } = useMemo(() => paint(text, { ink, bg, weight, size: 64 }), [text, ink, bg, weight]);
  let width = h * aspect, height = h;
  if (max && width > max) { height = (h * max) / width; width = max; }
  return (
    <mesh position={at} rotation={[0, yaw, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Art({ name, size, at, prop = false }: { name: string; size: number; at: [number, number, number]; prop?: boolean }) {
  const tex = useTexture(prop ? `${BASE}/${name}.webp` : ICON(name));
  useMemo(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }, [tex]);
  return (
    <mesh position={at}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} alphaTest={0.4} toneMapped={false} />
    </mesh>
  );
}

const hover = {
  onPointerOver: () => (document.body.style.cursor = "pointer"),
  onPointerOut: () => (document.body.style.cursor = ""),
};

function Frame({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover}
           onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onUse(e); }}>
      <mesh position={[0, 0, 0.06]}><boxGeometry args={[e.w + 0.4, e.h + 0.4, 0.12]} /><meshBasicMaterial color={e.pen} /></mesh>
      <mesh position={[0, 0, 0.13]}><planeGeometry args={[e.w, e.h]} /><meshBasicMaterial color="#ffffff" /></mesh>
      {e.art && <Suspense fallback={null}><Art name={e.art} size={e.w * 0.86} at={[0, 0, 0.15]} /></Suspense>}
      <mesh position={[0, -e.h / 2 - 0.75, 0.1]}><planeGeometry args={[e.w + 0.9, 1.05]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <Words text={e.title} h={0.42} max={e.w + 0.7} at={[0, -e.h / 2 - 0.58, 0.12]} />
      {e.sub && <Words text={e.sub} h={0.3} max={e.w + 0.7} at={[0, -e.h / 2 - 1.02, 0.12]} ink="#4e5a74" weight={600} />}
    </group>
  );
}

function Board({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  const items = e.items ?? [];
  const cols = Math.ceil(Math.sqrt(items.length * (e.w / e.h))), rows = Math.ceil(items.length / cols);
  const cw = (e.w - 0.8) / cols, ch = (e.h - 1.6) / Math.max(rows, 1);
  const s = Math.min(cw, ch) * 0.8;
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]}>
      <mesh position={[0, 0, 0.05]} {...hover}
            onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onUse(e); }}>
        <boxGeometry args={[e.w, e.h, 0.1]} /><meshBasicMaterial color="#e9d9b8" />
      </mesh>
      <mesh position={[0, e.h / 2 - 0.55, 0.11]}><planeGeometry args={[e.w, 1.1]} /><meshBasicMaterial color={e.pen} /></mesh>
      <Words text={`${e.title} · ${e.sub ?? ""}`} h={0.6} max={e.w - 0.6} at={[0, e.h / 2 - 0.55, 0.12]} ink="#ffffff" />
      {items.map((it, k) => {
        const c = k % cols, r = Math.floor(k / cols);
        const x = -e.w / 2 + 0.4 + cw * (c + 0.5), y = e.h / 2 - 1.3 - ch * (r + 0.5);
        return (
          <group key={it.title} position={[x, y, 0.12]} {...hover}
                 onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onUse(e, it.pick); }}>
            <mesh><circleGeometry args={[s * 0.56, 20]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <Suspense fallback={null}><Art name={it.art} size={s * 0.82} at={[0, 0, 0.01]} /></Suspense>
          </group>
        );
      })}
    </group>
  );
}

function Bench({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover}
           onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onUse(e); }}>
      <mesh position={[0, 1.1, 0]}><boxGeometry args={[e.w, 0.25, 2.2]} /><meshBasicMaterial color="#d9c29a" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (e.w / 2 - 0.3), 0.5, 0]}><boxGeometry args={[0.25, 1, 1.9]} /><meshBasicMaterial color="#b89c6e" /></mesh>)}
      {e.art && <Suspense fallback={null}><Art name={e.art} size={2.4} at={[0, 2.35, 0]} prop /></Suspense>}
      <mesh position={[0, 4.4, -0.2]}><planeGeometry args={[e.w + 0.4, 1.3]} /><meshBasicMaterial color={e.pen} /></mesh>
      <Words text={e.title} h={0.62} max={e.w} at={[0, 4.55, -0.18]} ink="#ffffff" />
      {e.sub && <Words text={e.sub} h={0.3} max={e.w} at={[0, 4.05, -0.18]} ink="#ffffff" weight={600} />}
    </group>
  );
}

function Arch({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover}
           onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onUse(e); }}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * e.w / 2, e.h / 2, 0]}><boxGeometry args={[0.7, e.h, 0.7]} /><meshBasicMaterial color={e.pen} /></mesh>)}
      <mesh position={[0, e.h + 0.5, 0]}><boxGeometry args={[e.w + 1.6, 1.6, 0.8]} /><meshBasicMaterial color={e.pen} /></mesh>
      <Words text={e.title} h={0.62} max={e.w + 1.2} at={[0, e.h + 0.72, 0.42]} ink="#ffffff" />
      {e.sub && <Words text={e.sub} h={0.34} max={e.w + 1.2} at={[0, e.h + 0.12, 0.42]} ink="#ffffff" weight={600} />}
    </group>
  );
}

function Year({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} {...hover}
           onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onUse(e); }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[e.w, e.h]} /><meshBasicMaterial color={INK} /></mesh>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <Words text={e.title} h={0.8} at={[0, 0.25, 0.01]} ink="#ffffff" />
        {e.sub && <Words text={e.sub} h={0.3} max={e.w - 0.3} at={[0, -0.45, 0.01]} ink="#c9d2e6" weight={600} />}
      </group>
    </group>
  );
}

function Kiosk({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover}
           onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onUse(e); }}>
      <mesh position={[0, 0.8, 0]}><boxGeometry args={[e.w, 1.6, 1.6]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.8, 0.81]}><planeGeometry args={[e.w, 1.6]} /><meshBasicMaterial color={e.pen} /></mesh>
      <Words text={e.sub ?? ""} h={0.34} max={e.w - 0.4} at={[0, 0.8, 0.82]} ink="#ffffff" weight={600} />
      <mesh position={[0, 3.6, -0.6]}><planeGeometry args={[e.w + 0.4, 1.4]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <Words text={e.title} h={0.62} max={e.w} at={[0, 3.6, -0.58]} ink={e.pen} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * (e.w / 2), 2.4, -0.6]}><boxGeometry args={[0.16, 2.6, 0.16]} /><meshBasicMaterial color={INK} /></mesh>)}
    </group>
  );
}

/** The way out: a doorway at the front left, with a mat that takes you back. */
function Exit({ r, onExit }: { r: RoomDef; onExit: () => void }) {
  const [x, z] = r.exit;
  return (
    <group position={[x, 0, z]} {...hover}
           onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onExit(); }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><planeGeometry args={[3.6, 2.2]} /><meshBasicMaterial color={INK} /></mesh>
      <group rotation={[-Math.PI / 2, 0, 0]}><Words text="↩ BACK TO THE WORLD" h={0.42} max={3.3} at={[0, 0, 0.06]} ink="#ffffff" /></group>
    </group>
  );
}

export function RoomScene({ r, onUse, onExit, onFloor }: {
  r: RoomDef; onUse: (e: Exhibit, p?: Pick) => void; onExit: () => void; onFloor: (x: number, z: number) => void;
}) {
  const { W, D, H } = r;
  return (
    <group>
      {/* the floor, a click on it walks there */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}
            onClick={(ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) onFloor(ev.point.x, ev.point.z); }}>
        <planeGeometry args={[W, D]} /><meshBasicMaterial color={r.tint} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}><planeGeometry args={[W + 60, D + 60]} /><meshBasicMaterial color="#e3e8f2" /></mesh>
      {/* the front lip, so the floor reads as a cut-away slab */}
      <mesh position={[0, -0.15, D / 2 + 0.05]}><boxGeometry args={[W, 0.3, 0.1]} /><meshBasicMaterial color={r.pen} /></mesh>
      {/* the walls: back and two sides, open at the front */}
      <mesh position={[0, H / 2, -D / 2]}><planeGeometry args={[W, H]} /><meshBasicMaterial color={r.wall} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * W / 2, H / 2, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[D, H]} /><meshBasicMaterial color={r.wall} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* skirting and a picture rail in the room's colour */}
      <mesh position={[0, 0.25, -D / 2 + 0.02]}><planeGeometry args={[W, 0.5]} /><meshBasicMaterial color={r.pen} /></mesh>
      <mesh position={[0, H - 0.2, -D / 2 + 0.02]}><planeGeometry args={[W, 0.4]} /><meshBasicMaterial color={r.pen} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 - 0.02), 0, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
          <mesh position={[0, 0.25, 0]}><planeGeometry args={[D, 0.5]} /><meshBasicMaterial color={r.pen} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, H - 0.2, 0]}><planeGeometry args={[D, 0.4]} /><meshBasicMaterial color={r.pen} side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
      {/* the room's name across the top of the back wall */}
      <Words text={r.title} h={1.3} max={W * 0.6} at={[0, H - 1.25, -D / 2 + 0.05]} ink={r.pen} />
      <Words text={r.kicker} h={0.5} max={W * 0.6} at={[0, H - 2.25, -D / 2 + 0.05]} ink="#4e5a74" weight={600} />

      {r.exhibits.map((e) => {
        const C = { frame: Frame, board: Board, bench: Bench, arch: Arch, year: Year, kiosk: Kiosk }[e.kind];
        return <C key={e.id} e={e} onUse={onUse} />;
      })}
      <Exit r={r} onExit={onExit} />
    </group>
  );
}
