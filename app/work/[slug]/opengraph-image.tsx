import { art, card, OG_SIZE, OG_TYPE } from "@/lib/og";
import { world } from "@/lib/data";
import { PEN, FILL, span } from "@/components/world/atlas/model";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "A project by Mayank Kumar Gupta";

export function generateStaticParams() {
  return world().projects.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = world();
  const p = w.projects.find((x) => x.slug === slug)!;
  const dom = w.domains.find((d) => d.id === p.domain)?.label ?? "";
  return card({
    kicker: `${dom.toUpperCase()} · ${span(p)}`,
    title: p.label,
    line: p.line,
    facts: p.skills.slice(0, 4),
    pen: PEN[p.domain], tint: FILL[p.domain],
    picture: await art(`world/icons/project-${slug}.webp`, 360),
  });
}
