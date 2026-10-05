import type { Metadata } from "next";
import Link from "next/link";
import { journey, ym } from "@/lib/data";

export const metadata: Metadata = {
  title: "Journey",
  description:
    "From a mechanical engineering degree and three research labs to running the " +
    "engineering function of an AI product company, in four moves.",
};

/* One short paragraph per era. The detail lives in the work, not here. */
const EXTRA: Record<string, string> = {
  school:
    "Composites at one lab, additive manufacturing at another, and a numerical " +
    "model with a GUI written in New Zealand. What carried over was the habit of " +
    "drawing a thing before building it.",
  "full-stack-engineer":
    "Microservices across several client products at once: picking the stack, " +
    "drawing the architecture, building it, and running the deployments. The " +
    "range came from the number of products rather than the size of any one.",
  "program-manager":
    "Ten or more engineers across several projects, and the first time the job " +
    "was as much about sequencing and health as about code. Still hands on.",
  "chief-technology-officer":
    "The whole function: architecture, the delivery practice, the hiring process " +
    "and career ladder, a multi-cloud estate, and the commercial side of pricing " +
    "engagements. Engineering grew from three to eighty, and ten of them became leads.",
};

export default function Journey() {
  const eras = journey();
  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>Journey</h1>
          <p className="lede">
            I did not set out to write software. I set out to be a mechanical
            engineer, and arrived here by way of three research labs and one
            company I stayed at long enough to run.
          </p>
        </div>
      </section>

      {eras.map((e) => (
        <section className="band" key={e.id} id={e.id}>
          <div className="sheet datum">
            <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)" }}>
              {ym(e.start)} – {ym(e.end)}
            </p>
            <h2 style={{ marginTop: "0.3rem" }}>{e.title}</h2>
            <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginTop: "0.2rem" }}>
              {e.org}
            </p>
            <p style={{ marginTop: "1.2rem" }}>{EXTRA[e.id] ?? e.note}</p>
            {e.stack && e.stack.length > 0 && (
              <ul className="stack" style={{ marginTop: "1rem" }}>
                {e.stack.slice(0, 10).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}

      <section className="band">
        <div className="sheet datum">
          <p>
            <Link href="/work/">What it produced</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
