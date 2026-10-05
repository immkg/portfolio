"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export const BASE = "/portfolio/world";

/** A flat plane carrying generated paper art.
 *
 *  Rendered opaque with an alpha test rather than blended transparency: the
 *  three.js manual recommends exactly this for sharp-edged cut-outs, because a
 *  pixel that is never drawn cannot sort wrongly against its neighbours. Our
 *  art is hard-edged by construction, so nothing is lost. */
export default function Cutout({
  src, width, position, rotation, billboard = false, opacity = 1, anchor = "centre",
}: {
  src: string;
  width: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  billboard?: boolean;
  opacity?: number;
  anchor?: "centre" | "bottom";
}) {
  const tex = useTexture(`${BASE}/${src}.webp`);
  const size = useMemo(() => {
    const img: any = tex.image;
    const ratio = img ? img.height / img.width : 1;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return [width, width * ratio] as [number, number];
  }, [tex, width]);

  // standing art is placed by its feet, so a tall facade and a short stall
  // both sit on the ground rather than sinking into it
  const at: [number, number, number] =
    anchor === "bottom"
      ? [position[0], position[1] + size[1] / 2, position[2]]
      : position;

  if (billboard) {
    return (
      <sprite position={at} scale={[size[0], size[1], 1]}>
        <spriteMaterial map={tex} alphaTest={0.5} toneMapped={false} opacity={opacity} />
      </sprite>
    );
  }
  return (
    <mesh position={at} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={tex}
        alphaTest={0.5}
        toneMapped={false}
        transparent={false}
        side={THREE.DoubleSide}
        opacity={opacity}
      />
    </mesh>
  );
}
