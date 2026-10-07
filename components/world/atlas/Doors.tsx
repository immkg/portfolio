"use client";

import { type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { BASE } from "../Cutout";
import { paint, tap } from "./Marks";
import type { RoomDef } from "./Rooms";

/* A doorway into each room, out in the world: a small paper building with
   an open door, its name floating above so it reads from anywhere. A click
   walks you to the step and in. The facade art replaces this when it lands. */

const INK = "#1b2437";

function Name({ text, sub, pen }: { text: string; sub: string; pen: string }) {
  const t = useMemo(() => paint(text, { ink: "#ffffff", bg: pen, size: 64 }), [text, pen]);
  const s = useMemo(() => paint(sub, { ink: INK, bg: "#ffffff", size: 48, weight: 600 }), [sub]);
  return (
    <>
      <sprite position={[0, 8.1, 0]} scale={[0.95 * t.aspect, 0.95, 1]}>
        <spriteMaterial map={t.tex} toneMapped={false} depthWrite={false} />
      </sprite>
      <sprite position={[0, 7.25, 0]} scale={[0.55 * s.aspect, 0.55, 1]}>
        <spriteMaterial map={s.tex} toneMapped={false} depthWrite={false} />
      </sprite>
    </>
  );
}

const FACADE_W = 6.4;

function Facade({ name }: { name: string }) {
  const tex = useTexture(`${BASE}/room/${name}.webp`);
  useMemo(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }, [tex]);
  const img = tex.image as { width: number; height: number };
  const h = FACADE_W * (img.height / img.width);
  return (
    <mesh position={[0, h / 2, 0]}>
      <planeGeometry args={[FACADE_W, h]} />
      <meshBasicMaterial map={tex} alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Doors({ rooms, onDoor }: { rooms: RoomDef[]; onDoor: (r: RoomDef) => void }) {
  return (
    <group>
      {rooms.map((r) => (
        <group key={r.id} position={[r.door.x, 0, r.door.z]} rotation={[0, r.door.yaw, 0]}
               onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (tap(e)) onDoor(r); }}
               onPointerOver={() => (document.body.style.cursor = "pointer")}
               onPointerOut={() => (document.body.style.cursor = "")}>
          {/* the drawn building, its doorway at the bottom centre, facing the plaza */}
          <Suspense fallback={<mesh position={[0, 2.2, -0.6]}><boxGeometry args={[4.4, 4.4, 2.4]} /><meshBasicMaterial color={r.tint} /></mesh>}>
            <Facade name={r.doorArt} />
          </Suspense>
          <Name text={r.title} sub={r.kicker} pen={r.pen} />
        </group>
      ))}
    </group>
  );
}
