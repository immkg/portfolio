"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Landmark, Speck } from "./World";

const World = dynamic(() => import("./World"), { ssr: false });

/** The world only mounts on a device that can carry it, and never when the
 *  visitor has asked for reduced motion. Everything it shows also exists as a
 *  page, so refusing to mount costs nothing. */
export default function WorldMount(props: { landmarks: Landmark[]; specks: Speck[] }) {
  const [go, setGo] = useState(false);
  const [motion, setMotion] = useState<"full" | "static">("full");
  const [why, setWhy] = useState<string | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as any).connection?.saveData;
    const gl = (() => {
      try {
        return !!document.createElement("canvas").getContext("webgl2");
      } catch {
        return false;
      }
    })();
    if (!gl) setWhy("This browser cannot run the world.");
    else if (saveData) setWhy("You are on a data saver, so the world has not loaded.");
    else {
      // Reduced motion gets the same world with the movement snapped rather
      // than eased, not a refusal. W3C asks for non-essential animation to be
      // disableable, not for the content to be withheld.
      if (reduce) setMotion("static");
      setGo(true);
    }
  }, []);

  if (why) {
    return (
      <div className="world-decline">
        <p>{why}</p>
        <p>
          <a href="/portfolio/work/">Read the work as pages instead</a>
        </p>
      </div>
    );
  }
  if (!go) return <div className="world-decline" aria-hidden="true" />;
  return <World {...props} motion={motion} />;
}
