"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Thing } from "./Studio";

const Studio = dynamic(() => import("./Studio"), { ssr: false });

export default function StudioMount({ things }: { things: Thing[] }) {
  const [go, setGo] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  useEffect(() => {
    const gl = (() => {
      try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
    })();
    if (!gl) setWhy("This browser cannot run the room.");
    else setGo(true);
  }, []);
  if (why) {
    return (
      <div className="world-decline">
        <p>{why}</p>
        <p><a href="/portfolio/about/">Read it as a page instead</a></p>
      </div>
    );
  }
  if (!go) return <div className="world-decline" aria-hidden="true" />;
  return <Studio things={things} />;
}
