import type { Metadata } from "next";
import { world } from "@/lib/data";
import { span } from "@/components/world/atlas/model";

export const metadata: Metadata = {
  title: "Skills and work",
  description: "The world as plain text: skills, the timeline, and the projects by domain.",
};

export default function Work() {
  const w = world();
  const groups = [...new Set(w.skills.map((s) => s.group))];
  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>Skills and work</h1>
          <p className="lede">{w.profile.line}</p>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Timeline</h2>
          <div className="eras" style={{ marginTop: "1.2rem" }}>
            {w.roles.map((r) => (
              <div className="era" key={r.id}>
                <div className="era-when">{r.dates}</div>
                <div><div className="era-what">{r.title}</div><div className="era-org">{r.employer}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Skills</h2>
          {groups.map((g) => (
            <div key={g} style={{ marginTop: "1.2rem" }}>
              <h3 style={{ fontSize: "var(--step-0)", color: "var(--ink-3)" }}>{g}</h3>
              <p style={{ maxWidth: "none" }}>
                {w.skills.filter((s) => s.group === g).map((s) => s.name).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Projects by domain</h2>
          {w.domains.map((d) => (
            <div key={d.id} data-domain={d.id} style={{ marginTop: "1.4rem" }}>
              <h3 style={{ fontSize: "var(--step-1)" }}>{d.label}</h3>
              <div className="rest" style={{ marginTop: "0.5rem" }}>
                {w.projects
                  .filter((p) => p.domain === d.id)
                  .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""))
                  .map((p) => (
                    <span key={p.slug}>{p.label} <span style={{ color: "var(--ink-3)" }}>{span(p)}</span></span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
