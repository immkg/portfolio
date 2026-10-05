import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "public", "data");
const WORK = path.join(process.cwd(), "content", "work");

function read<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export type Node = {
  slug: string; label: string; domain: string; kind: string; tier: string;
  first: string; last: string; quarters: number; people: number;
  mine: number; share: number; events: number; diagrams: number; case: boolean; line: string;
  x: number; y: number; z: number; r: number;
  activity: { q: string; n: number }[];
};

export type Constellation = {
  built_at: string; bands: string[];
  span: { first: string; last: string };
  totals: { projects: number; mine: number };
  nodes: Node[]; edges: { a: number; b: number; w: number }[];
};

export type Case = {
  slug: string; label: string; line: string; domain: string; kind: string; tier: string;
  first: string; last: string; quarters: number; people: number; mine: number;
  sources: string[]; stack: string[];
  claims: { id: string; text: string; period: string; metric: string | null;
            skills: string[]; track: string; level_fit: string[] }[];
  stories: { id: string; title: string; period: string; skills: string[];
             situation: string; task: string; action: string;
             result: string; reflection: string }[];
  diagrams: { slug: string; title: string; mermaid: string }[];
};

export type Era = {
  id: string; title: string; org: string; start: string; end: string | null;
  kind: string; note: string; stack?: string[];
};

export type Stats = {
  headline: string[];
  counts: { label: string; value: number }[];
  by_domain: { domain: string; projects: number; mine: number }[];
  by_tier: Record<string, number>;
  span: { first: string; last: string };
};

export const constellation = () => read<Constellation>(path.join(DATA, "constellation.json"));
export const stats = () => read<Stats>(path.join(DATA, "stats.json"));
export const journey = () => read<Era[]>(path.join(DATA, "journey.json"));

export const caseSlugs = () =>
  fs.readdirSync(WORK).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

export const workCase = (slug: string) => read<Case>(path.join(WORK, `${slug}.json`));

/** Human labels for the seven domain bands. */
export const DOMAIN: Record<string, string> = {
  "document-ai": "Document AI",
  "conversational-ai": "Conversational AI",
  "search-commerce": "Search and commerce",
  "product-saas": "Product SaaS",
  "data-crawling": "Crawling and extraction",
  "automation": "Automation",
  "platform-internal": "Platform and internal",
};

/** Marker shape per band — domain is read by shape, never by hue. */
export const GLYPH: Record<string, string> = {
  "document-ai": "circle",
  "conversational-ai": "square",
  "search-commerce": "triangle",
  "product-saas": "diamond",
  "data-crawling": "cross",
  "automation": "chevron",
  "platform-internal": "bar",
};

export const KIND: Record<string, string> = {
  own: "Our own product",
  client: "Built for a client",
  internal: "Internal to the company",
};

export const year = (iso: string) => iso.slice(0, 4);
export const ym = (iso: string | null) => {
  if (!iso) return "now";
  const [y, m] = iso.split("-");
  return `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m]} ${y}`;
};
export const num = (n: number) => n.toLocaleString("en-GB");
