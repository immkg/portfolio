import type { Metadata } from "next";
import CaseList from "@/components/CaseList";
import Legend from "@/components/Legend";
import { constellation, DOMAIN } from "@/lib/data";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Nine projects written up — document AI, conversational AI, search, hospitality " +
    "and the internal platform — out of 77 on the record.",
};

export default function Work() {
  const c = constellation();
  const rest = c.nodes
    .filter((n) => !n.case)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>Work</h1>
          <p className="lede">
            Nine projects are written up. They are the ones where I can say
            something specific about what was decided and what changed.
          </p>
          <div style={{ marginTop: "1.8rem" }}>
            <CaseList />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>The other {rest.length}</h2>
          <p className="lede">
            Counted in the numbers, not written up. Mostly smaller engagements and
            internal systems.
          </p>
          <div style={{ marginTop: "1.5rem" }}>
            <Legend />
          </div>
          <div className="rest" style={{ marginTop: "1.5rem" }}>
            {rest.map((n) => (
              <span key={n.slug} data-domain={n.domain}>
                <span style={{ color: "var(--pen)" }}>— </span>
                {n.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
