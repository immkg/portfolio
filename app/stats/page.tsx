import type { Metadata } from "next";
import Marker from "@/components/Marker";
import { stats, constellation, DOMAIN, num } from "@/lib/data";

export const metadata: Metadata = {
  title: "Numbers",
  description:
    "The measured shape of seven years: projects, events, quarters, people, " +
    "diagrams and the split across problem domains. Counted from the record, rounded down.",
};

export default function Stats() {
  const s = stats();
  const c = constellation();
  const maxMine = Math.max(...s.by_domain.map((d) => d.mine));
  const busiest = [...c.nodes].sort((a, b) => b.mine - a.mine).slice(0, 12);

  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>Numbers</h1>
          <p className="lede">
            Counted from the record rather than remembered: every ticket, commit,
            review, comment and document that carries my name, across{" "}
            {s.span.first.slice(0, 4)} to {s.span.last.slice(0, 4)}. Rounded down
            where rounding was needed.
          </p>
          <div
            className="readout"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))", marginTop: "2.5rem" }}
          >
            {s.counts.map((k) => (
              <div className="readout-cell" key={k.label}>
                <div className="readout-value">{num(k.value)}</div>
                <div className="readout-label">{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>What the four headline claims are</h2>
          <div className="plot-rows" style={{ marginTop: "1.5rem" }}>
            {s.headline.map((h) => (
              <div className="plot-row" key={h} style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                <p style={{ margin: 0, maxWidth: "70ch" }}>{h}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Where the work went</h2>
          <div className="plot-rows" style={{ marginTop: "1.5rem" }}>
            {s.by_domain.map((d) => (
              <div className="plot-row" key={d.domain} style={{ gridTemplateColumns: "1.6rem minmax(0,1fr) 5rem 9rem" }}>
                <Marker domain={d.domain} />
                <span className="plot-row-label">{DOMAIN[d.domain]}</span>
                <span className="plot-row-meta">{d.projects} proj</span>
                <span className="plot-row-meta" title={`${num(d.mine)} events`}>
                  <span className="plot-row-bar">
                    <span style={{ width: `${Math.round((d.mine / maxMine) * 100)}%` }} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>The twelve I was deepest in</h2>
          <div className="plot-rows" style={{ marginTop: "1.5rem" }}>
            {busiest.map((n) => (
              <div className="plot-row" key={n.slug} style={{ gridTemplateColumns: "1.6rem minmax(0,1fr) 6rem 6rem" }}>
                <Marker domain={n.domain} filled={n.case} />
                <span className="plot-row-label">{n.label}</span>
                <span className="plot-row-meta">{n.quarters} quarters</span>
                <span className="plot-row-meta">{num(n.mine)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
