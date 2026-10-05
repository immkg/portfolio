import type { Metadata } from "next";
import Link from "next/link";
import Dimension from "@/components/Dimension";
import { journey, constellation, DOMAIN, ym, num } from "@/lib/data";

export const metadata: Metadata = {
  title: "Journey",
  description:
    "From a mechanical engineering degree and three research labs to running the " +
    "engineering function of an AI product company — in four eras, with the work each one produced.",
};

export default function Journey() {
  const eras = journey();
  const c = constellation();

  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>Journey</h1>
          <p className="lede">
            I did not set out to write software. I set out to be a mechanical
            engineer, and spent three summers in research labs on composites,
            additive manufacturing and a numerical model of nitric-oxide discharge.
            What carried over was the habit of drawing the thing before building it.
          </p>
          <div style={{ maxWidth: "34rem", marginTop: "2rem" }}>
            <Dimension from={c.span.first} to={c.span.last} />
          </div>
        </div>
      </section>

      {eras.map((e, i) => {
        const start = e.start;
        const end = e.end ?? "2026-12";
        const inEra = c.nodes
          .filter((n) => n.last >= start && n.first <= end)
          .sort((a, b) => b.mine - a.mine);
        return (
          <section className="band" key={e.id} id={e.id}>
            <div className="sheet datum">
              <p className="plot-row-meta">
                {ym(e.start)} – {ym(e.end)}
              </p>
              <h2 style={{ marginTop: "0.4rem" }}>{e.title}</h2>
              <p className="plot-row-meta">{e.org}</p>
              <div className="note" style={{ margin: "1.5rem 0" }}>
                <p>{e.note}</p>
              </div>
              {e.stack && e.stack.length > 0 && (
                <ul className="stack">
                  {e.stack.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              {i > 0 && inEra.length > 0 && (
                <>
                  <p className="plot-row-meta" style={{ marginTop: "2rem" }}>
                    {inEra.length} projects running in this period, {num(inEra.reduce((t, n) => t + n.mine, 0))} events mine
                  </p>
                  <div className="plot-rows">
                    {inEra.slice(0, 8).map((n) => (
                      <div className="plot-row" key={n.slug} style={{ gridTemplateColumns: "minmax(0,1fr) 9rem 5rem" }}>
                        <span className="plot-row-label">
                          {n.case ? <Link href={`/work/${n.slug}/`}>{n.label}</Link> : n.label}
                        </span>
                        <span className="plot-row-meta">{DOMAIN[n.domain]}</span>
                        <span className="plot-row-meta">{num(n.mine)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
