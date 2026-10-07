import { type WorldData, type Pick, plinth, districtSpot, skillSpots } from "./model";

/* Solid things in the world, as circles on the ground with a height. Built
   from the data, so a new project is solid without anyone listing it. A
   visitor slides around a circle unless their feet are above its top, in
   which case they can stand on it (a hop lands you on a low plinth). */

export type Collider = { x: number; z: number; r: number; h: number };

export function buildColliders(w: WorldData): Collider[] {
  const out: Collider[] = [];
  w.projects.forEach((p) => out.push({ x: p.x, z: p.z, r: p.tier === 3 ? 2.3 : 1.65, h: plinth(p) }));
  const spots = skillSpots(w.skills);
  w.skills.forEach((s) => {
    const p = spots[s.slug];
    if (p) out.push({ x: p[0], z: p[1], r: 0.75, h: 0.4 + s.strength * 0.4 });
  });
  const n = w.districts.length, sector = (Math.PI * 2) / n;
  w.districts.forEach((_, i) => {
    // the gate's pad and the arch's two posts
    const [gx, gz] = districtSpot(i, n, w.plaza + 2.5);
    out.push({ x: gx, z: gz, r: 2.1, h: 0.7 });
    const a = (i + 0.5) * sector - Math.PI / 2, r = w.plaza + 6.5;
    const tx = -Math.sin(a), tz = Math.cos(a);
    [-2.3, 2.3].forEach((o) => out.push({ x: Math.cos(a) * r + tx * o, z: Math.sin(a) * r + tz * o, r: 0.45, h: 4.2 }));
  });
  out.push({ x: 0, z: -4, r: 5.4, h: 0.6 });         // the pedestal at the centre
  out.push({ x: 6.2, z: 2.2, r: 0.45, h: 7 });        // the fingerpost
  out.push({ x: -5.5, z: 11.8, r: 1.5, h: 0.5 });     // the Ludo board
  return out;
}

/* how high a single step can climb: kerbs, gate pads and the centre's
   pedestal are walked onto; plinths and skill stones are walked round */
export const STEP = 0.75;

/** Height of whatever the feet can stand on here, given how high they are. */
export function groundAt(c: Collider[], x: number, z: number, feet: number) {
  let g = 0;
  for (const o of c) {
    if (o.h > g && o.h <= feet + STEP && (x - o.x) ** 2 + (z - o.z) ** 2 < o.r * o.r) g = o.h;
  }
  return g;
}

/** Push a position out of every circle it is inside and too low to stand on.
 *  The push carries a little sideways drift, so walking dead into the middle
 *  of something steers round it instead of stalling against it. */
export function slide(c: Collider[], p: { x: number; z: number }, feet: number, body = 0.6) {
  for (const o of c) {
    if (feet >= o.h - STEP) continue;
    const dx = p.x - o.x, dz = p.z - o.z, rr = o.r + body;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) {
      const d = Math.sqrt(d2), k = (rr - d) / d;
      p.x += dx * k - dz * k * 0.35; p.z += dz * k + dx * k * 0.35;
    }
  }
}

/* Things the crosshair can rest on, with a point to aim at. Aiming picks the
   one nearest the centre of view, so it works even when a sprite is thin. */
export type AimTarget = { x: number; y: number; z: number; pick: Pick; label: string; size: number };

export function buildTargets(w: WorldData): AimTarget[] {
  const out: AimTarget[] = [];
  const told: Record<string, number> = {};
  w.stories.forEach((s) => (told[s.project] = (told[s.project] ?? 0) + 1));
  w.projects.forEach((p) => {
    const n = told[p.slug];
    out.push({
      x: p.x, y: plinth(p) + 1.8, z: p.z, size: p.tier === 3 ? 3 : 2,
      pick: { kind: "project", slug: p.slug },
      label: p.label + (n ? ` · ${n} ${n === 1 ? "story" : "stories"} inside` : ""),
    });
  });
  const spots = skillSpots(w.skills);
  w.skills.forEach((s) => {
    const p = spots[s.slug];
    if (p) out.push({ x: p[0], y: 1.2 + s.strength * 0.4, z: p[1], size: 1, pick: { kind: "skill", slug: s.slug }, label: s.name });
  });
  const n = w.districts.length;
  w.districts.forEach((d, i) => {
    const [x, z] = districtSpot(i, n, w.plaza + 2.5);
    const label = w.domains.find((o) => o.id === d)?.label ?? d;
    out.push({ x, y: 3, z, size: 2.4, pick: { kind: "district", id: d }, label: `${label} district` });
  });
  out.push({ x: 0, y: 5, z: -4, size: 5, pick: { kind: "about" }, label: "More about me" });
  return out;
}
