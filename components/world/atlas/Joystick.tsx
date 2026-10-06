"use client";

import { useRef, useState } from "react";
import type { Shared } from "./Scene";

/** A thumb stick for phones in first person: drag inside the ring to walk. */
export default function Joystick({ shared }: { shared: Shared }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 46;
  const set = (cx: number, cy: number) => {
    const b = base.current!.getBoundingClientRect();
    let x = cx - (b.left + b.width / 2), y = cy - (b.top + b.height / 2);
    const d = Math.hypot(x, y);
    if (d > R) { x *= R / d; y *= R / d; }
    setKnob({ x, y });
    shared.stick.current = { x: x / R, y: y / R };
  };
  const end = () => { setKnob({ x: 0, y: 0 }); shared.stick.current = { x: 0, y: 0 }; };
  return (
    <div
      ref={base} className="fpv-stick"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); set(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") set(e.clientX, e.clientY); }}
      onPointerUp={end} onPointerCancel={end}
    >
      <div className="fpv-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
