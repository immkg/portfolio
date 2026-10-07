import { art, card, OG_SIZE, OG_TYPE } from "@/lib/og";
import { world } from "@/lib/data";
import { FAMILY_INK } from "@/components/world/atlas/model";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "A skill of Mayank Kumar Gupta";

export function generateStaticParams() {
  return world().skills.map((s) => ({ slug: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = world();
  const s = w.skills.find((x) => x.slug === slug)!;
  const n = s.projects.length;
  const pen = FAMILY_INK[s.family] ?? "#5a62e8";
  return card({
    kicker: `SKILL · ${s.group.toUpperCase()}`,
    title: s.name,
    line: s.line || `Where and how I used ${s.name}.`,
    facts: [`used on ${n} project${n === 1 ? "" : "s"}`, ["", "working", "strong", "deep"][s.strength] ?? ""].filter(Boolean),
    pen, tint: "#f1f3fb",
    picture: await art(`world/icons/${s.icon}.webp`, 360),
  });
}
