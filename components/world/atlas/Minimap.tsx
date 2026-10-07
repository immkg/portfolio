"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Shared } from "./Scene";
import { type WorldData, type Pick, PEN, FILL } from "./model";

const SIZE = 176;

/** A top-down map of the whole world: districts, year rings, every project,
 *  and you, with the way the camera faces. Clicking it walks you there. */
export default function Minimap({ w, shared, pick, onPick }: {
  w: WorldData; shared: Shared; pick: Pick | null; onPick: (p: Pick) => void;
}) {
  const [open, setOpen] = useState(true);
  const me = useRef<SVGGElement>(null);
  const cone = useRef<SVGPathElement>(null);
  const arrow = useRef<SVGPathElement>(null);
  const route = useRef<SVGPathElement>(null);
  const R = w.rim + 14;
  const k = (SIZE / 2 - 4) / R;                 // world units to map pixels
  const at = (x: number, z: number) => [SIZE / 2 + x * k, SIZE / 2 + z * k];

  useEffect(() => {
    try { if (window.innerWidth < 720) setOpen(false); } catch {}
  }, []);

  /* follow the visitor without re-rendering React every frame */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = shared.me.current, yaw = shared.yaw.current;
      const [x, y] = at(p.x, p.z);
      // the camera looks from behind the visitor, so it faces away from its offset
      const deg = (Math.atan2(-Math.cos(yaw), -Math.sin(yaw)) * 180) / Math.PI;
      me.current?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
      // first person shows what you can see; above, which way the camera faces
      const fpv = shared.view.current === "fpv";
      cone.current?.setAttribute("visibility", fpv ? "visible" : "hidden");
      arrow.current?.setAttribute("visibility", fpv ? "hidden" : "visible");
      // the trip under way: the road route, or a dashed flight line
      const tr = shared.trip.current;
      if (route.current) {
        if (tr && tr.pts.length > 1) {
          const end = tr.pts[tr.pts.length - 1];
          const pts = tr.fly ? [[p.x, p.z], end] : [[p.x, p.z], ...tr.pts.slice(1)];
          route.current.setAttribute("d", pts.map(([a, b], i) => { const [u, v] = at(a, b); return `${i ? "L" : "M"}${u.toFixed(1)} ${v.toFixed(1)}`; }).join(" "));
          route.current.setAttribute("stroke-dasharray", tr.fly ? "3 3" : "none");
          route.current.setAttribute("visibility", "visible");
        } else route.current.setAttribute("visibility", "hidden");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const wedges = useMemo(() => {
    const n = w.districts.length, s = (Math.PI * 2) / n;
    return w.districts.map((d, i) => {
      const a0 = (i + 0.06) * s - Math.PI / 2, a1 = (i + 0.94) * s - Math.PI / 2;
      const r0 = w.plaza * k, r1 = (w.rim + 10) * k, c = SIZE / 2;
      const p = (r: number, a: number) => `${(c + Math.cos(a) * r).toFixed(1)} ${(c + Math.sin(a) * r).toFixed(1)}`;
      return { d, path: `M${p(r0, a0)} L${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)} Z` };
    });
  }, [w, k]);

  const picked = pick?.kind === "project" ? pick.slug : null;
  const district = pick?.kind === "district" ? pick.id : null;

  if (!open)
    return <button className="minimap-open" onClick={() => setOpen(true)} aria-label="Show map">Map</button>;

  return (
    <div className="minimap">
      <svg
        width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Map of the world"
        onClick={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          // the map is drawn smaller on a phone, so scale back to its own units
          const f = SIZE / r.width;
          const x = ((e.clientX - r.left) * f - SIZE / 2) / k, z = ((e.clientY - r.top) * f - SIZE / 2) / k;
          shared.target.current = new THREE.Vector3(x, 0, z);
        }}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 2} fill="#fbfcff" stroke="#b9c4dc" />
        {wedges.map((x) => (
          <path key={x.d} d={x.path} fill={FILL[x.d]} opacity={district && district !== x.d ? 0.35 : 0.9}
                onClick={(e) => { e.stopPropagation(); onPick({ kind: "district", id: x.d }); }} style={{ cursor: "pointer" }}>
            <title>{w.domains.find((o) => o.id === x.d)?.label}</title>
          </path>
        ))}
        {w.rings.map((y) => (
          <circle key={y.year} cx={SIZE / 2} cy={SIZE / 2} r={y.r * k} fill="none" stroke="#c9d2e6" strokeWidth={0.6} />
        ))}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={w.plaza * k} fill="#f1f4fb" stroke="#b9c4dc" />
        {w.projects.map((p) => {
          const [x, y] = at(p.x, p.z);
          const on = picked === p.slug;
          return (
            <circle key={p.slug} cx={x} cy={y} r={on ? 4 : p.tier === 3 ? 2.4 : 1.5} fill={PEN[p.domain]}
                    stroke={on ? "#1b2437" : "none"} strokeWidth={1.2}
                    onClick={(e) => { e.stopPropagation(); onPick({ kind: "project", slug: p.slug }); }} style={{ cursor: "pointer" }}>
              <title>{p.label}</title>
            </circle>
          );
        })}
        <text x={SIZE / 2} y={SIZE / 2 + 3} textAnchor="middle" fontSize="8" fill="#4e5a74">now</text>
        <text x={SIZE / 2} y={9} textAnchor="middle" fontSize="7" fill="#7b87a3">2019</text>
        <path ref={route} fill="none" stroke="#e0557f" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" visibility="hidden" style={{ pointerEvents: "none" }} />
        <g ref={me} style={{ pointerEvents: "none" }}>
          <path ref={cone} d="M0 0 L22 -11 A24 24 0 0 1 22 11 Z" fill="#e0557f" opacity={0.28} visibility="hidden" />
          <path ref={arrow} d="M0 -9 L5 3 L0 0 L-5 3 Z" fill="#1b2437" transform="rotate(90)" />
          <circle r={2.4} fill="#e0557f" stroke="#fff" strokeWidth={1} />
        </g>
      </svg>
      <button className="minimap-close" onClick={() => setOpen(false)} aria-label="Hide map">×</button>
    </div>
  );
}
