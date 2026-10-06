"use client";

import { useEffect, useState } from "react";
import Diagram from "./Diagram";
import {
  type WorldData, type Pick, type ProjectDetail, ROOT, ICON, PEN, FAMILY_INK, KIND, span, num,
} from "./model";

/** The long read for whatever was picked. Dense content leaves the world and
 *  opens here; the world keeps the object. */
export default function Panel({ w, pick, onPick, onClose }: {
  w: WorldData; pick: Pick; onPick: (p: Pick) => void; onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <aside className="atlas-panel" aria-live="polite">
      <button className="atlas-close" onClick={onClose} aria-label="Close">×</button>
      <div className="atlas-panel-body">
        {pick.kind === "project" && <ProjectRead w={w} slug={pick.slug} onPick={onPick} />}
        {pick.kind === "skill" && <SkillRead w={w} slug={pick.slug} onPick={onPick} />}
        {pick.kind === "story" && <StoryRead w={w} id={pick.id} onPick={onPick} />}
        {pick.kind === "district" && <DistrictRead w={w} id={pick.id} onPick={onPick} />}
        {pick.kind === "about" && <AboutRead w={w} onPick={onPick} />}
      </div>
    </aside>
  );
}

function Head({ icon, kicker, title, pen }: { icon?: string; kicker: string; title: string; pen: string }) {
  return (
    <header className="atlas-head" style={{ ["--pen" as any]: pen }}>
      {icon && <img src={ICON(icon)} alt="" width={64} height={64} />}
      <div>
        <div className="atlas-kicker">{kicker}</div>
        <h2>{title}</h2>
      </div>
    </header>
  );
}

function ProjectRead({ w, slug, onPick }: { w: WorldData; slug: string; onPick: (p: Pick) => void }) {
  const p = w.projects.find((x) => x.slug === slug);
  const [d, setD] = useState<ProjectDetail | null>(null);
  useEffect(() => {
    setD(null);
    fetch(`${ROOT}/data/project/${slug}.json`).then((r) => r.json()).then(setD).catch(() => {});
  }, [slug]);
  if (!p) return null;
  const dom = w.domains.find((x) => x.id === p.domain);
  const byName = Object.fromEntries(w.skills.map((s) => [s.name.toLowerCase(), s]));
  const claims = w.claims.filter((c) => c.project === slug);
  const stories = w.stories.filter((s) => s.project === slug);

  return (
    <>
      <Head icon={`project-${slug}`} kicker={`${dom?.label} · ${KIND[p.kind] ?? p.kind}`} title={p.label} pen={PEN[p.domain]} />
      {p.line && <p className="atlas-lede">{p.line}</p>}
      <dl className="atlas-facts">
        <div><dt>When</dt><dd>{span(p)}</dd></div>
        {p.mine > 0 && <div><dt>My recorded activity</dt><dd>{num(p.mine)} events</dd></div>}
        {p.share > 0 && <div><dt>Share that was mine</dt><dd>{Math.floor(p.share * 100)}%</dd></div>}
        {p.diagrams > 0 && <div><dt>Diagrams</dt><dd>{p.diagrams}</dd></div>}
      </dl>
      {p.skills.length > 0 && (
        <ul className="atlas-chips">
          {p.skills.map((n) => {
            const s = byName[n.toLowerCase()];
            return s ? (
              <li key={n}><button style={{ ["--pen" as any]: FAMILY_INK[s.family] }}
                                  onClick={() => onPick({ kind: "skill", slug: s.slug })}>{n}</button></li>
            ) : <li key={n}><span>{n}</span></li>;
          })}
        </ul>
      )}
      {claims.length > 0 && (
        <section><h3>What it came to</h3>
          <ul className="atlas-claims">{claims.map((c) => <li key={c.id}>{c.text}</li>)}</ul>
        </section>
      )}
      {stories.length > 0 && (
        <section><h3>Stories from it</h3>
          <ul className="atlas-list">
            {stories.map((s) => (
              <li key={s.id}><button onClick={() => onPick({ kind: "story", id: s.id })}>
                <img src={ICON(`story-${s.id}`)} alt="" width={36} height={36} />
                <span>{s.title}</span><small>{s.period.replace("..", "–")}</small>
              </button></li>
            ))}
          </ul>
        </section>
      )}
      {!d && <p className="atlas-wait">Opening the write-up…</p>}
      {d?.sections.map((s) => (
        <section key={s.title}><h3>{s.title}</h3>{s.paragraphs.map((x, i) => <p key={i}>{x}</p>)}</section>
      ))}
      {d && d.diagrams.length > 0 && (
        <section><h3>Drawn at the time</h3>
          {d.diagrams.slice(0, 6).map((g, i) => <Diagram key={i} title={g.title} source={g.mermaid} />)}
          {d.diagrams.length > 6 && <p className="atlas-wait">and {d.diagrams.length - 6} more in the record.</p>}
        </section>
      )}
    </>
  );
}

function SkillRead({ w, slug, onPick }: { w: WorldData; slug: string; onPick: (p: Pick) => void }) {
  const s = w.skills.find((x) => x.slug === slug);
  if (!s) return null;
  const bySlug = Object.fromEntries(w.projects.map((p) => [p.slug, p]));
  const byName = Object.fromEntries(w.skills.map((x) => [x.name.toLowerCase(), x]));
  return (
    <>
      <Head icon={s.icon} kicker={s.group} title={s.name} pen={FAMILY_INK[s.family]} />
      {s.summary && <p className="atlas-lede">{s.summary}</p>}
      {s.commits > 0 && <dl className="atlas-facts"><div><dt>Commits</dt><dd>{num(s.commits)}</dd></div></dl>}
      {s.projects.length > 0 && (
        <section><h3>Where it was used</h3>
          <p className="atlas-note">The threads in the world run from this stone to each of these.</p>
          <ul className="atlas-list">
            {s.projects.map((k) => bySlug[k] && (
              <li key={k}><button onClick={() => onPick({ kind: "project", slug: k })}>
                <img src={ICON(`project-${k}`)} alt="" width={36} height={36} />
                <span>{bySlug[k].label}</span><small>{span(bySlug[k])}</small>
              </button></li>
            ))}
          </ul>
        </section>
      )}
      {s.links.length > 0 && (
        <section><h3>Goes with</h3>
          <ul className="atlas-chips">
            {s.links.map((n) => {
              const o = byName[n.toLowerCase()];
              return o ? <li key={n}><button style={{ ["--pen" as any]: FAMILY_INK[o.family] }}
                                             onClick={() => onPick({ kind: "skill", slug: o.slug })}>{n}</button></li> : null;
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function StoryRead({ w, id, onPick }: { w: WorldData; id: string; onPick: (p: Pick) => void }) {
  const s = w.stories.find((x) => x.id === id);
  if (!s) return null;
  const p = w.projects.find((x) => x.slug === s.project);
  const parts: [string, string][] = [
    ["The situation", s.situation], ["What I had to do", s.task], ["What I did", s.action],
    ["What happened", s.result], ["Looking back", s.reflection],
  ];
  return (
    <>
      <Head icon={`story-${id}`} kicker={`A story · ${s.period.replace("..", "–")}`} title={s.title}
            pen={p ? PEN[p.domain] : "#1b2437"} />
      {parts.filter(([, t]) => t).map(([h, t]) => <section key={h}><h3>{h}</h3><p>{t}</p></section>)}
      {p && <button className="world-enter" onClick={() => onPick({ kind: "project", slug: p.slug })}>
        It happened on {p.label}</button>}
    </>
  );
}

function DistrictRead({ w, id, onPick }: { w: WorldData; id: string; onPick: (p: Pick) => void }) {
  const d = w.domains.find((x) => x.id === id);
  const items = w.projects.filter((p) => p.domain === id).sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  const mine = items.reduce((n, p) => n + p.mine, 0);
  return (
    <>
      <Head icon={`domain-${id}`} kicker="District" title={d?.label ?? id} pen={PEN[id]} />
      <p className="atlas-lede">
        {items.length} projects, newest nearest the plaza. {mine > 0 && `${num(Math.floor(mine / 100) * 100)}+ recorded events of mine.`}
      </p>
      <ul className="atlas-list">
        {items.map((p) => (
          <li key={p.slug}><button onClick={() => onPick({ kind: "project", slug: p.slug })}>
            <img src={ICON(`project-${p.slug}`)} alt="" width={36} height={36} />
            <span>{p.label}</span><small>{span(p)}</small>
          </button></li>
        ))}
      </ul>
    </>
  );
}

function AboutRead({ w, onPick }: { w: WorldData; onPick: (p: Pick) => void }) {
  return (
    <>
      <Head icon="mark" kicker={w.profile.headline} title={w.profile.name} pen="#1b2437" />
      <p className="atlas-lede">{w.profile.summary}</p>
      <section><h3>Roles</h3>
        {w.roles.map((r) => (
          <div className="atlas-role-read" key={r.id}>
            <b>{r.title}</b> · {r.employer}<small>{r.dates}</small>
            {r.intro && <p>{r.intro}</p>}
          </div>
        ))}
      </section>
      <section><h3>In short</h3>
        <ul className="atlas-claims">{w.bullets.slice(0, 12).map((b, i) => <li key={i}>{b}</li>)}</ul>
      </section>
      <section><h3>How to read the world</h3>
        <ul className="atlas-claims">
          <li>The plaza is now. Each ring outwards is a year further back, to 2019 at the rim.</li>
          <li>Seven districts, one per kind of problem. A plinth is a project; its height is how much of the record is mine.</li>
          <li>The stones round the plaza are skills. Pick one and threads run to every project that used it.</li>
          <li>Small pictures circling a project are stories from it.</li>
        </ul>
      </section>
      <p><a className="world-enter" href={`${ROOT}/studio/`}>Step into the studio</a>{" "}
         <button className="world-enter" onClick={() => onPick({ kind: "district", id: w.districts[0] })}>Start with a district</button></p>
    </>
  );
}
