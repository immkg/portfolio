"use client";

import { useEffect, useRef, useState } from "react";

let seq = 0;
let ready: Promise<any> | null = null;

/** Mermaid is large, so it loads the first time a diagram is opened and never
 *  before. The world itself does not pay for it. */
function mermaid() {
  ready ??= import("mermaid").then((m) => {
    m.default.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "strict",
      fontFamily: "inherit",
      themeVariables: {
        primaryColor: "#f1f4fb", primaryBorderColor: "#1b2437", primaryTextColor: "#1b2437",
        lineColor: "#4e5a74", fontSize: "13px",
      },
    });
    return m.default;
  });
  return ready;
}

export default function Diagram({ title, source }: { title: string; source: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    mermaid()
      .then((m) => m.render(`atlas-d${++seq}`, source))
      .then(({ svg }: { svg: string }) => { if (live && box.current) box.current.innerHTML = svg; })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [source]);
  return (
    <figure className="atlas-diagram">
      <figcaption>{title}</figcaption>
      {failed ? <pre>{source}</pre> : <div ref={box} className="atlas-diagram-svg" aria-label={title} />}
    </figure>
  );
}
