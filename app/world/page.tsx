import type { Metadata } from "next";
import Link from "next/link";
import WorldMount from "@/components/world/WorldMount";
import { constellation, caseSlugs, workCase, DOMAIN } from "@/lib/data";
import type { Landmark, Speck } from "@/components/world/World";

export const metadata: Metadata = {
  title: "The world",
  description:
    "Walk through seven years of engineering as a small paper world: five landmark " +
    "projects, the rest of the work scattered around them.",
};

const FEATURED = [
  "regulatory-medical-writing",
  "hybrid-chat",
  "omnichannel-inbox",
  "talkingdb",
  "kray-search-platform",
];

const TAGS: Record<string, string[]> = {
  "regulatory-medical-writing": ["Document AI", "Architecture", "Team lead"],
  "hybrid-chat": ["Conversational AI", "Platform", "Product"],
  "omnichannel-inbox": ["Conversational AI", "Scale", "Architecture"],
  talkingdb: ["Document AI", "Retrieval", "Research"],
  "kray-search-platform": ["Search", "E-commerce", "Product"],
};

export default function WorldPage() {
  const c = constellation();
  const bySlug = Object.fromEntries(c.nodes.map((n) => [n.slug, n]));

  const landmarks: Landmark[] = FEATURED.map((slug) => {
    const n = bySlug[slug];
    return {
      slug, label: n.label, line: n.line, domain: n.domain,
      first: n.first, last: n.last, people: n.people,
      href: `/portfolio/work/${slug}/`, tags: TAGS[slug] ?? [DOMAIN[n.domain]],
    };
  });

  const rest = c.nodes.filter((n) => !FEATURED.includes(n.slug));
  const internal = rest.filter((n) => n.domain === "platform-internal");
  const other = rest.filter((n) => n.domain !== "platform-internal");

  landmarks.push({
    slug: "more-work", label: "More work", domain: "search-commerce",
    line: "Everything else the years produced — search, crawling, automation, " +
          "product builds and the one-off engagements.",
    first: other.reduce((m, n) => (n.first < m ? n.first : m), "2100"),
    last: other.reduce((m, n) => (n.last > m ? n.last : m), "1900"),
    people: 0, count: other.length, href: "/portfolio/work/",
    tags: ["Search", "Crawling", "Automation"],
  });
  landmarks.push({
    slug: "internal-platform", label: "Internal platform", domain: "platform-internal",
    line: "The company's own estate: hiring, delivery practice, the cloud it ran " +
          "on and the tooling underneath all the client work.",
    first: internal.reduce((m, n) => (n.first < m ? n.first : m), "2100"),
    last: internal.reduce((m, n) => (n.last > m ? n.last : m), "1900"),
    people: 0, count: internal.length, href: "/portfolio/work/",
    tags: ["Platform", "Hiring", "Cloud"],
  });

  /* the rest of the work, scattered as specks around the ring */
  const specks: Speck[] = rest.map((n, i) => {
    const a = (i / rest.length) * Math.PI * 2 * 3.1;
    const rad = 13 + ((i * 37) % 58);
    return {
      x: +(Math.cos(a) * rad).toFixed(2),
      z: +(Math.sin(a) * rad).toFixed(2),
      r: n.r, domain: n.domain,
    };
  });

  return (
    <>
      <WorldMount landmarks={landmarks} specks={specks} />
      {/* Everything in the world, as text, for anyone and anything that cannot
          run it — crawlers included. */}
      <div className="visually-hidden">
        <h1>The world</h1>
        <p>
          A walkable map of seven years of engineering. It contains{" "}
          {landmarks.length} landmarks and {specks.length} further projects.
        </p>
        <ul>
          {landmarks.map((l) => (
            <li key={l.slug}>
              <Link href={l.href ?? "/work/"}>{l.label}</Link> — {l.line}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
