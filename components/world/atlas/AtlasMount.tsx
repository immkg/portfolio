"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Atlas = dynamic(() => import("./Atlas"), { ssr: false });

/** Reduced motion gets the same world with movement snapped rather than
 *  eased. Only a browser without WebGL 2 or on a data saver is sent to the
 *  pages, which carry everything the world does. */
export default function AtlasMount() {
  const [state, setState] = useState<"wait" | "full" | "static" | string>("wait");
  useEffect(() => {
    const gl = (() => {
      try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
    })();
    if (!gl) setState("This browser cannot run the world.");
    else if ((navigator as any).connection?.saveData) setState("You are on a data saver, so the world has not loaded.");
    else setState(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "static" : "full");
  }, []);
  if (state === "wait") return <div className="world-decline" aria-hidden="true" />;
  if (state !== "full" && state !== "static")
    return (
      <div className="world-decline">
        <p>{state}</p>
        <p><a href="/portfolio/work/">Read the work as pages instead</a></p>
      </div>
    );
  return <Atlas motion={state} />;
}
