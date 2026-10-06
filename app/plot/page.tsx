import Link from "next/link";
import Plot from "@/components/Plot";
import Legend from "@/components/Legend";
import CaseList from "@/components/CaseList";
import { constellation, stats, journey, num } from "@/lib/data";

export default function Home() {
  const c = constellation();
  const s = stats();
  const eras = journey();

  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1>Seven years of engineering, plotted.</h1>
          <p className="lede">
            I ran the engineering function of a SaaS and AI product company — the
            architecture, the delivery practice, the people and the cloud estate.
            Every marker below is a project it produced.
          </p>
          <Plot />
          <div style={{ marginTop: "1.5rem" }}>
            <Legend />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <div className="readout" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(9.5rem, 1fr))" }}>
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
          <h2>Nine of them, up close</h2>
          <p className="lede">
            A couple of minutes each: what it was, what I argued for, and what changed.
          </p>
          <div style={{ marginTop: "1.8rem" }}>
            <CaseList />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>How it went</h2>
          <div className="eras" style={{ marginTop: "1.5rem" }}>
            {eras.map((e) => (
              <div className="era" key={e.id}>
                <div className="era-when">
                  {e.start.slice(0, 4)}–{e.end ? e.end.slice(0, 4) : "now"}
                </div>
                <div>
                  <div className="era-what">{e.title}</div>
                  <div className="era-org">{e.org}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/journey/">The longer version</Link>, or{" "}
            <Link href="/about/">what I like working on</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
