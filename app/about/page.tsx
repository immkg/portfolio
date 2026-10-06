import type { Metadata } from "next";

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
          <p style={{ marginTop: "1.5rem" }}>
            Most of my days go into a stack that turns a question into a parse tree,
            resolves the entities in it against a semantic graph store, and answers
            from structure instead of similarity. Embeddings are wonderful and they
            will take you a long way, but I keep being drawn back to approaches
            where you can point at the reason an answer came out the way it did.
          </p>
          <p>
            I like platforms more than apps — shared models, an SDK, the unglamorous
            layer that decides whether the next ten features are pleasant or painful
            to build. And I like writing the architecture down.
          </p>
          <p>
            Python and TypeScript, some Dart when something wants to be an app, and
            enough Kubernetes and Terraform to keep it all running.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Built because I wanted them to exist</h2>
          <div style={{ marginTop: "1.2rem" }}>
            {[
              ["navo", "https://github.com/immkg/navo",
               "A planning system built around how people move through a day, rather than how software likes to store tasks."],
              ["module-ttt", "https://github.com/TalkingDB/module-ttt",
               "Symbolic reasoning workflows at the centre of a retrieval stack."],
              ["general-scheduler", "https://github.com/immkg/general-scheduler",
               "Timetable scheduling handed to Z3, because constraint solvers are satisfying."],
            ].map(([name, href, note]) => (
              <div key={name} style={{ borderTop: "1px solid var(--rule)", padding: "0.8rem 0" }}>
                <a href={href}>{name}</a>
                <div style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", maxWidth: "52ch" }}>
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="sheet datum">
          <h2>Getting in touch</h2>
          <p style={{ marginTop: "1rem" }}>
            Bangalore or Hyderabad, open to hybrid.{" "}
            <a href="mailto:mayankgupta690@gmail.com">mayankgupta690@gmail.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
