"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BUILTIN_ALIASES, buildAliases, smartHit, suggest } from "@/lib/smartMatch";
import {
  type WorldData, type Skill, ICON, PEN, FAMILY_INK, STORY_FAMILIES, span,
} from "@/components/world/atlas/model";
import { InWorld, ProjectTile } from "./bits";

type Kind = "all" | "skills" | "projects" | "stories";
const KINDS: { id: Kind; label: string }[] = [
  { id: "all", label: "Everything" }, { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" }, { id: "stories", label: "Stories" },
];
const EXAMPLES = ["k8s", "RAG", "hiring", "search", "ci/cd", "document AI"];

/** Skill groups into columns, tallest first into the shortest column, so no
 *  column runs empty (CSS columns cannot split a group cleanly). */
function balance<T extends { items: Skill[] }>(groups: T[], cols: number): T[][] {
  const out: T[][] = Array.from({ length: cols }, () => []);
  const h = new Array(cols).fill(0);
  [...groups].sort((a, b) => b.items.length - a.items.length).forEach((g) => {
    const i = h.indexOf(Math.min(...h));
    out[i].push(g);
    h[i] += 3 + g.items.length * 1.1;
  });
  return out;
}

function Dots({ n }: { n: number }) {
  return (
    <span className="ex-dots" aria-label={`strength ${n} of 3`}>
      {[1, 2, 3].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}
    </span>
  );
}

/** Search, filter and group everything, the way Present does: one forgiving
 *  box (acronyms, synonyms, typos), autocomplete, and the view in the URL. */
export default function Explorer({ w }: { w: WorldData }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [dom, setDom] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [cols, setCols] = useState(3);
  const box = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");

  /* the view lives in the URL, so a link reopens it and Back works */
  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    setQ(u.get("q") ?? ""); setTyped(u.get("q") ?? "");
    setKind((u.get("kind") as Kind) || "all");
    setDom(u.get("d"));
    const fit = () => setCols(window.innerWidth < 640 ? 1 : window.innerWidth < 980 ? 2 : window.innerWidth < 1400 ? 3 : 4);
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (kind !== "all") u.set("kind", kind);
    if (dom) u.set("d", dom);
    const s = u.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [q, kind, dom]);
  useEffect(() => {                       // debounce typing into the filter
    const t = setTimeout(() => setQ(typed), 140);
    return () => clearTimeout(t);
  }, [typed]);

  const aliases = useMemo(() => buildAliases({ skills: w.skills }), [w]);

  const hitSkill = (s: Skill) => smartHit(q, [s.name, s.group, s.line], aliases, s.aliases);
  const inDom = useMemo(() => new Set(w.projects.filter((p) => p.domain === dom).map((p) => p.slug)), [w, dom]);
  const skills = w.skills.filter((s) => (!dom || s.projects.some((k) => inDom.has(k))) && (!q || hitSkill(s)));
  // projects inherit a match only from skills whose own name matched, not an alias
  const skillHit = new Set(skills.filter((s) => smartHit(q, [s.name], aliases)).map((s) => s.name.toLowerCase()));
  // a project matches on its own words, or because it used a skill that matches
  const projects = w.projects.filter((p) =>
    (!dom || p.domain === dom) &&
    (!q || smartHit(q, [p.label, p.line, ...p.did, ...p.skills], BUILTIN_ALIASES) ||
      p.skills.some((n) => skillHit.has(n.toLowerCase()) && q.length > 1)));
  const projectHit = new Set(projects.map((p) => p.slug));
  const stories = w.stories.filter((s) =>
    (!dom || w.projects.find((p) => p.slug === s.project)?.domain === dom) &&
    (!q || smartHit(q, [s.title, s.s, s.t, s.a, s.r], BUILTIN_ALIASES)));

  const show = (k: Kind) => kind === "all" || kind === k;
  const counts = { all: skills.length + projects.length + stories.length, skills: skills.length, projects: projects.length, stories: stories.length };

  const vocab = useMemo(() => [
    ...w.skills.map((s) => ({ label: s.name, terms: s.aliases ?? [], icon: s.icon, href: `/skills/${s.slug}/`, sub: s.group })),
    ...w.projects.map((p) => ({ label: p.label, terms: [], icon: `project-${p.slug}`, href: `/work/${p.slug}/`, sub: span(p) })),
    ...w.stories.map((s) => ({ label: s.title, terms: [], icon: `story-${s.id}`, href: `/work/${s.project}/#${s.id}`, sub: "Story" })),
  ], [w]);
  const sugg = open && typed ? suggest(typed, vocab, aliases, 7) as typeof vocab : [];

  const groups = [...new Set(skills.map((s) => s.group))].map((g) => ({
    g, items: skills.filter((s) => s.group === g).sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name)),
  }));

  return (
    <section className="pg-band ex" id="explore">
      <div className="ex-bar">
        <div className="ex-search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={box} value={typed} placeholder="Search skills, projects and stories: try k8s, RAG, hiring"
            aria-label="Search skills, projects and stories"
            onChange={(e) => { setTyped(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === "Escape") { setTyped(""); setQ(""); setOpen(false); } }}
          />
          {typed && <button className="ex-clear" aria-label="Clear" onClick={() => { setTyped(""); setQ(""); box.current?.focus(); }}>×</button>}
          {sugg.length > 0 && (
            <ul className="ex-sugg">
              {sugg.map((v) => (
                <li key={v.href}><Link href={v.href}><img src={ICON(v.icon)} alt="" width={26} height={26} /><b>{v.label}</b><small>{v.sub}</small></Link></li>
              ))}
            </ul>
          )}
        </div>
        <div className="ex-kinds" role="tablist">
          {KINDS.map((k) => (
            <button key={k.id} role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}>
              {k.label} <span>{counts[k.id]}</span>
            </button>
          ))}
        </div>
        <div className="ex-doms">
          <button aria-pressed={!dom} onClick={() => setDom(null)}>All domains</button>
          {w.domains.map((d) => (
            <button key={d.id} aria-pressed={dom === d.id} style={{ ["--pen" as any]: PEN[d.id] }}
                    onClick={() => setDom(dom === d.id ? null : d.id)}>
              <img src={ICON(`domain-${d.id}`)} alt="" width={18} height={18} />{d.label}
            </button>
          ))}
        </div>
      </div>

      {counts.all === 0 && (
        <div className="ex-empty">
          <img src={ICON("empty-question")} alt="" width={220} height={160} />
          <p>Nothing matches &ldquo;{q}&rdquo;. Try one of these:</p>
          <div className="ex-examples">{EXAMPLES.map((x) => <button key={x} onClick={() => { setTyped(x); setQ(x); }}>{x}</button>)}</div>
        </div>
      )}

      {show("skills") && skills.length > 0 && (
        <div className="ex-part">
          <h2>Skills <span>{skills.length}</span></h2>
          <div className="ex-cols" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {balance(groups, cols).map((col, i) => (
              <div key={i} className="ex-col">
                {col.map(({ g, items }) => (
                  <div key={g} className="pg-skill-group" style={{ ["--pen" as any]: FAMILY_INK[items[0].family] }}>
                    <h3><img src={ICON(`skill-${items[0].family}`)} alt="" width={28} height={28} />{g}<span>{items.length}</span></h3>
                    <ul className="ex-skills">
                      {items.map((s) => (
                        <li key={s.slug}>
                          <Link href={`/skills/${s.slug}/`}>
                            <img src={ICON(s.icon)} alt="" width={22} height={22} loading="lazy" />
                            <span>{s.name}</span><Dots n={s.strength} /><small>{s.projects.length}</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {show("projects") && projects.length > 0 && (
        <div className="ex-part">
          <h2>Projects <span>{projects.length}</span></h2>
          {w.domains.map((d) => {
            const list = projects.filter((p) => p.domain === d.id)
              .sort((a, b) => (b.tier - a.tier) || (b.last ?? "").localeCompare(a.last ?? ""));
            if (!list.length) return null;
            return (
              <div key={d.id} className="pg-domain" style={{ ["--pen" as any]: PEN[d.id] }}>
                <h3 id={d.id}>
                  <img src={ICON(`domain-${d.id}`)} alt="" width={32} height={32} />{d.label}<span>{list.length}</span>
                  <InWorld p={`district:${d.id}`} label="Walk this district" />
                </h3>
                <div className="pg-tiles">{list.map((p) => <ProjectTile key={p.slug} p={p} />)}</div>
              </div>
            );
          })}
        </div>
      )}

      {show("stories") && stories.length > 0 && (
        <div className="ex-part">
          <h2>Stories <span>{stories.length}</span></h2>
          {STORY_FAMILIES.map((f) => {
            const list = stories.filter((s) => (s.family ?? "decisions") === f.id);
            if (!list.length) return null;
            return (
              <div key={f.id} className="ex-family" style={{ ["--pen" as any]: f.ink }}>
                <h3>{f.label}<span>{list.length}</span></h3>
                <div className="pg-story-index">
                  {list.map((s) => {
                    const p = w.projects.find((x) => x.slug === s.project);
                    return (
                      <Link key={s.id} href={`/work/${s.project}/#${s.id}`} className="pg-story-link">
                        <img src={ICON(`story-${s.id}`)} alt="" width={44} height={44} loading="lazy" />
                        <span><b>{s.title}</b><em>{s.r}</em><small>{s.period}{p ? ` · ${p.label}` : ""}</small></span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
