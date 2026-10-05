import type { Metadata } from "next";
import Link from "next/link";
import { caseSlugs, workCase, DOMAIN, KIND, num } from "@/lib/data";

export function generateStaticParams() {
  return caseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const w = workCase(slug);
  return {
    title: w.label,
    description: w.line || `${DOMAIN[w.domain]}, ${w.first.slice(0, 4)}–${w.last.slice(0, 4)}.`,
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
  const claims = w.claims.slice(0, 3);
  const story = w.stories[0];
  const diagram = w.diagrams[0];
  const more = w.stories.slice(1);

  return (
    <main data-domain={w.domain}>
      <section className="band">
        <div className="sheet datum">
          <p style={{ color: "var(--pen)", fontSize: "var(--step--1)" }}>
            <Link href="/work/" style={{ color: "inherit" }}>Work</Link> / {DOMAIN[w.domain]}
          </p>
          <h1 style={{ fontSize: "var(--step-3)", marginTop: "0.4rem" }}>{w.label}</h1>
          <p className="lede" style={{ marginTop: "0.8rem" }}>{w.line}</p>

          <div
            className="readout"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))", marginTop: "2rem" }}
          >
            <div className="readout-cell">
              <div className="readout-value">{w.first.slice(0, 4)}–{w.last.slice(0, 4)}</div>
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
          <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginTop: "0.8rem" }}>
            {KIND[w.kind]}
          </p>
        </div>
      </section>

      {claims.length > 0 && (
        <section className="band">
          <div className="sheet datum">
            <h2>What came of it</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "1.2rem 0 0" }}>
              {claims.map((c) => (
                <li
                  key={c.id}
                  style={{
                    borderTop: "1px solid var(--rule)",
                    padding: "0.9rem 0",
                    maxWidth: "62ch",
                  }}
                >
                  {c.text}
                  {c.metric && (
                    <div style={{ color: "var(--pen)", fontSize: "var(--step--1)", marginTop: "0.3rem" }}>
                      {c.metric}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {story && (
        <section className="band">
          <div className="sheet datum">
            <h2>{story.title}</h2>
            <p style={{ marginTop: "1rem" }}>{story.situation}</p>
            <p>{story.result}</p>
            <details className="long">
              <summary>The whole story, step by step</summary>
              <dl className="star">
                {STAR.map(([k, label]) => (
                  <div key={k}>
                    <dt>{label}</dt>
                    <dd style={{ margin: 0 }}>
                      <p>{(story as any)[k]}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </section>
      )}

      {diagram && (
        <section className="band">
          <div className="sheet datum">
            <h2>How it was put together</h2>
            <figure style={{ margin: "1.2rem 0 0" }}>
              <figcaption style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginBottom: "0.5rem" }}>
                {diagram.title}
              </figcaption>
              <div className="diagram">
                <pre>{diagram.mermaid}</pre>
              </div>
            </figure>
            {w.diagrams.length > 1 && (
              <details className="long">
                <summary>{w.diagrams.length - 1} more diagrams</summary>
                {w.diagrams.slice(1).map((d) => (
                  <figure key={d.slug} style={{ margin: "1.2rem 0 0" }}>
                    <figcaption style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginBottom: "0.5rem" }}>
                      {d.title}
                    </figcaption>
                    <div className="diagram">
                      <pre>{d.mermaid}</pre>
                    </div>
                  </figure>
                ))}
              </details>
            )}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="band">
          <div className="sheet datum">
            <details className="long" style={{ borderTop: "none", marginTop: 0 }}>
              <summary>{more.length} more stories from this one</summary>
              {more.map((st) => (
                <div key={st.id} style={{ marginTop: "1.5rem" }}>
                  <h3>{st.title}</h3>
                  <p style={{ marginTop: "0.5rem" }}>{st.situation}</p>
                  <p>{st.result}</p>
                </div>
              ))}
            </details>
          </div>
        </section>
      )}

      <section className="band">
        <div className="sheet datum">
          <p>
            <Link href="/work/">Back to the work</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
