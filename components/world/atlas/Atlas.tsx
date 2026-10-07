"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Scene, { type Shared } from "./Scene";
import Panel from "./Panel";
import Minimap from "./Minimap";
import Joystick from "./Joystick";
import { BUILTIN_ALIASES, buildAliases, smartHit } from "@/lib/smartMatch";
import { track } from "@/lib/analytics";
import { buildRooms, doorstep, exhibitFor, type Exhibit, type RoomDef } from "./Rooms";
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
    view: { current: "tp" },
    blend: { current: 0 },
    look: { current: 0 },
    stick: { current: { x: 0, y: 0 } },
    aim: { current: null },
    plane: { current: null },
    sound: { current: false },
    hop: { current: false },
    trip: { current: null },
    arrive: { current: null },
    space: { current: null },
    go: { current: null },
  }).current;

  /* first person: walk in at the avatar's eyes, or fly back out */
  const [view, setView] = useState<"tp" | "fpv">("tp");
  const [aim, setAim] = useState<string | null>(null);
  const [steps, setSteps] = useState(false);
  const [locked, setLocked] = useState(false);
  const goView = useCallback((v: "tp" | "fpv") => {
    shared.view.current = v;
    shared.look.current = 0;
    track("world_view", { view: v === "fpv" ? "first_person" : "above" });
    setView(v);
    try { localStorage.setItem("atlas-view", v); } catch {}
    const u = new URL(window.location.href);
    if (v === "fpv") u.searchParams.set("view", "fpv"); else u.searchParams.delete("view");
    window.history.replaceState(null, "", u.toString());
    if (v === "tp" && document.pointerLockElement) document.exitPointerLock();
  }, [shared]);
  useEffect(() => {
    let v: string | null = new URLSearchParams(window.location.search).get("view");
    if (!v) { try { v = localStorage.getItem("atlas-view"); } catch {} }
    if (v === "fpv") goView("fpv");
  }, [goView]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      if (e.key.toLowerCase() === "v") goView(shared.view.current === "fpv" ? "tp" : "fpv");
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [goView, shared]);
  /* the crosshair's hint, read from the rig a few times a second */
  useEffect(() => {
    if (view !== "fpv") { setAim(null); return; }
    const t = setInterval(() => setAim(shared.aim.current?.label ?? null), 120);
    return () => clearInterval(t);
  }, [view, shared]);
  /* captured mouse: movement turns the head; a click opens what the crosshair is on */
  useEffect(() => {
    const move = (e: MouseEvent) => { if (document.pointerLockElement) turn(e.movementX, e.movementY); };
    const down = () => { if (document.pointerLockElement && shared.aim.current) onPickRef.current?.(shared.aim.current.pick); };
    const change = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("mousemove", move);
    document.addEventListener("mousedown", down);
    document.addEventListener("pointerlockchange", change);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("pointerlockchange", change);
    };
  }, [shared]); // eslint-disable-line react-hooks/exhaustive-deps
  const onPickRef = useRef<((p: Pick) => void) | null>(null);

  /* drag anywhere on the ground to turn (sideways) and tilt (up and down) */
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const turn = (dx: number, dy: number) => {
    if (shared.view.current === "fpv") {
      // in first person the head turns and nods
      shared.yaw.current -= dx * 0.0035;
      shared.look.current = THREE.MathUtils.clamp(shared.look.current - dy * 0.003, -0.9, 0.8);
      return;
    }
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
      if (shared.space.current) return;
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
      if (shared.view.current === "fpv") return;
      shared.far.current = THREE.MathUtils.clamp(shared.far.current * (e.deltaY > 0 ? 1.1 : 0.9), 0.55, 3.4);
      setHigh(shared.far.current > 2);
    };
    window.addEventListener("wheel", k, { passive: true });
    return () => window.removeEventListener("wheel", k);
  }, [shared]);

  const spots = useMemo(() => (w ? skillSpots(w.skills) : {}), [w]);

  /* walk to a spot, then do something there (a card waiting on arrival) */
  const walkThen = useCallback((to: [number, number], focus: [number, number], open: () => void) => {
    const goal = new THREE.Vector3(to[0], 0, to[1]);
    if (Math.hypot(goal.x - shared.me.current.x, goal.z - shared.me.current.z) < 1.2) { open(); return; }
    let done = false;
    const once = () => { if (!done) { done = true; open(); } };
    shared.arrive.current = { goal, focus, open: once };
    shared.target.current = goal;
    setTimeout(() => { if (shared.arrive.current?.goal === goal) { shared.arrive.current = null; once(); } }, 4000);
  }, [shared]);

  /* rooms: built from the data, entered through a door, left by the exit mat,
     the Leave button or Esc. The paper folds shut, the room swaps, it opens. */
  const rooms = useMemo(() => (w ? buildRooms(w) : []), [w]);
  const [room, setRoom] = useState<RoomDef | null>(null);
  const [fold, setFold] = useState<{ phase: "shut" | "open"; title: string } | null>(null);
  const outside = useRef<{ yaw: number; pitch: number; far: number } | null>(null);
  const busy = useRef(false);
  const goRoom = useCallback((id: string | null) => {
    const next = id ? rooms.find((r) => r.id === id) ?? null : null;
    const cur = shared.space.current;
    if (busy.current || (id && !next) || (cur?.id ?? null) === (next?.id ?? null)) return;
    busy.current = true;
    setPick(null); shared.arrive.current = null; shared.target.current = null;
    if (document.pointerLockElement) document.exitPointerLock();
    const swap = () => {
      if (next) {
        if (!cur) outside.current = { yaw: shared.yaw.current, pitch: shared.pitch.current, far: shared.far.current };
        shared.me.current.set(next.spawn[0], 0, next.spawn[1]);
        shared.yaw.current = 0.2; shared.pitch.current = 0.5;
        track("room_enter", { room: next.id });
      } else if (cur) {
        // back out on the step in front of the door you came in by
        const [x, z] = doorstep(cur, 3.8);
        shared.me.current.set(x, 0, z);
        const o = outside.current;
        if (o) { shared.yaw.current = o.yaw; shared.pitch.current = o.pitch; shared.far.current = o.far; }
      }
      shared.space.current = next;
      setRoom(next);
      const u = new URL(window.location.href);
      if (next) u.searchParams.set("room", next.id); else u.searchParams.delete("room");
      u.searchParams.delete("p");
      window.history.replaceState(null, "", u.toString());
    };
    if (motion === "static") { swap(); busy.current = false; return; }
    setFold({ phase: "shut", title: next ? next.title : "Back to the world" });
    setTimeout(() => {
      swap();
      setFold({ phase: "open", title: next ? next.title : "Back to the world" });
      setTimeout(() => { setFold(null); busy.current = false; }, 460);
    }, 460);
  }, [rooms, shared, motion]);
  shared.go.current = goRoom;

  /* a click on a door walks you to its step; the step takes you in */
  const onDoor = useCallback((r: RoomDef) => {
    const [x, z] = doorstep(r);
    if (Math.hypot(x - shared.me.current.x, z - shared.me.current.z) < 1.6) { goRoom(r.id); return; }
    shared.arrive.current = null;
    shared.target.current = new THREE.Vector3(x, 0, z);
  }, [shared, goRoom]);

  /* using an exhibit: walk up to it, then open its card or follow its link */
  const onUse = useCallback((e: Exhibit, p?: Pick) => {
    const pk = p ?? e.pick;
    const act = () => {
      if (e.href) {
        track(e.download ? "resume_download" : "reach_contact", e.download ? { from: "post_office" } : { via: "post_office_call" });
        const a = document.createElement("a");
        a.href = e.href; if (e.download) a.download = ""; a.click();
      } else if (pk) setPick(pk);
    };
    if (shared.view.current === "fpv" || motion === "static") { act(); return; }
    walkThen(e.stand, [e.at[0], e.at[2]], act);
  }, [shared, motion, walkThen]);

  /* Esc steps back out of a room, once any open card is closed */
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape" || !shared.space.current || document.pointerLockElement) return;
      if (document.querySelector(".atlas-panel")) return;
      goRoom(null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [goRoom, shared]);

  /* picking something walks you over to it, and its card opens when you
     arrive (at once in first person, where you are already looking at it) */
  const onPick = useCallback((p: Pick) => {
    if (!w) return;
    if (document.pointerLockElement) document.exitPointerLock();   // a card needs the mouse back
    setQ("");
    shared.arrive.current = null;
    track("world_open", { kind: p.kind, id: "slug" in p ? p.slug : "id" in p ? p.id : "i" in p ? String(p.i) : p.kind });
    // inside a room: walk to whatever shows it here, or just open the card
    const here = shared.space.current;
    if (here) {
      const ex = exhibitFor(here, p);
      if (ex && shared.view.current !== "fpv" && motion !== "static") walkThen(ex.stand, [ex.at[0], ex.at[2]], () => setPick(p));
      else setPick(p);
      return;
    }
    if (p.kind === "built") { setPick(p); return; }
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
    else if (p.kind === "reach" || p.kind === "about") to = null;   // these cards come to you
    else to = [0, 4];
    if (!to || shared.view.current === "fpv") { setPick(p); return; }
    // stop just short of it on the camera's side, so it stands in front of
    // you rather than behind your back
    const back = p.kind === "about" ? 8 : 7, yw = shared.yaw.current;
    const goal = new THREE.Vector3(to[0] + Math.sin(yw) * back, 0, to[1] + Math.cos(yw) * back);
    if (Math.hypot(goal.x - shared.me.current.x, goal.z - shared.me.current.z) < 1.5) { setPick(p); return; }
    let done = false;
    const open = () => { if (!done) { done = true; setPick(p); } };
    shared.arrive.current = { goal, focus: to, open };
    shared.target.current = goal;
    // never leave a card waiting on a walk that got stuck
    setTimeout(() => { if (shared.arrive.current?.goal === goal) { shared.arrive.current = null; open(); } }, 5000);
  }, [w, spots, shared, walkThen, motion]);

  /* a link can open the world on one thing: ?p=project:slug, skill:slug,
     story:id, district:id, reach or about. The text pages link here. */
  const opened = useRef(false);
  useEffect(() => {
    if (!w || opened.current) return;
    opened.current = true;
    const inRoom = new URLSearchParams(window.location.search).get("room");
    if (inRoom && rooms.some((r) => r.id === inRoom)) { goRoom(inRoom); return; }
    const q = new URLSearchParams(window.location.search).get("p");
    if (!q) return;
    const [kind, id] = q.split(":");
    const ok =
      (kind === "project" && w.projects.some((x) => x.slug === id)) ||
      (kind === "skill" && w.skills.some((x) => x.slug === id)) ||
      (kind === "story" && w.stories.some((x) => x.id === id)) ||
      (kind === "district" && w.districts.includes(id));
    if (ok) onPick({ kind, ...(kind === "story" ? { id } : kind === "district" ? { id } : { slug: id }) } as Pick);
    else if (kind === "reach" || kind === "about") onPick({ kind } as Pick);
  }, [w, onPick, rooms, goRoom]);

  /* the same forgiving search as the text pages: acronyms (adr, k8s), synonyms,
     typos, and each skill's other names. Skills first, best match first. */
  const aliases = useMemo(() => (w ? buildAliases({ skills: w.skills }) : {}), [w]);
  onPickRef.current = onPick;

  const hits = useMemo<Hit[]>(() => {
    if (!w || q.trim().length < 2) return [];
    const nq = q.trim().toLowerCase();
    const rank = (label: string) => (label.toLowerCase().startsWith(nq) ? 0 : label.toLowerCase().includes(nq) ? 1 : 2);
    const skills = w.skills
      .filter((s) => smartHit(q, [s.name, s.group, s.line], aliases, s.aliases))
      .sort((a, b) => rank(a.name) - rank(b.name))
      .map<Hit>((s) => ({ pick: { kind: "skill", slug: s.slug }, label: s.name, sub: `Skill · ${s.projects.length} projects`,
                          icon: s.icon, pen: FAMILY_INK[s.family] }));
    const projects = w.projects
      .filter((p) => smartHit(q, [p.label, p.line, ...p.did, ...p.skills], BUILTIN_ALIASES))
      .sort((a, b) => rank(a.label) - rank(b.label) || b.tier - a.tier)
      .map<Hit>((p) => ({ pick: { kind: "project", slug: p.slug }, label: p.label, sub: `Project · ${span(p)}`,
                          icon: `project-${p.slug}`, pen: PEN[p.domain] }));
    const stories = w.stories
      .filter((s) => smartHit(q, [s.title, s.s, s.t, s.a, s.r], BUILTIN_ALIASES))
      .map<Hit>((s) => ({ pick: { kind: "story", id: s.id }, label: s.title, sub: "Story", icon: `story-${s.id}`, pen: "#1b2437" }));
    // a few of each kind, so one kind never crowds the others out
    return [...skills.slice(0, 4), ...projects.slice(0, 5), ...stories.slice(0, 3)];
  }, [w, q, aliases]);

  if (!w) return <div className="world-decline">Unfolding the map…</div>;
  const dLabel = where.district && w.domains.find((d) => d.id === where.district)?.label;

  return (
    <div
      className={`world atlas${room ? " in-room" : ""}`}
      onPointerDown={(e) => {
        const el = e.target as HTMLElement;
        if (el.tagName !== "CANVAS") return;
        // first person on a desktop: the first click captures the mouse to look around
        if (shared.view.current === "fpv" && !touch && !document.pointerLockElement && e.pointerType === "mouse") {
          try { (el.requestPointerLock as any)?.call(el); } catch {}
          return;
        }
        // on a phone, the left half belongs to the joystick in first person
        if (shared.view.current === "fpv" && touch && e.clientX < window.innerWidth * 0.45) return;
        drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
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
        <Scene w={w} shared={shared} pick={pick} onPick={onPick} motion={motion}
               rooms={rooms} room={room} onDoor={onDoor} onUse={onUse} onExit={() => goRoom(null)} />
      </Canvas>

      <header className="atlas-hud">
        <button className="atlas-name" onClick={() => onPick({ kind: "about" })}>
          <img src={ICON("mark")} alt="" width={28} height={28} />
          <span><b>{w.profile.name}</b><small>{w.profile.headline.split("|")[0].trim()}</small></span>
        </button>
        {room ? (
          <div className="atlas-where" aria-live="polite" style={{ ["--pen" as any]: room.pen }}>
            <span className="atlas-when">{room.title}</span>
            <span className="atlas-dist">{room.kicker}</span>
          </div>
        ) : (
          <div className="atlas-where" aria-live="off">
            <span className="atlas-when">{where.when}</span>
            <span className="atlas-dist" style={{ ["--pen" as any]: where.district ? PEN[where.district] : "#7b87a3" }}>
              {dLabel ?? (where.when === "Now" ? "The plaza" : "Between districts")}
            </span>
          </div>
        )}
        <button className="atlas-reach" onClick={() => onPick({ kind: "reach" })} aria-label="Say hi: send me a paper plane">
          <svg className="atlas-reach-trail" viewBox="0 0 40 20" width="40" height="20" aria-hidden="true">
            <path d="M1 16 C10 18, 16 4, 26 9 S36 12, 39 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 3" strokeLinecap="round" />
          </svg>
          <svg className="atlas-reach-plane" viewBox="0 0 64 48" width="26" height="20" aria-hidden="true">
            <path d="M2 22 L62 2 L40 46 L30 30 Z" fill="#fff" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <path d="M62 2 L30 30 L26 44 L34 33" fill="#dcdefb" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          </svg>
          <span>Say hi</span>
        </button>
        <div className="atlas-search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a project, skill or story"
                 aria-label="Find a project, skill or story" />
          {hits.length > 0 && (
            <ul>
              {hits.map((h, i) => (
                <li key={i}><button onClick={() => { track("world_search", { q, hit: h.label }); onPick(h.pick); }}>
                  <img src={ICON(h.icon)} alt="" width={28} height={28} />
                  <span style={{ ["--pen" as any]: h.pen }}><b>{h.label}</b><small>{h.sub}</small></span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {!(view === "fpv" && touch) && <Minimap w={w} shared={shared} pick={pick} onPick={onPick} rooms={rooms} room={room} onDoor={onDoor} />}

      {!room && <nav className="atlas-legend" aria-label="Districts">
        {w.districts.map((d) => {
          const x = w.domains.find((o) => o.id === d);
          return (
            <button key={d} style={{ ["--pen" as any]: PEN[d] }} className={where.district === d ? "is-here" : ""}
                    onClick={() => onPick({ kind: "district", id: d })}>
              <img src={ICON(`domain-${d}`)} alt="" width={20} height={20} />{x?.label}
            </button>
          );
        })}
      </nav>}

      <div className="atlas-tools">
        <button className="atlas-view" onClick={() => goView(view === "fpv" ? "tp" : "fpv")}>
          {view === "fpv" ? "↑ Fly out" : "👁 Walk in"}
        </button>
        {view === "fpv" && touch && <button onClick={() => (shared.hop.current = true)}>Hop</button>}
        {view === "fpv" && <button onClick={() => (shared.plane.current = performance.now())}>✈ Throw</button>}
        {view === "fpv" && (
          <button aria-pressed={steps} onClick={() => { shared.sound.current = !steps; setSteps(!steps); }}>
            {steps ? "♪ Steps on" : "♪ Steps off"}
          </button>
        )}
        {view === "tp" && !room && <button onClick={() => { shared.far.current = high ? 1 : 2.9; setHigh(!high); }}>
          {high ? "Back down" : "High ground"}
        </button>}
        {view === "tp" && <button aria-label="Turn left" onClick={() => (shared.yaw.current += 0.6)}>⟲</button>}
        {view === "tp" && <button aria-label="Turn right" onClick={() => (shared.yaw.current -= 0.6)}>⟳</button>}
        {view === "tp" && <button aria-label="Tilt" onClick={() => (shared.pitch.current = shared.pitch.current > 1 ? 0.35 : shared.pitch.current + 0.4)}>Tilt</button>}
        {room
          ? <button className="atlas-leave" onClick={() => goRoom(null)}>↩ Leave room</button>
          : <button onClick={() => { shared.target.current = new THREE.Vector3(0, 0, 13); setPick(null); }}>Plaza</button>}
        <a href={`${ROOT}/work/`}><span className="atlas-long">Read as text</span><span className="atlas-short">As text</span></a>
      </div>

      <div className="world-help">
        {view === "fpv"
          ? (touch ? "Left thumb to walk · drag to look · tap to open"
                   : locked ? "W A S D to walk · Shift to run · Space to hop · F to throw a plane · click to open · Esc to let go"
                            : "Click to look around · V to fly out")
          : (touch ? "Tap to walk or open · drag to turn and tilt"
                   : "Click to walk or open · drag to turn and tilt · W A S D · Q E R F · scroll to rise · V to walk in")}
      </div>

      {view === "fpv" && (
        <>
          <div className={`fpv-cross${aim ? " is-on" : ""}`} aria-hidden="true" />
          {aim && <div className="fpv-hint">{aim}<span>{touch ? "tap it to open" : "click to open"}</span></div>}
          {touch && <Joystick shared={shared} />}
        </>
      )}

      {fold && (
        <div className={`fold is-${fold.phase}`} aria-hidden="true">
          <i /><i /><b>{fold.title}</b>
        </div>
      )}

      {pick && <Panel w={w} pick={pick} onPick={onPick} onClose={() => setPick(null)} />}
    </div>
  );
}
