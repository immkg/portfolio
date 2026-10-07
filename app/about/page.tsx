import type { Metadata } from "next";
import Link from "next/link";
import { world } from "@/lib/data";
import { ICON } from "@/components/world/atlas/model";
import { InWorld, PaperPlane, PersonLd } from "@/components/pages/bits";

export const metadata: Metadata = {
  title: "About",
  description:
    "Mayank Kumar Gupta: engineering leader for SaaS and AI products, hands on throughout. " +
    "Language systems that hold their shape, platforms rather than apps, and small software built for real needs.",
  alternates: { canonical: "/about/" },
  openGraph: { title: "About Mayank Kumar Gupta", url: "/about/", type: "profile",
    description: "Engineering leader for SaaS and AI products, hands on throughout. Open to CTO, VP and Head of Engineering roles." },
};

export default function About() {
  const w = world();
  const a = w.about;
  return (
    <main className="pg">
      <PersonLd w={w} />
      <section className="pg-hero">
        <img src={ICON("hero-mayank")} alt="" width={280} height={280} />
        <div>
          <div className="pg-kicker">{w.profile.headline}</div>
          <h1>About</h1>
          {(a?.intro ?? [w.profile.line]).map((x, i) => <p key={i} className={i ? "" : "pg-lede"}>{x}</p>)}
          <div className="pg-hero-links">
            <InWorld p="reach" label="Meet me in the world" />
            <Link href="/work/">Skills and work</Link>
          </div>
        </div>
      </section>

      <section className="pg-band">
        <h2>How I work</h2>
        <p>
          I build systems that try to understand language, and I have a soft spot for the ones that do it
          structurally rather than by guessing well: a question becomes a parse tree, its entities resolve
          against a graph, and the answer comes from structure instead of similarity.
        </p>
        <p>
          I like platforms more than apps: shared models, an SDK, the unglamorous layer that decides whether
          the next ten features are pleasant or painful to build. And I like writing the architecture down.
        </p>
      </section>

      {a && a.built.length > 0 && (
        <section className="pg-band">
          <h2>Built for myself</h2>
          <div className="pg-built">
            {a.built.map((b) => (
              <a key={b.name} href={b.url} rel="noopener" className="pg-built-item">
                <b>{b.name}</b><span>{b.line}</span><small>github.com/immkg</small>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="pg-band">
        <h2>Timeline</h2>
        <ol className="pg-timeline">
          {[...w.roles].reverse().map((r) => (
            <li key={r.id}><span className="pg-when">{r.dates}</span><b>{r.title}</b> · {r.employer}</li>
          ))}
        </ol>
      </section>

      <PaperPlane w={w} />
    </main>
  );
}
