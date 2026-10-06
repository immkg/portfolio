import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { world } from "@/lib/data";
import { ICON, FAMILY_INK } from "@/components/world/atlas/model";
import { InWorld, PaperPlane, ProjectTile, SkillChip, StoryBlock } from "@/components/pages/bits";

export const dynamicParams = false;
export function generateStaticParams() {
  return world().skills.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = world().skills.find((x) => x.slug === slug);
  if (!s) return {};
  return {
    title: `${s.name} · ${s.group}`,
    description: s.line || `${s.name}: where Mayank Kumar Gupta used it, across ${s.projects.length} projects.`,
    alternates: { canonical: `/skills/${slug}/` },
  };
}

export default async function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = world();
  const s = w.skills.find((x) => x.slug === slug);
  if (!s) notFound();
  const projects = s.projects.map((k) => w.projects.find((p) => p.slug === k)).filter(Boolean) as typeof w.projects;
  const byName = Object.fromEntries(w.skills.map((x) => [x.name.toLowerCase(), x]));
  // stories from the projects that used it: how the skill showed up in practice
  const stories = w.stories.filter((x) => s.projects.includes(x.project));
  const links = s.links.map((n) => byName[n.toLowerCase()]).filter(Boolean);
  return (
    <main className="pg" style={{ ["--pen" as any]: FAMILY_INK[s.family] }}>
      <nav className="pg-crumbs"><Link href="/work/">Skills and work</Link> / {s.group}</nav>
      <section className="pg-hero is-item">
        <img src={ICON(s.icon)} alt="" width={140} height={140} />
        <div>
          <div className="pg-kicker">{s.group}</div>
          <h1>{s.name}</h1>
          {s.line && <p className="pg-lede">{s.line}</p>}
          <InWorld p={`skill:${slug}`} label="See its threads in the world" />
        </div>
      </section>
      {projects.length > 0 && (
        <section className="pg-band"><h2>Used on</h2>
          <div className="pg-tiles">{projects.map((p) => <ProjectTile key={p.slug} p={p} />)}</div>
        </section>
      )}
      {stories.length > 0 && (
        <section className="pg-band"><h2>Stories where it mattered</h2>
          {stories.map((x) => <StoryBlock key={x.id} s={x} w={w} />)}
        </section>
      )}
      {links.length > 0 && (
        <section className="pg-band"><h2>Goes with</h2>
          <div className="pg-chips">{links.map((x) => <SkillChip key={x.slug} s={x} />)}</div>
        </section>
      )}
      <PaperPlane w={w} />
    </main>
  );
}
