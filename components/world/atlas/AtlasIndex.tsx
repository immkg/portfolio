import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { WorldData } from "./model";

/** Everything in the world as plain text, for anything that cannot run it,
 *  crawlers and screen readers included. */
export default function AtlasIndex() {
  const w: WorldData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public", "data", "world.json"), "utf8"));
  return (
    <div className="visually-hidden">
      <h1>{w.profile.name}</h1>
      <p>{w.profile.headline}</p>
      <p>{w.profile.summary}</p>
      <h2>Roles</h2>
      <ul>{w.roles.map((r) => <li key={r.id}>{r.title}, {r.employer}, {r.dates}</li>)}</ul>
      <h2>Projects</h2>
      <ul>{w.projects.map((p) => <li key={p.slug}>{p.label}{p.line ? ` — ${p.line}` : ""}</li>)}</ul>
      <h2>Skills</h2>
      <p>{w.skills.map((s) => s.name).join(", ")}</p>
      <h2>Stories</h2>
      <ul>{w.stories.map((s) => <li key={s.id}>{s.title}</li>)}</ul>
      <p><Link href="/work/">The work as pages</Link></p>
    </div>
  );
}
