import type { Metadata } from "next";
import Link from "next/link";
import { world } from "@/lib/data";
import { ICON, PEN } from "@/components/world/atlas/model";
import { InWorld, PaperPlane, PersonLd } from "@/components/pages/bits";
import Explorer from "@/components/pages/Explorer";

export const metadata: Metadata = {
  title: "Skills and work",
  description:
    "Mayank Kumar Gupta, engineering leader: 94 skills, 84 projects across document AI, conversational AI, " +
    "search, SaaS, crawling, automation and platform work, 19 stories, and the timeline from 2019 to now.",
  alternates: { canonical: "/work/" },
  openGraph: { title: "Skills and work — Mayank Kumar Gupta", url: "/work/",
    description: "94 skills, 84 projects and 19 stories, searchable and grouped by domain, with the timeline from 2019 to now." },
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const yearOf = (d: string) => (/present/i.test(d) ? new Date().getFullYear() : +d.trim().split(" ").pop()!);

export default function Work() {
  const w = world();
  const roles = [...w.roles].reverse();
  const dated = w.projects.filter((p) => p.first);
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
            <a href="#explore">⌕ Search everything</a>
            <InWorld p="about" label="Walk the world instead" />
            <a href="#plane">✈ Send me a paper plane</a>
          </div>
          <dl className="pg-stats">
            <div><dt>Projects</dt><dd>{w.projects.length}</dd></div>
            <div><dt>Skills</dt><dd>{w.skills.length}</dd></div>
            <div><dt>Stories</dt><dd>{w.stories.length}</dd></div>
            <div><dt>Since</dt><dd>2019</dd></div>
          </dl>
        </div>
      </section>

      <section className="pg-band">
        <h2>Timeline</h2>
        <ol className="pg-timeline">
          {roles.map((r, ri) => {
            const [a, b] = r.dates.split("–").map((x) => x.trim());
            const y0 = yearOf(a), y1 = yearOf(b);
            const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
            return (
              <li key={r.id}>
                <span className="pg-when">{r.dates}</span>
                <b>{r.title}</b> · {r.employer}
                {/* year steps: the projects that began in each year of this role */}
                <div className="pg-steps">
                  {years.map((y) => {
                    const began = dated.filter((p) => {
                      const py = +p.first!.slice(0, 4);
                      const pm = +p.first!.slice(5, 7);
                      const startM = MONTHS.indexOf(a.slice(0, 3).toLowerCase()) + 1;
                      // the first role also collects anything that began before it
                      if (ri === 0 && py < y0) return y === y0;
                      if (py !== y) return false;
                      if (y === y0 && pm < startM && ri > 0) return false;
                      if (y === y1 && ri < roles.length - 1) {
                        const endM = MONTHS.indexOf(b.slice(0, 3).toLowerCase()) + 1;
                        if (pm >= endM) return false;
                      }
                      return true;
                    });
                    if (!began.length) return null;
                    return (
                      <div key={y} className="pg-step">
                        <span className="pg-step-year">{y}</span>
                        <div className="pg-chips">
                          {began.map((p) => (
                            <Link key={p.slug} href={`/work/${p.slug}/`} className="pg-chip" style={{ ["--pen" as any]: PEN[p.domain] }}>
                              <img src={ICON(`project-${p.slug}`)} alt="" width={20} height={20} loading="lazy" />{p.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <Explorer w={w} />

      <div id="plane"><PaperPlane w={w} /></div>
    </main>
  );
}
