import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { world } from "@/lib/data";
import { ICON, PEN, FILL, KIND, span } from "@/components/world/atlas/model";
import { InWorld, PaperPlane, SkillChip, StoryBlock } from "@/components/pages/bits";

export const dynamicParams = false;
export function generateStaticParams() {
  return world().projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = world().projects.find((x) => x.slug === slug);
  if (!p) return {};
  const dom = world().domains.find((d) => d.id === p.domain)?.label;
  return {
    title: `${p.label} · ${dom}`,
    description: [p.line, ...p.did].join(" ").slice(0, 300),
    alternates: { canonical: `/work/${slug}/` },
    openGraph: { images: [{ url: `/world/icons/project-${slug}.webp` }] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = world();
  const p = w.projects.find((x) => x.slug === slug);
  if (!p) notFound();
  const dom = w.domains.find((d) => d.id === p.domain);
  const byName = Object.fromEntries(w.skills.map((s) => [s.name.toLowerCase(), s]));
  const skills = p.skills.map((n) => byName[n.toLowerCase()]).filter(Boolean);
  const stories = w.stories.filter((s) => s.project === slug);
  const road = w.projects.filter((x) => x.domain === p.domain).sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  const i = road.findIndex((x) => x.slug === slug);
  const newer = road[i - 1], older = road[i + 1];

  return (
    <main className="pg" style={{ ["--pen" as any]: PEN[p.domain], ["--fill" as any]: FILL[p.domain] }}>
      <nav className="pg-crumbs"><Link href="/work/">Skills and work</Link> / <Link href={`/work/#${p.domain}`}>{dom?.label}</Link></nav>
      <section className="pg-hero is-item">
        <img src={ICON(`project-${slug}`)} alt="" width={160} height={160} />
        <div>
          <div className="pg-kicker">{dom?.label} · {KIND[p.kind] ?? p.kind} · {span(p)}</div>
          <h1>{p.label}</h1>
          <p className="pg-lede">{p.line}</p>
          <InWorld p={`project:${slug}`} />
        </div>
      </section>

      {p.did.length > 0 && (
        <section className="pg-band"><h2>What I did</h2>
          <ul className="pg-did">{p.did.map((d, k) => <li key={k}>{d}</li>)}</ul>
        </section>
      )}
      {skills.length > 0 && (
        <section className="pg-band"><h2>Skills</h2>
          <div className="pg-chips">{skills.map((s) => <SkillChip key={s.slug} s={s} />)}</div>
        </section>
      )}
      {stories.length > 0 && (
        <section className="pg-band"><h2>Stories</h2>
          {stories.map((s) => <StoryBlock key={s.id} s={s} w={w} />)}
        </section>
      )}

      <nav className="pg-road" aria-label={`Along the ${dom?.label} road`}>
        {newer ? <Link href={`/work/${newer.slug}/`}>◂ Newer: {newer.label}</Link> : <span />}
        {older ? <Link href={`/work/${older.slug}/`}>Older: {older.label} ▸</Link> : <span />}
      </nav>
      <PaperPlane w={w} />
    </main>
  );
}
