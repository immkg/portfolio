import type { Metadata } from "next";
import { constellation, num } from "@/lib/data";

export const metadata: Metadata = {
  title: "How this is built",
  description:
    "This site is generated from a private record of the work: an exporter, a " +
    "redaction gate that fails the build on a leak, and a static Next.js export.",
};

export default function Craft() {
  const c = constellation();
  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>How this is built</h1>
          <p className="lede">
            Nothing here was typed in by hand. The site is generated from a private
            record of eight years of work, through a gate that refuses to publish
            anything still carrying a client&apos;s name.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>The pipeline</h2>
          <div className="plot-rows" style={{ marginTop: "1.5rem" }}>
            {[
              ["The record", "Eight years of tickets, commits, reviews, chat and documents, attributed per person and per project. It lives in a private repository and never reaches this one."],
              ["The exporter", "Reads that record, computes each project's position in the plot from its real dates, team size and my share of its activity, and writes the public dataset."],
              ["The redaction gate", "Substitutes every known client and internal repository name for a description of what it does, then asserts that no known name survives anywhere in the output. A single hit aborts the export and nothing is written."],
              ["The site", "A static Next.js export. Every page is real HTML with its own title and description, so the content does not depend on JavaScript running."],
            ].map(([t, d]) => (
              <div className="plot-row" key={t} style={{ gridTemplateColumns: "11rem minmax(0,1fr)" }}>
                <span className="plot-row-label">{t}</span>
                <span className="plot-row-meta" style={{ maxWidth: "58ch" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>What the dataset costs</h2>
          <div className="readout" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", marginTop: "1.5rem" }}>
            <div className="readout-cell">
              <div className="readout-value">{num(c.nodes.length)}</div>
              <div className="readout-label">plotted projects</div>
            </div>
            <div className="readout-cell">
              <div className="readout-value">{num(c.edges.length)}</div>
              <div className="readout-label">links between them</div>
            </div>
            <div className="readout-cell">
              <div className="readout-value">9 kB</div>
              <div className="readout-label">the whole plot, compressed</div>
            </div>
            <div className="readout-cell">
              <div className="readout-value">0</div>
              <div className="readout-label">3D models loaded</div>
            </div>
          </div>
          <p style={{ marginTop: "2rem" }}>
            The plot is drawn from numbers, not from meshes, which is why it weighs
            less than a photograph. Revised {c.built_at}.
          </p>
        </div>
      </section>
    </main>
  );
}
