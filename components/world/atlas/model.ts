/* The world's dataset, exported from the Present build by
   relaunch/scripts/export_world.py. Positions are decided there, so the
   scene only draws. */

export type Project = {
  slug: string; label: string; line: string; domain: string; kind: string;
  case: boolean; first: string | null; last: string | null;
  mine: number; share: number; skills: string[]; stories: string[];
  diagrams: number; x: number; z: number; span: number; mid: string | null;
};
export type Skill = {
  slug: string; name: string; group: string; icon: string; family: string;
  strength: number; commits: number; summary: string;
  projects: string[]; links: string[];
};
export type Story = {
  id: string; title: string; project: string; period: string;
  situation: string; task: string; action: string; result: string; reflection: string;
};
export type Claim = { id: string; text: string; project: string; period: string };
export type Role = {
  id: string; title: string; employer: string; dates: string; intro: string;
  r_start: number; r_end: number;
};
export type WorldData = {
  built_at: string; now: string; oldest: string;
  rings: { year: number; r: number }[];
  plaza: number; rim: number;
  profile: { name: string; headline: string; summary: string };
  roles: Role[]; bullets: string[];
  domains: { id: string; label: string; count: number }[];
  districts: string[];
  projects: Project[]; skills: Skill[]; stories: Story[]; claims: Claim[];
};
export type ProjectDetail = {
  slug: string;
  sections: { title: string; paragraphs: string[] }[];
  diagrams: { title: string; mermaid: string }[];
  keywords: string[];
};

/** What the visitor has opened. */
export type Pick =
  | { kind: "project"; slug: string }
  | { kind: "skill"; slug: string }
  | { kind: "story"; id: string }
  | { kind: "about" }
  | { kind: "district"; id: string };

export const ROOT = "/portfolio";
export const ICON = (name: string) => `${ROOT}/world/icons/${name}.webp`;

/* the seven pens, one per kind of problem */
export const PEN: Record<string, string> = {
  "document-ai": "#5a62e8", "conversational-ai": "#12a98a", "search-commerce": "#e0557f",
  "product-saas": "#d8871a", "data-crawling": "#2b92d8", automation: "#9a56c7",
  "platform-internal": "#6b953a",
};
export const FILL: Record<string, string> = {
  "document-ai": "#dcdefb", "conversational-ai": "#cdf0e6", "search-commerce": "#fbd9e3",
  "product-saas": "#fbe6c6", "data-crawling": "#d2e9fa", automation: "#ecd9f7",
  "platform-internal": "#dfecc9",
};
/* skills are coloured by family, from a set that does not reuse the pens,
   so a skill stone never reads as belonging to a district */
export const FAMILY_INK: Record<string, string> = {
  ai: "#9470cd", leadership: "#c35f92", architecture: "#009bb4", cloud: "#398ad6",
  commercial: "#c26e12", domains: "#6f7dd9", backend: "#00a071",
};

export const KIND: Record<string, string> = {
  own: "Our own product", client: "Built for a client", internal: "Inside the company",
};

/* the plaza's edge is now, the rim is the oldest work */
export function dateAt(r: number, w: WorldData): string {
  if (r < w.plaza) return "Now";
  if (r > w.rim + 2) return "Before the record";
  const now = Date.parse(w.now), old = Date.parse(w.oldest);
  const t = now - ((r - w.plaza) / (w.rim - w.plaza)) * (now - old);
  const d = new Date(t);
  return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
}

/** Which district a ground position falls in, by its angle. */
export function districtAt(x: number, z: number, w: WorldData): string | null {
  const r = Math.hypot(x, z);
  if (r < w.plaza - 2) return null;
  const n = w.districts.length;
  const sector = (Math.PI * 2) / n;
  let a = Math.atan2(z, x) + Math.PI / 2;
  a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const i = Math.floor(a / sector);
  const f = a / sector - i;
  return f < 0.06 || f > 0.94 ? null : w.districts[i];
}

/** The middle of a district's wedge at a given radius. */
export function districtSpot(i: number, n: number, r: number): [number, number] {
  const sector = (Math.PI * 2) / n;
  const a = (i + 0.5) * sector - Math.PI / 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/** Where the skill stones stand: a double ring around the plaza, grouped by
 *  family, with a gap between groups. */
export function skillSpots(skills: Skill[]): Record<string, [number, number]> {
  const order = [...skills].sort((a, b) =>
    a.group === b.group ? b.strength - a.strength || a.name.localeCompare(b.name)
                        : a.group.localeCompare(b.group));
  const groups = new Set(order.map((s) => s.group)).size;
  const slots = order.length + groups * 2;
  const out: Record<string, [number, number]> = {};
  let i = 0, prev = "";
  for (const s of order) {
    if (prev && s.group !== prev) i += 2;
    prev = s.group;
    // start just past the entrance avenue, which runs north
    const a = (i / slots) * Math.PI * 2 - Math.PI / 2 + 0.16;
    const r = i % 2 ? 24.5 : 20.5;
    out[s.slug] = [+(Math.cos(a) * r).toFixed(2), +(Math.sin(a) * r).toFixed(2)];
    i++;
  }
  return out;
}

/** Plinth height from the share of the activity that was mine. */
export const plinth = (p: Project) => 0.6 + Math.sqrt(p.mine / 11400) * 9;

export const yearOf = (iso: string | null) => (iso ? iso.slice(0, 4) : "");
export const span = (p: Project) =>
  p.first ? `${yearOf(p.first)}${yearOf(p.last) !== yearOf(p.first) ? "–" + yearOf(p.last) : ""}` : "Undated";
export const num = (n: number) => n.toLocaleString("en-GB");
