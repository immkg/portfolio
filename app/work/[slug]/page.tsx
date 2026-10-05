import type { Metadata } from "next";
import Link from "next/link";
import Marker from "@/components/Marker";
import { caseSlugs, workCase, DOMAIN, KIND, num } from "@/lib/data";

export function generateStaticParams() {
  return caseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const w = workCase(slug);
  const first = w.claims[0]?.text ?? w.stories[0]?.situation ?? "";
  return {
    title: w.label,
    description: `${DOMAIN[w.domain]}, ${w.first.slice(0, 4)}–${w.last.slice(0, 4)}. ${first}`.slice(0, 300),
    alternates: { canonical: `/work/${slug}/` },
  };
}

const STAR: [string, string][] = [
  ["situation", "The situation"],
  ["task", "What had to happen"],
  ["action", "What I did"],
  ["result", "What changed"],
  ["reflection", "What I took from it"],
];

export default async function CasePage({ params }) {
  const { slug } = await params;
  const w = workCase(slug);

  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <p className="plot-row-meta">
            <Link href="/work/">Work</Link> / {DOMAIN[w.domain]}
          </p>
          <h1 style={{ fontSize: "var(--step-3)", marginTop: "0.5rem" }}>
            <Marker domain={w.domain} filled size={18} /> {w.label}
          </h1>
          <p className="lede">{KIND[w.kind]}.</p>
          <div
            className="readout"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))", marginTop: "2rem" }}
          >
            <div className="readout-cell">
              <div className="readout-value">
                {w.first.slice(0, 4)}–{w.last.slice(0, 4)}
              </div>
              <div className="readout-label">on the record</div>
            </div>
            <div className="readout-cell">
              <div className="readout-value">{w.quarters}</div>
              <div className="readout-label">quarters active</div>
            </div>
            <div className="readout-cell">
              <div className="readout-value">{w.people}</div>
              <div className="readout-label">people on it</div>
            </div>
            <div className="readout-cell">
              <div className="readout-value">{num(w.mine)}</div>
              <div className="readout-label">events mine</div>
            </div>
          </div>
          {w.stack.length > 0 && (
            <ul className="stack" style={{ marginTop: "1.5rem" }}>
              {w.stack.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {w.claims.length > 0 && (
        <section className="band">
          <div className="sheet datum">
            <h2>What it came to</h2>
            <div className="plot-rows" style={{ marginTop: "1.5rem" }}>
              {w.claims.map((c) => (
                <div className="plot-row" key={c.id} style={{ gridTemplateColumns: "minmax(0,1fr) 10rem" }}>
                  <p style={{ margin: 0, maxWidth: "62ch" }}>{c.text}</p>
                  <span className="plot-row-meta">{c.metric ?? c.period}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {w.stories.map((st) => (
        <section className="band" key={st.id} id={st.id}>
          <div className="sheet datum">
            <h2>{st.title}</h2>
            <dl className="star" style={{ marginTop: "1.5rem" }}>
              {STAR.map(([k, label]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd style={{ margin: 0 }}>
                    <p>{(st as any)[k]}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ))}

      {w.diagrams.length > 0 && (
        <section className="band">
          <div className="sheet datum">
            <h2>How it was put together</h2>
            <p className="lede">
              {w.diagrams.length} diagrams, redrawn from the ones drawn at the time.
              Internal service and repository names are replaced by what the part does.
            </p>
            {w.diagrams.map((d) => (
              <figure key={d.slug} style={{ margin: "2rem 0 0" }}>
                <figcaption className="plot-row-meta" style={{ marginBottom: "0.5rem" }}>
                  {d.title}
                </figcaption>
                <div className="diagram">
                  <pre>{d.mermaid}</pre>
                </div>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
