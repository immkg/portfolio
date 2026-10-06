import type { Metadata } from "next";
import Link from "next/link";
import { world } from "@/lib/data";
import { ICON, PEN, FAMILY_INK } from "@/components/world/atlas/model";
import { InWorld, PaperPlane, PersonLd, ProjectTile, SkillChip } from "@/components/pages/bits";

export const metadata: Metadata = {
  title: "Skills and work",
  description:
    "Mayank Kumar Gupta, engineering leader: 94 skills, 84 projects across document AI, conversational AI, " +
    "search, SaaS, crawling, automation and platform work, and the timeline from 2019 to now.",
  alternates: { canonical: "/work/" },
};

export default function Work() {
  const w = world();
  const groups = [...new Set(w.skills.map((s) => s.group))];
  const years = w.rings.map((r) => r.year);
  return (
    <main className="pg">
      <PersonLd w={w} />
      <section className="pg-hero">
        <img src={ICON("hero-mayank")} alt="" width={280} height={280} />
        <div>
          <div className="pg-kicker">{w.profile.headline}</div>
          <h1>{w.profile.name}</h1>
          <p className="pg-lede">{w.profile.line}</p>
          <div className="pg-hero-links">
            <InWorld p="about" label="Walk the world instead" />
            <a href="#plane">✈ Send me a paper plane</a>
          </div>
          <dl className="pg-stats">
            <div><dt>Projects</dt><dd>{w.projects.length}</dd></div>
            <div><dt>Skills</dt><dd>{w.skills.length}</dd></div>
            <div><dt>Domains</dt><dd>{w.domains.length}</dd></div>
            <div><dt>Years</dt><dd>{years[0]}–now</dd></div>
          </dl>
        </div>
      </section>

      <section className="pg-band">
        <h2>Timeline</h2>
        <ol className="pg-timeline">
          {[...w.roles].reverse().map((r) => (
            <li key={r.id}>
              <span className="pg-when">{r.dates}</span>
              <b>{r.title}</b> · {r.employer}
              <InWorld p="about" label="See the road of years" />
            </li>
          ))}
        </ol>
      </section>

      <section className="pg-band">
        <h2>Skills</h2>
        <div className="pg-skill-groups">
          {groups.map((g) => {
            const list = w.skills.filter((s) => s.group === g);
            return (
              <div key={g} className="pg-skill-group" style={{ ["--pen" as any]: FAMILY_INK[list[0].family] }}>
                <h3><img src={ICON(`skill-${list[0].family}`)} alt="" width={28} height={28} />{g}</h3>
                <div className="pg-chips">{list.map((s) => <SkillChip key={s.slug} s={s} />)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pg-band">
        <h2>Projects by domain</h2>
        {w.domains.map((d) => {
          const list = w.projects.filter((p) => p.domain === d.id)
            .sort((a, b) => (b.tier - a.tier) || (b.last ?? "").localeCompare(a.last ?? ""));
          return (
            <div key={d.id} className="pg-domain" style={{ ["--pen" as any]: PEN[d.id] }}>
              <h3 id={d.id}>
                <img src={ICON(`domain-${d.id}`)} alt="" width={32} height={32} />{d.label}
                <span>{list.length}</span>
                <InWorld p={`district:${d.id}`} label="Walk this district" />
              </h3>
              <div className="pg-tiles">{list.map((p) => <ProjectTile key={p.slug} p={p} />)}</div>
            </div>
          );
        })}
      </section>

      <section className="pg-band">
        <h2>Stories</h2>
        <div className="pg-story-index">
          {w.stories.map((s) => {
            const p = w.projects.find((x) => x.slug === s.project);
            return (
              <Link key={s.id} href={`/work/${s.project}/#${s.id}`} className="pg-story-link"
                    style={{ ["--pen" as any]: p ? PEN[p.domain] : "#1b2437" }}>
                <img src={ICON(`story-${s.id}`)} alt="" width={40} height={40} loading="lazy" />
                <span><b>{s.title}</b><small>{s.period}{p ? ` · ${p.label}` : ""}</small></span>
              </Link>
            );
          })}
        </div>
      </section>

      <div id="plane"><PaperPlane w={w} /></div>
    </main>
  );
}
