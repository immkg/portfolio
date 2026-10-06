"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Scene, { type Shared } from "./Scene";
import Panel from "./Panel";
import {
  type WorldData, type Pick, ROOT, ICON, PEN, FAMILY_INK, dateAt, districtAt,
  districtSpot, skillSpots, plinth, span,
} from "./model";

type Hit = { pick: Pick; label: string; sub: string; icon: string; pen: string };

/** The whole world: canvas, the readout of where you stand, search, and the
 *  panel the long reads open in. */
export default function Atlas({ motion }: { motion: "full" | "static" }) {
  const [w, setW] = useState<WorldData | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [dpr, setDpr] = useState(1.25);
  const [where, setWhere] = useState({ when: "Now", district: null as string | null });
  const [high, setHigh] = useState(false);
  const [q, setQ] = useState("");
  const [touch, setTouch] = useState(false);

  const shared = useRef<Shared>({
    me: { current: new THREE.Vector3(0, 0, 13) },
    target: { current: null },
    far: { current: 1 },
    yaw: { current: Math.atan2(30, 44) },
    pitch: { current: 0.57 },
  }).current;

  /* drag anywhere on the ground to turn (sideways) and tilt (up and down) */
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const turn = (dx: number, dy: number) => {
    shared.yaw.current -= dx * 0.006;
    shared.pitch.current = THREE.MathUtils.clamp(shared.pitch.current + dy * 0.004, 0.12, 1.45);
  };

  useEffect(() => {
    fetch(`${ROOT}/data/world.json`).then((r) => r.json()).then(setW);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  /* the readout under your feet: which year, which district */
  useEffect(() => {
    if (!w) return;
    const t = setInterval(() => {
      const p = shared.me.current;
      const next = { when: dateAt(Math.hypot(p.x, p.z), w), district: districtAt(p.x, p.z, w) };
      setWhere((o) => (o.when === next.when && o.district === next.district ? o : next));
    }, 200);
    return () => clearInterval(t);
  }, [w, shared]);

  /* the mouse wheel rises and lands; high ground shows the whole shape */
  useEffect(() => {
    const k = (e: WheelEvent) => {
      if ((e.target as HTMLElement)?.closest?.(".atlas-panel, .atlas-search")) return;
      shared.far.current = THREE.MathUtils.clamp(shared.far.current * (e.deltaY > 0 ? 1.1 : 0.9), 0.55, 3.4);
      setHigh(shared.far.current > 2);
    };
    window.addEventListener("wheel", k, { passive: true });
    return () => window.removeEventListener("wheel", k);
  }, [shared]);

  const spots = useMemo(() => (w ? skillSpots(w.skills) : {}), [w]);

  /* picking something opens its read and walks you over to it */
  const onPick = useCallback((p: Pick) => {
    if (!w) return;
    setPick(p);
    setQ("");
    let to: [number, number] | null = null;
    if (p.kind === "project") {
      const x = w.projects.find((o) => o.slug === p.slug);
      if (x) to = [x.x, x.z];
    } else if (p.kind === "skill") to = spots[p.slug] ?? null;
    else if (p.kind === "story") {
      const s = w.stories.find((o) => o.id === p.id);
      const x = s && w.projects.find((o) => o.slug === s.project);
      if (x) to = [x.x, x.z];
    } else if (p.kind === "district") to = districtSpot(w.districts.indexOf(p.id), w.districts.length, w.plaza + 14);
    else to = [0, 4];
    if (to) {
      // stop just short of it on the camera's side, so it stands in front of
      // you rather than behind your back
      const back = p.kind === "about" ? 8 : 7, yw = shared.yaw.current;
      shared.target.current = new THREE.Vector3(to[0] + Math.sin(yw) * back, 0, to[1] + Math.cos(yw) * back);
    }
  }, [w, spots, shared]);

  const hits = useMemo<Hit[]>(() => {
    if (!w || q.trim().length < 2) return [];
    const t = q.trim().toLowerCase();
    const out: Hit[] = [];
    w.projects.forEach((p) => {
      if ((p.label + " " + p.line + " " + p.skills.join(" ")).toLowerCase().includes(t))
        out.push({ pick: { kind: "project", slug: p.slug }, label: p.label, sub: `Project · ${span(p)}`,
                   icon: `project-${p.slug}`, pen: PEN[p.domain] });
    });
    w.skills.forEach((s) => {
      if (s.name.toLowerCase().includes(t))
        out.unshift({ pick: { kind: "skill", slug: s.slug }, label: s.name, sub: `Skill · ${s.projects.length} projects`,
                      icon: s.icon, pen: FAMILY_INK[s.family] });
    });
    w.stories.forEach((s) => {
      if ((s.title + " " + s.s + " " + s.a).toLowerCase().includes(t))
        out.push({ pick: { kind: "story", id: s.id }, label: s.title, sub: "Story", icon: `story-${s.id}`, pen: "#1b2437" });
    });
    return out.slice(0, 9);
  }, [w, q]);

  if (!w) return <div className="world-decline">Unfolding the map…</div>;
  const dLabel = where.district && w.domains.find((d) => d.id === where.district)?.label;

  return (
    <div
      className="world atlas"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).tagName === "CANVAS") drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        turn(e.clientX - d.x, e.clientY - d.y);
        d.x = e.clientX; d.y = e.clientY;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [30, 34, 57], fov: 34, near: 0.5, far: 900 }}
        onPointerMissed={() => setPick(null)}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <AdaptiveDpr pixelated />
        <Scene w={w} shared={shared} pick={pick} onPick={onPick} motion={motion} />
      </Canvas>

      <header className="atlas-hud">
        <button className="atlas-name" onClick={() => onPick({ kind: "about" })}>
          <img src={ICON("mark")} alt="" width={28} height={28} />
          <span><b>{w.profile.name}</b><small>{w.profile.headline.split("|")[0].trim()}</small></span>
        </button>
        <div className="atlas-where" aria-live="off">
          <span className="atlas-when">{where.when}</span>
          <span className="atlas-dist" style={{ ["--pen" as any]: where.district ? PEN[where.district] : "#7b87a3" }}>
            {dLabel ?? (where.when === "Now" ? "The plaza" : "Between districts")}
          </span>
        </div>
        <div className="atlas-search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a project, skill or story"
                 aria-label="Find a project, skill or story" />
          {hits.length > 0 && (
            <ul>
              {hits.map((h, i) => (
                <li key={i}><button onClick={() => onPick(h.pick)}>
                  <img src={ICON(h.icon)} alt="" width={28} height={28} />
                  <span style={{ ["--pen" as any]: h.pen }}><b>{h.label}</b><small>{h.sub}</small></span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <nav className="atlas-legend" aria-label="Districts">
        {w.districts.map((d) => {
          const x = w.domains.find((o) => o.id === d);
          return (
            <button key={d} style={{ ["--pen" as any]: PEN[d] }} className={where.district === d ? "is-here" : ""}
                    onClick={() => onPick({ kind: "district", id: d })}>
              <img src={ICON(`domain-${d}`)} alt="" width={20} height={20} />{x?.label}
            </button>
          );
        })}
      </nav>

      <div className="atlas-tools">
        <button onClick={() => { shared.far.current = high ? 1 : 2.9; setHigh(!high); }}>
          {high ? "Back down" : "High ground"}
        </button>
        <button aria-label="Turn left" onClick={() => (shared.yaw.current += 0.6)}>⟲</button>
        <button aria-label="Turn right" onClick={() => (shared.yaw.current -= 0.6)}>⟳</button>
        <button aria-label="Tilt" onClick={() => (shared.pitch.current = shared.pitch.current > 1 ? 0.35 : shared.pitch.current + 0.4)}>Tilt</button>
        <button onClick={() => { shared.target.current = new THREE.Vector3(0, 0, 13); setPick(null); }}>Plaza</button>
        <a href={`${ROOT}/work/`}>Read as text</a>
      </div>

      <div className="world-help">
        {touch ? "Tap to walk or open · drag to turn and tilt"
               : "Click to walk or open · drag to turn and tilt · W A S D · Q E R F · scroll to rise"}
      </div>

      {pick && <Panel w={w} pick={pick} onPick={onPick} onClose={() => setPick(null)} />}
    </div>
  );
}
