import Link from "next/link";
import type { WorldData, Project, Skill, Story } from "@/components/world/atlas/model";
import { ICON, PEN, FILL, FAMILY_INK, span } from "@/components/world/atlas/model";

export const SITE = "https://immkg.github.io/portfolio";

/** A link that opens the world on this exact thing. */
export function InWorld({ p, label = "View in the world" }: { p: string; label?: string }) {
  return (
    <a className="pg-world" href={`/portfolio/?p=${p}`}>
      <span aria-hidden="true">◈</span> {label}
    </a>
  );
}

export function Pen({ domain, children }: { domain: string; children: React.ReactNode }) {
  return <span style={{ ["--pen" as any]: PEN[domain], ["--fill" as any]: FILL[domain] }}>{children}</span>;
}

export function ProjectTile({ p }: { p: Project }) {
  return (
    <article className="pg-tile" style={{ ["--pen" as any]: PEN[p.domain], ["--fill" as any]: FILL[p.domain] }}>
      <img src={ICON(`project-${p.slug}`)} alt="" width={56} height={56} loading="lazy" />
      <div>
        <h3><Link href={`/work/${p.slug}/`}>{p.label}</Link></h3>
        <div className="pg-when">{span(p)}</div>
        <p>{p.line}</p>
        <div className="pg-tile-links">
          <Link href={`/work/${p.slug}/`}>Read</Link>
          <InWorld p={`project:${p.slug}`} label="In the world" />
        </div>
      </div>
    </article>
  );
}

export function SkillChip({ s }: { s: Skill }) {
  return (
    <Link className="pg-chip" href={`/skills/${s.slug}/`} style={{ ["--pen" as any]: FAMILY_INK[s.family] }}>
      <img src={ICON(s.icon)} alt="" width={20} height={20} loading="lazy" />{s.name}
    </Link>
  );
}

export function StoryBlock({ s, w }: { s: Story; w: WorldData }) {
  const p = w.projects.find((x) => x.slug === s.project);
  return (
    <article className="pg-story" id={s.id} style={{ ["--pen" as any]: p ? PEN[p.domain] : "#1b2437" }}>
      <header>
        <img src={ICON(`story-${s.id}`)} alt="" width={48} height={48} loading="lazy" />
        <div>
          <div className="pg-when">{s.period}{p ? ` · ${p.label}` : ""}</div>
          <h3>{s.title}</h3>
        </div>
      </header>
      <dl>
        {([["Situation", s.s], ["Task", s.t], ["Action", s.a], ["Result", s.r]] as const)
          .filter(([, x]) => x).map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}
      </dl>
      <InWorld p={`story:${s.id}`} />
    </article>
  );
}

/** The paper-plane strip: the easy ways to reach me, on every page. */
export function PaperPlane({ w }: { w: WorldData }) {
  const c = w.about?.contact;
  if (!c) return null;
  const tel = c.phone?.replace(/\s+/g, "");
  return (
    <section className="pg-plane">
      <div>
        <h2><span aria-hidden="true">✈</span> Throw me a paper plane</h2>
        <p>Write a line; I&rsquo;ll find it in my inbox.</p>
      </div>
      <div className="pg-plane-actions">
        <a className="is-main" href={`mailto:${c.email}?subject=${encodeURIComponent("A paper plane from your portfolio")}`}>✉ Email</a>
        <a className="is-main" href={c.resume} download>▤ Résumé</a>
        {tel && <a href={`tel:${tel}`}>☎ Call</a>}
        {c.whatsapp && <a href={c.whatsapp} rel="noopener">✆ WhatsApp</a>}
        <span className="pg-plane-small">
          <a href={c.linkedin} rel="noopener">LinkedIn</a> · <a href={c.github} rel="noopener">GitHub</a> · <a href="/portfolio/?p=reach">QR in the world</a>
        </span>
      </div>
    </section>
  );
}

/** Structured data, so search engines read the page as a person. */
export function PersonLd({ w }: { w: WorldData }) {
  const c = w.about?.contact;
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: w.profile.name,
    jobTitle: w.profile.headline.split("|")[0].trim(),
    description: w.profile.line,
    url: `${SITE}/`,
    image: `${SITE}/world/icons/hero-mayank.webp`,
    email: c ? `mailto:${c.email}` : undefined,
    telephone: c?.phone,
    address: c?.city ? { "@type": "PostalAddress", addressLocality: c.city, addressCountry: "IN" } : undefined,
    worksFor: { "@type": "Organization", name: "Smarter.Codes" },
    alumniOf: { "@type": "CollegeOrUniversity", name: "Indian Institute of Technology, Palakkad" },
    sameAs: [c?.linkedin, c?.github].filter(Boolean),
    knowsAbout: w.skills.map((s) => s.name),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
