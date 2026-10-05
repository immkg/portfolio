import Link from "next/link";
import Marker from "@/components/Marker";
import Plot from "@/components/Plot";
import { constellation, stats, journey, DOMAIN, num } from "@/lib/data";

export default function Home() {
  const c = constellation();
  const s = stats();
  const eras = journey();
  const cases = c.nodes.filter((n) => n.case).sort((a, b) => b.mine - a.mine);

  return (
    <main>
      {/* ---- the plot: the opening is the work itself, counted ---- */}
      <section className="band">
        <div className="sheet datum">
          <h1>Seven years of engineering, plotted.</h1>
          <p className="lede">
            I ran the engineering function of a SaaS and AI product company — the
            architecture, the delivery practice, the people and the cloud estate.
            This is the record of it: {num(c.totals.projects)} projects, drawn from
            the tickets, commits, reviews and diagrams they actually produced.
          </p>
          <Plot />
          <div className="readout" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", marginTop: "2.5rem" }}>
            {s.counts.slice(0, 4).map((k) => (
              <div className="readout-cell" key={k.label}>
                <div className="readout-value">{num(k.value)}</div>
                <div className="readout-label">{k.label}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "2rem" }}>
            <Link href="/work/">Read the work</Link> or{" "}
            <Link href="/journey/">follow the journey</Link>.
          </p>
        </div>
      </section>

      {/* ---- what the record holds, by band ---- */}
      <section className="band">
        <div className="sheet datum">
          <h2>What the work was</h2>
          <p className="lede">
            Seven bands of problem. The shape beside each is the marker it carries
            in the plot.
          </p>
          <div className="plot-rows" style={{ marginTop: "2rem" }}>
            {s.by_domain.map((d) => (
              <div className="plot-row" key={d.domain} style={{ gridTemplateColumns: "1.6rem minmax(0,1fr) 7rem 7rem" }}>
                <Marker domain={d.domain} />
                <span className="plot-row-label">{DOMAIN[d.domain]}</span>
                <span className="plot-row-meta">{d.projects} projects</span>
                <span className="plot-row-meta">{num(d.mine)} events mine</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- the nine with a written case behind them ---- */}
      <section className="band">
        <div className="sheet datum">
          <h2>The ones written up</h2>
          <p className="lede">
            Nine projects carry a case study: what it was, the architecture, what I
            argued for, and what changed. The rest of the {c.totals.projects} are in
            the <Link href="/work/">work index</Link> with their numbers.
          </p>
          <div className="plot-rows" style={{ marginTop: "2rem" }}>
            {cases.map((n) => (
              <Link className="plot-row" data-case key={n.slug} href={`/work/${n.slug}/`}>
                <Marker domain={n.domain} filled />
                <span className="plot-row-label">{n.label}</span>
                <span className="plot-row-meta">{DOMAIN[n.domain]}</span>
                <span className="plot-row-meta">
                  {n.first.slice(0, 4)}–{n.last.slice(0, 4)}
                </span>
                <span className="plot-row-meta">{n.people} people</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- the arc, in four lines ---- */}
      <section className="band">
        <div className="sheet datum">
          <h2>How it went</h2>
          <div className="plot-rows" style={{ marginTop: "2rem" }}>
            {eras.map((e) => (
              <div className="plot-row" key={e.id} style={{ gridTemplateColumns: "9rem minmax(0,1fr)" }}>
                <span className="plot-row-meta">
                  {e.start.slice(0, 4)}–{e.end ? e.end.slice(0, 4) : "now"}
                </span>
                <span>
                  <span className="plot-row-label">{e.title}</span>
                  <br />
                  <span className="plot-row-meta">{e.org}</span>
                </span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "2rem" }}>
            <Link href="/journey/">The longer version</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
