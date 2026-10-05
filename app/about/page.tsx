import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Mayank Kumar Gupta — engineering leader and hands-on architect. Language systems " +
    "that hold their shape, platforms rather than apps, and the architecture written down.",
};

export default function About() {
  return (
    <main>
      <section className="band">
        <div className="sheet datum">
          <h1 style={{ fontSize: "var(--step-3)" }}>About</h1>
          <p className="lede">
            I build systems that try to understand language, and I have a soft spot
            for the ones that do it structurally rather than by guessing well.
          </p>
          <p>
            Most of my days go into a stack that turns a question into a parse tree,
            resolves the entities in it against a semantic graph store, and answers
            from structure instead of similarity. Non-statistical entity
            recognition, hybrid vector-plus-keyword search, agent orchestration, a
            shared domain layer under all of it. It is a lot of small, careful
            pieces that have to agree with each other.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>What I like working on</h2>
          <div className="note" style={{ marginTop: "1.5rem" }}>
            <p>
              <b>Language that holds its shape.</b> Parse trees, entity recognition
              without a statistical model underneath, graph stores that keep meaning
              rather than rows. Embeddings are wonderful and they will take you a
              long way, but I keep being drawn back to approaches where you can
              point at the reason an answer came out the way it did.
            </p>
            <p>
              <b>Platforms rather than apps.</b> Shared models, shared clients, an
              SDK, infrastructure that orchestrates the whole set. The unglamorous
              layer that decides whether the next ten features are pleasant or
              painful to build.
            </p>
            <p>
              <b>Writing the architecture down.</b> Decision records next to the
              code, kept honest. I enjoy this more than I probably should — there
              are {" "}
              <Link href="/stats/">438 diagrams</Link> on the record to prove it.
            </p>
          </div>
          <p style={{ marginTop: "2rem" }}>
            Python and TypeScript, some Dart when something wants to be an app, and
            enough Kubernetes and Terraform to keep it all running.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Things I built because I wanted them to exist</h2>
          <div className="plot-rows" style={{ marginTop: "1.5rem" }}>
            {[
              ["navo", "https://github.com/immkg/navo",
               "A planning system built around how people move through a day, rather than how software likes to store tasks."],
              ["module-ttt", "https://github.com/TalkingDB/module-ttt",
               "Symbolic reasoning workflows at the centre of the retrieval stack."],
              ["general-scheduler", "https://github.com/immkg/general-scheduler",
               "Timetable scheduling handed to Z3, because constraint solvers are enormously satisfying."],
            ].map(([name, href, note]) => (
              <div className="plot-row" key={name} style={{ gridTemplateColumns: "11rem minmax(0,1fr)" }}>
                <span className="plot-row-label">
                  <a href={href}>{name}</a>
                </span>
                <span className="plot-row-meta">{note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Getting in touch</h2>
          <p>
            Bangalore or Hyderabad, open to hybrid.{" "}
            <a href="mailto:mayankgupta690@gmail.com">mayankgupta690@gmail.com</a> is
            the fastest way to reach me.
          </p>
        </div>
      </section>
    </main>
  );
}
