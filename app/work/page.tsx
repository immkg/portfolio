import type { Metadata } from "next";
import Dimension from "@/components/Dimension";
import WorkRow from "@/components/WorkRow";
import { constellation, DOMAIN, num } from "@/lib/data";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Every project on the record: 77 of them across document AI, conversational AI, " +
    "search, crawling, automation and platform work, with dates, team size and my share.",
};

export default function Work() {
  const c = constellation();
  const byDomain = c.bands
    .map((d) => ({ domain: d, nodes: c.nodes.filter((n) => n.domain === d).sort((a, b) => b.mine - a.mine) }))
    .filter((g) => g.nodes.length);

  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>Work</h1>
          <p className="lede">
            Every project the record holds, grouped by the kind of problem it was.
            The bar on the right is my share of the activity on it — not a rating,
            just how much of the traffic was mine. Nine have a case study behind
            them, marked in amber.
          </p>
          <div style={{ maxWidth: "34rem", marginTop: "2rem" }}>
            <Dimension from={c.span.first} to={c.span.last} />
          </div>
        </div>
      </section>

      {byDomain.map((g) => (
        <section className="band" key={g.domain} id={g.domain}>
          <div className="sheet datum">
            <h2>{DOMAIN[g.domain]}</h2>
            <p className="plot-row-meta">
              {g.nodes.length} projects, {num(g.nodes.reduce((t, n) => t + n.mine, 0))} events mine
            </p>
            <div className="plot-rows" style={{ marginTop: "1.5rem" }}>
              {g.nodes.map((n) => (
                <WorkRow key={n.slug} n={n} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
