"use client";

import { useTexture } from "@react-three/drei";
import { type ThreeEvent } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { BASE } from "../Cutout";
import { paint, tap } from "./Marks";
import { ICON, type Pick } from "./model";
import type { Decor, Exhibit, RoomDef } from "./Rooms";

/* Inside a room: an open-fronted box seen like a doll's house, papered and
   floored with the room art, its exhibits on the walls and floor, a little
   furniture for company, and a way back out at the front left. */

const INK = "#1b2437";

/** A drawn piece: an icon by name, or "room/<name>" for the room art. */
const src = (name: string) => (name.includes("/") ? `${BASE}/${name}.webp` : ICON(name));

function useArt(name: string) {
  const tex = useTexture(src(name));
  useMemo(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }, [tex]);
  const img = tex.image as { width: number; height: number } | undefined;
  return { tex, aspect: img ? img.width / img.height : 1 };
}

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

/** A drawn piece standing upright, its feet at `at` (or centred, for wall pieces). */
function Piece({ name, w, at, centred = false, flat = false, yaw = 0 }: {
  name: string; w: number; at: [number, number, number]; centred?: boolean; flat?: boolean; yaw?: number;
}) {
  const { tex, aspect } = useArt(name);
  const h = w / aspect;
  return (
    <mesh position={[at[0], at[1] + (centred || flat ? 0 : h / 2), at[2]]} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, yaw, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

const lazy = (el: React.ReactNode) => <Suspense fallback={null}>{el}</Suspense>;

const hover = {
  onPointerOver: () => (document.body.style.cursor = "pointer"),
  onPointerOut: () => (document.body.style.cursor = ""),
};
const press = (fn: () => void) => (ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); if (tap(ev)) fn(); };

/** A plaque under a frame: the drawn placard with the name and years on it. */
function Plaque({ e, y }: { e: Exhibit; y: number }) {
  return (
    <group position={[0, y, 0.12]}>
      {lazy(<Piece name="room/fit-placard" w={e.w + 1.1} at={[0, 0, 0]} centred />)}
      <Words text={e.title} h={0.4} max={e.w + 0.4} at={[0, 0.12, 0.02]} />
      {e.sub && <Words text={e.sub} h={0.28} max={e.w + 0.4} at={[0, -0.3, 0.02]} ink="#4e5a74" weight={600} />}
    </group>
  );
}

/* the drawn frame's opening is the middle half across and from 32% to 79%
   down; it is stretched square here and the picture sized to fill it */
const OPEN = 2.35, FW = OPEN / 0.5, FH = OPEN / 0.45, LIFT = FH * 0.055;

function Frame({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover} onClick={press(() => onUse(e))}>
      <mesh position={[0, 0, 0.04]}><planeGeometry args={[OPEN * 1.04, OPEN * 1.04]} /><meshBasicMaterial color="#ffffff" /></mesh>
      {e.art && lazy(<mesh position={[0, 0, 0.06]}><ArtPlane name={e.art} size={OPEN * 0.92} /></mesh>)}
      {lazy(<mesh position={[0, LIFT, 0.09]}><FrameMat /><planeGeometry args={[FW, FH]} /></mesh>)}
      <Plaque e={e} y={-FH / 2 + LIFT - 0.55} />
    </group>
  );
}

function FrameMat() {
  const { tex } = useArt("room/fit-frame");
  return <meshBasicMaterial map={tex} alphaTest={0.5} toneMapped={false} />;
}

function ArtPlane({ name, size }: { name: string; size: number }) {
  const { tex } = useArt(name);
  return (
    <>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} alphaTest={0.4} toneMapped={false} />
    </>
  );
}

function Board({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  const items = e.items ?? [];
  const cols = Math.ceil(Math.sqrt(items.length * (e.w / e.h))), rows = Math.ceil(items.length / cols);
  const cw = (e.w - 1.2) / cols, ch = (e.h - 2) / Math.max(rows, 1);
  const s = Math.min(cw, ch) * 0.82;
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]}>
      <group {...hover} onClick={press(() => onUse(e))}>
        {lazy(<mesh position={[0, -0.2, 0.04]}>
          <planeGeometry args={[e.w, e.h]} />
          <PegboardMat />
        </mesh>)}
      </group>
      <mesh position={[0, e.h / 2 + 0.25, 0.08]}><planeGeometry args={[e.w * 0.8, 1.05]} /><meshBasicMaterial color={e.pen} /></mesh>
      <Words text={`${e.title} · ${e.sub ?? ""}`} h={0.56} max={e.w * 0.75} at={[0, e.h / 2 + 0.25, 0.09]} ink="#ffffff" />
      {items.map((it, k) => {
        const c = k % cols, r = Math.floor(k / cols);
        const x = -e.w / 2 + 0.6 + cw * (c + 0.5), y = e.h / 2 - 1.2 - ch * (r + 0.5);
        return (
          <group key={it.title} position={[x, y, 0.12]} {...hover} onClick={press(() => onUse(e, it.pick))}>
            <mesh><circleGeometry args={[s * 0.56, 20]} /><meshBasicMaterial color="#fffaf0" /></mesh>
            {lazy(<mesh position={[0, 0, 0.01]}><ArtPlane name={it.art} size={s * 0.82} /></mesh>)}
          </group>
        );
      })}
    </group>
  );
}

function PegboardMat() {
  const { tex } = useArt("room/shop-pegboard");
  return <meshBasicMaterial map={tex} toneMapped={false} />;
}

function Bench({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover} onClick={press(() => onUse(e))}>
      {lazy(<Piece name="room/lab-bench" w={e.w} at={[0, 0, 0]} />)}
      {e.art && lazy(<Piece name={e.art} w={2.6} at={[0, 2.1, 0.2]} />)}
      <mesh position={[0, 6.1, -0.2]}><planeGeometry args={[e.w + 0.4, 1.3]} /><meshBasicMaterial color={e.pen} /></mesh>
      <Words text={e.title} h={0.62} max={e.w} at={[0, 6.25, -0.18]} ink="#ffffff" />
      {e.sub && <Words text={e.sub} h={0.3} max={e.w} at={[0, 5.75, -0.18]} ink="#ffffff" weight={600} />}
    </group>
  );
}

function Arch({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  const W = e.w + 2.4;
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover} onClick={press(() => onUse(e))}>
      {e.art && lazy(<Piece name={e.art} w={W} at={[0, 0, 0]} />)}
      {/* the name rides on the arch's cream band, near its top */}
      <Words text={e.title} h={0.52} max={W * 0.55} at={[0, W * 0.86, 0.05]} />
      {e.sub && <Words text={e.sub} h={0.4} max={W * 1.1} at={[0, W / 0.94 + 0.55, 0.05]} ink="#4e5a74" weight={700} bg="#ffffff" />}
    </group>
  );
}

function Year({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} {...hover} onClick={press(() => onUse(e))}>
      {lazy(<Piece name="room/time-plaque" w={e.w + 0.6} at={[0, 0, 0]} flat />)}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <Words text={e.title} h={0.75} at={[0, 0.2, 0.01]} ink="#ffffff" />
        {e.sub && <Words text={e.sub} h={0.28} max={e.w - 0.4} at={[0, -0.42, 0.01]} ink="#c9d2e6" weight={600} />}
      </group>
    </group>
  );
}

function Kiosk({ e, onUse }: { e: Exhibit; onUse: (e: Exhibit, p?: Pick) => void }) {
  return (
    <group position={e.at} rotation={[0, e.yaw, 0]} {...hover} onClick={press(() => onUse(e))}>
      {e.art && lazy(<Piece name={e.art} w={e.art.endsWith("booth") ? 3 : 3.4} at={[0, 0, 0]} />)}
      <mesh position={[0, 6.2, -0.3]}><planeGeometry args={[e.w + 0.4, 1.5]} /><meshBasicMaterial color={e.pen} /></mesh>
      <Words text={e.title} h={0.56} max={e.w} at={[0, 6.4, -0.28]} ink="#ffffff" />
      {e.sub && <Words text={e.sub} h={0.3} max={e.w} at={[0, 5.85, -0.28]} ink="#ffffff" weight={600} />}
    </group>
  );
}

/** The way out: a mat at the front left that takes you back. */
function Exit({ r, onExit }: { r: RoomDef; onExit: () => void }) {
  const [x, z] = r.exit;
  return (
    <group position={[x, 0, z]} {...hover} onClick={press(onExit)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><planeGeometry args={[3.8, 2.2]} /><meshBasicMaterial color={INK} /></mesh>
      <group rotation={[-Math.PI / 2, 0, 0]}><Words text="↩ BACK TO THE WORLD" h={0.42} max={3.4} at={[0, 0, 0.06]} ink="#ffffff" /></group>
    </group>
  );
}

/** Wallpaper and floor: the drawn panels, repeated to fit each surface. */
function Shell({ r }: { r: RoomDef }) {
  const { W, D, H } = r;
  const wall = useTexture(`${BASE}/room/${r.wallArt}.webp`);
  const floor = useTexture(`${BASE}/room/floor.webp`);
  const tex = useMemo(() => {
    const set = (t: THREE.Texture, rx: number, ry: number, mirror = false) => {
      const c = t.clone();
      c.colorSpace = THREE.SRGBColorSpace; c.anisotropy = 4;
      c.wrapS = c.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
      c.repeat.set(rx, ry); c.needsUpdate = true;
      return c;
    };
    // the panel is twice as wide as it is tall, so a wall H tall takes W / 2H panels
    return {
      back: set(wall, Math.max(1, Math.round(W / (2 * H))), 1),
      side: set(wall, Math.max(1, Math.round(D / (2 * H))), 1),
      floor: set(floor, W / 12, D / 12, true),
    };
  }, [wall, floor, W, D, H]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[W, D]} /><meshBasicMaterial map={tex.floor} toneMapped={false} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]}><planeGeometry args={[W, H]} /><meshBasicMaterial map={tex.back} toneMapped={false} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * W / 2, H / 2, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[D, H]} /><meshBasicMaterial map={tex.side} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function DecorPiece({ d }: { d: Decor }) {
  return <Piece name={`room/${d.art}`} w={d.w} at={d.at} flat={d.flat} yaw={d.yaw} />;
}

export function RoomScene({ r, onUse, onExit, onFloor }: {
  r: RoomDef; onUse: (e: Exhibit, p?: Pick) => void; onExit: () => void; onFloor: (x: number, z: number) => void;
}) {
  const { W, D, H } = r;
  return (
    <group>
      {/* the floor takes clicks to walk; drawn in Shell, caught here */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} onClick={press2(onFloor)}>
        <planeGeometry args={[W, D]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}><planeGeometry args={[W + 60, D + 60]} /><meshBasicMaterial color="#e3e8f2" /></mesh>
      <mesh position={[0, -0.15, D / 2 + 0.05]}><boxGeometry args={[W, 0.3, 0.1]} /><meshBasicMaterial color={r.pen} /></mesh>
      <Suspense fallback={
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W, D]} /><meshBasicMaterial color={r.tint} /></mesh>
          <mesh position={[0, H / 2, -D / 2]}><planeGeometry args={[W, H]} /><meshBasicMaterial color={r.wall} /></mesh>
        </>
      }>
        <Shell r={r} />
      </Suspense>
      {/* the room's name across the top of the back wall */}
      <Words text={r.title} h={1.2} max={W * 0.55} at={[0, H - 1.6, -D / 2 + 0.05]} ink={r.pen} bg="#ffffff" />
      <Words text={r.kicker} h={0.46} max={W * 0.55} at={[0, H - 2.65, -D / 2 + 0.05]} ink="#4e5a74" weight={600} />

      {r.decor.map((d, k) => <Suspense key={k} fallback={null}><DecorPiece d={d} /></Suspense>)}
      {r.exhibits.map((e) => {
        const C = { frame: Frame, board: Board, bench: Bench, arch: Arch, year: Year, kiosk: Kiosk }[e.kind];
        return <C key={e.id} e={e} onUse={onUse} />;
      })}
      <Exit r={r} onExit={onExit} />
    </group>
  );
}

const press2 = (fn: (x: number, z: number) => void) => (ev: ThreeEvent<MouseEvent>) => {
  ev.stopPropagation(); if (tap(ev)) fn(ev.point.x, ev.point.z);
};
