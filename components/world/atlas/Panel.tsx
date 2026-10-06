"use client";

import { useEffect } from "react";
import ReachOut from "./ReachOut";
import {
  type WorldData, type Pick, ROOT, ICON, PEN, FAMILY_INK, KIND, span,
} from "./model";

/** A short card for whatever was picked: a line, its timeline and its skills.
 *  The world showcases skills and the timeline; it carries no write-ups. */
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
        {pick.kind === "project" && <ProjectCard w={w} slug={pick.slug} onPick={onPick} />}
        {pick.kind === "skill" && <SkillCard w={w} slug={pick.slug} onPick={onPick} />}
        {pick.kind === "story" && <StoryCard w={w} id={pick.id} onPick={onPick} />}
        {pick.kind === "district" && <DistrictCard w={w} id={pick.id} onPick={onPick} />}
        {pick.kind === "about" && <AboutCard w={w} onPick={onPick} />}
        {pick.kind === "reach" && <ReachCard w={w} onPick={onPick} />}
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

function SkillChips({ w, names, onPick }: { w: WorldData; names: string[]; onPick: (p: Pick) => void }) {
  const byName = Object.fromEntries(w.skills.map((s) => [s.name.toLowerCase(), s]));
  return (
    <ul className="atlas-chips">
      {names.map((n) => {
        const s = byName[n.toLowerCase()];
        return s ? (
          <li key={n}><button style={{ ["--pen" as any]: FAMILY_INK[s.family] }}
                              onClick={() => onPick({ kind: "skill", slug: s.slug })}>{n}</button></li>
        ) : <li key={n}><span>{n}</span></li>;
      })}
    </ul>
  );
}

function ProjectRow({ w, slug, onPick }: { w: WorldData; slug: string; onPick: (p: Pick) => void }) {
  const p = w.projects.find((x) => x.slug === slug);
  if (!p) return null;
  return (
    <li><button onClick={() => onPick({ kind: "project", slug })}>
      <img src={ICON(`project-${slug}`)} alt="" width={36} height={36} />
      <span>{p.label}</span><small>{span(p)}</small>
    </button></li>
  );
}

function ProjectCard({ w, slug, onPick }: { w: WorldData; slug: string; onPick: (p: Pick) => void }) {
  const p = w.projects.find((x) => x.slug === slug);
  if (!p) return null;
  const dom = w.domains.find((x) => x.id === p.domain);
  const stories = w.stories.filter((s) => s.project === slug);
  // walking the road: the same district, newest nearest the plaza
  const road = w.projects.filter((x) => x.domain === p.domain)
    .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  const at = road.findIndex((x) => x.slug === slug);
  const newer = road[at - 1], older = road[at + 1];
  return (
    <>
      <Head icon={`project-${slug}`} kicker={`${dom?.label} · ${span(p)}`} title={p.label} pen={PEN[p.domain]} />
      {p.line && <p className="atlas-lede">{p.line}</p>}
      <nav className="atlas-road" aria-label={`Along the ${dom?.label} road`}>
        <button disabled={!newer} onClick={() => newer && onPick({ kind: "project", slug: newer.slug })}>◂ Newer</button>
        <span>{at + 1} of {road.length} on this road</span>
        <button disabled={!older} onClick={() => older && onPick({ kind: "project", slug: older.slug })}>Older ▸</button>
      </nav>
      <p className="atlas-note">{KIND[p.kind] ?? p.kind}</p>
      {p.did.length > 0 && (
        <section><h3>What I did</h3>
          <ul className="atlas-claims">{p.did.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}
      {p.skills.length > 0 && <section><h3>Skills</h3><SkillChips w={w} names={p.skills} onPick={onPick} /></section>}
      {stories.length > 0 && (
        <section><h3>Stories</h3>
          <ul className="atlas-list">
            {stories.map((s) => (
              <li key={s.id}><button onClick={() => onPick({ kind: "story", id: s.id })}>
                <img src={ICON(`story-${s.id}`)} alt="" width={36} height={36} />
                <span>{s.title}</span><small>{s.period}</small>
              </button></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SkillCard({ w, slug, onPick }: { w: WorldData; slug: string; onPick: (p: Pick) => void }) {
  const s = w.skills.find((x) => x.slug === slug);
  if (!s) return null;
  return (
    <>
      <Head icon={s.icon} kicker={s.group} title={s.name} pen={FAMILY_INK[s.family]} />
      {s.line && <p className="atlas-lede">{s.line}</p>}
      {s.projects.length > 0 && (
        <section><h3>Used on</h3>
          <ul className="atlas-list">{s.projects.map((k) => <ProjectRow key={k} w={w} slug={k} onPick={onPick} />)}</ul>
        </section>
      )}
      {w.stories.some((x) => s.projects.includes(x.project)) && (
        <section><h3>Stories where it mattered</h3>
          <ul className="atlas-list">
            {w.stories.filter((x) => s.projects.includes(x.project)).map((x) => (
              <li key={x.id}><button onClick={() => onPick({ kind: "story", id: x.id })}>
                <img src={ICON(`story-${x.id}`)} alt="" width={36} height={36} />
                <span>{x.title}</span><small>{x.period}</small>
              </button></li>
            ))}
          </ul>
        </section>
      )}
      {s.links.length > 0 && <section><h3>Goes with</h3><SkillChips w={w} names={s.links} onPick={onPick} /></section>}
    </>
  );
}

function StoryCard({ w, id, onPick }: { w: WorldData; id: string; onPick: (p: Pick) => void }) {
  const s = w.stories.find((x) => x.id === id);
  if (!s) return null;
  const p = w.projects.find((x) => x.slug === s.project);
  return (
    <>
      <Head icon={`story-${id}`} kicker={`A story · ${s.period}`} title={s.title} pen={p ? PEN[p.domain] : "#1b2437"} />
      <dl className="atlas-star">
        {([["Situation", s.s], ["Task", s.t], ["Action", s.a], ["Result", s.r]] as const)
          .filter(([, x]) => x).map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}
      </dl>
      {p && <ul className="atlas-list"><ProjectRow w={w} slug={p.slug} onPick={onPick} /></ul>}
    </>
  );
}

function DistrictCard({ w, id, onPick }: { w: WorldData; id: string; onPick: (p: Pick) => void }) {
  const d = w.domains.find((x) => x.id === id);
  const items = w.projects.filter((p) => p.domain === id).sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  return (
    <>
      <Head icon={`domain-${id}`} kicker={`${items.length} projects`} title={d?.label ?? id} pen={PEN[id]} />
      <ul className="atlas-list">{items.map((p) => <ProjectRow key={p.slug} w={w} slug={p.slug} onPick={onPick} />)}</ul>
    </>
  );
}

function ReachCard({ w, onPick }: { w: WorldData; onPick: (p: Pick) => void }) {
  const c = w.about?.contact;
  return (
    <>
      <div className="plane-who">
        <b>{w.profile.name}</b>
        {c?.open_to && <span>Open to {c.open_to.replace(/^Engineering leadership roles:\s*/i, "").replace(/\.$/, "")}</span>}
      </div>
      {c && <ReachOut name={w.profile.name} title={w.profile.headline.split("|")[0].trim()} c={c} />}
      <button className="plane-more" onClick={() => onPick({ kind: "about" })}>More about me →</button>
    </>
  );
}

function AboutCard({ w, onPick }: { w: WorldData; onPick: (p: Pick) => void }) {
  return (
    <>
      <Head icon="mark" kicker={w.profile.headline} title={w.profile.name} pen="#1b2437" />
      <button className="plane-throw is-small" onClick={() => onPick({ kind: "reach" })}>Throw me a paper plane ✈</button>
      {(w.about?.intro ?? [w.profile.line]).map((x, i) => <p key={i} className={i ? "" : "atlas-lede"}>{x}</p>)}
      <section><h3>Timeline</h3>
        {w.roles.map((r) => (
          <div className="atlas-role-read" key={r.id}>
            <b>{r.title}</b> · {r.employer}<small>{r.dates}</small>
          </div>
        ))}
      </section>
      {w.about && w.about.built.length > 0 && (
        <section><h3>Built for myself</h3>
          {w.about.built.map((b) => (
            <div className="atlas-role-read" key={b.name}>
              <a href={b.url} target="_blank" rel="noopener"><b>{b.name}</b></a><p>{b.line}</p>
            </div>
          ))}
        </section>
      )}
      {w.about && w.about.links.length > 0 && (
        <p className="atlas-links">{w.about.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener">{l.label}</a>))}</p>
      )}
      <section><h3>Reading the world</h3>
        <ul className="atlas-claims">
          <li>The plaza is now; each ring outwards is a year further back.</li>
          <li>Seven districts, one per domain. Each block is a project.</li>
          <li>The stones round the plaza are skills. Pick one to see where it was used.</li>
        </ul>
      </section>
      <p><a className="world-enter" href={`${ROOT}/studio/`}>Step into the studio</a>{" "}
         <button className="world-enter" onClick={() => onPick({ kind: "district", id: w.districts[0] })}>Start with a district</button></p>
    </>
  );
}
