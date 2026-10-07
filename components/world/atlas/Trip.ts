import type { WorldData } from "./model";

/* How the avatar gets somewhere. Short hops go straight; longer ones keep to
   the roads (out along a district road, round the ring road, in along the
   other); the longest are flown on a paper plane, so nobody waits to cross
   the map and nobody sees a teleport. */

export type Trip = { pts: [number, number][]; len: number; fly: boolean };

const STRAIGHT = 22;     // shorter than this, just walk there
const FLY = 85;          // a road route longer than this is flown instead

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function roadAngles(w: WorldData) {
  const n = w.districts.length, s = (Math.PI * 2) / n;
  return w.districts.map((_, i) => (i + 0.5) * s - Math.PI / 2);
}

export const ringOf = (w: WorldData) => w.plaza - 2.6;

function nearestRoad(angles: number[], x: number, z: number) {
  const t = Math.atan2(z, x);
  let best = 0, d = Infinity;
  angles.forEach((a, i) => { const e = Math.abs(wrap(t - a)); if (e < d) { d = e; best = i; } });
  return best;
}

/** The point on road i closest to (x, z). Inside the plaza the spokes count
 *  as road, so crossing it keeps to them rather than wading through the
 *  skill stones. */
const SPOKE = 7;
function footOn(w: WorldData, a: number, x: number, z: number): [number, number] {
  const r = Math.max(SPOKE, Math.min(w.rim + 8, x * Math.cos(a) + z * Math.sin(a)));
  return [Math.cos(a) * r, Math.sin(a) * r];
}

function arc(r: number, a0: number, a1: number): [number, number][] {
  const d = wrap(a1 - a0), k = Math.max(1, Math.ceil(Math.abs(d) / 0.12));
  return Array.from({ length: k + 1 }, (_, j) => {
    const a = a0 + (d * j) / k;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

const length = (pts: [number, number][]) =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/** Drop points that sit on top of each other, so the walker never stalls on one. */
function tidy(pts: [number, number][]) {
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.5);
}

export function planTrip(w: WorldData, from: [number, number], to: [number, number]): Trip {
  const direct = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const straight: Trip = { pts: [from, to], len: direct, fly: false };
  if (direct < STRAIGHT) return straight;

  const A = roadAngles(w), R = ringOf(w);
  const i = nearestRoad(A, ...from), j = nearestRoad(A, ...to);
  const ring = (k: number): [number, number] => [Math.cos(A[k]) * R, Math.sin(A[k]) * R];
  let pts: [number, number][];
  if (i === j) pts = [from, footOn(w, A[i], ...from), footOn(w, A[i], ...to), to];
  // along my road to the ring road, round it, and along theirs
  else pts = [from, footOn(w, A[i], ...from), ring(i), ...arc(R, A[i], A[j]), ring(j), footOn(w, A[j], ...to), to];
  pts = tidy(pts);
  const len = length(pts);
  // a road route is worth walking only if it is not a huge detour or a marathon
  if (len > FLY) return { pts: [from, to], len: direct, fly: true };
  return { pts, len, fly: false };
}
