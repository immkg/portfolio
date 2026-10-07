"use client";

import { type ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
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
      <sprite position={[0, 7.2, 0]} scale={[0.95 * t.aspect, 0.95, 1]}>
        <spriteMaterial map={t.tex} toneMapped={false} depthWrite={false} />
      </sprite>
      <sprite position={[0, 6.35, 0]} scale={[0.55 * s.aspect, 0.55, 1]}>
        <spriteMaterial map={s.tex} toneMapped={false} depthWrite={false} />
      </sprite>
    </>
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
          {/* the building: a block with a gabled roof, its front facing the plaza */}
          <mesh position={[0, 2.2, -0.6]}><boxGeometry args={[4.4, 4.4, 2.4]} /><meshBasicMaterial color={r.tint} /></mesh>
          <mesh position={[0, 4.95, -0.6]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[3.2, 3.2, 2.5]} /><meshBasicMaterial color={r.pen} /></mesh>
          <mesh position={[0, 2.2, -0.6]}><boxGeometry args={[4.5, 0.25, 2.5]} /><meshBasicMaterial color={r.pen} /></mesh>
          {/* the open doorway and a step */}
          <mesh position={[0, 1.45, 0.61]}><planeGeometry args={[1.8, 2.9]} /><meshBasicMaterial color={INK} /></mesh>
          <mesh position={[0, 0.08, 1.2]}><boxGeometry args={[2.6, 0.16, 1.2]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <Name text={r.title} sub={r.kicker} pen={r.pen} />
        </group>
      ))}
    </group>
  );
}
