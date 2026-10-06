# Portfolio

Seven years of engineering, plotted — [immkg.github.io/portfolio](https://immkg.github.io/portfolio)

Not a CV page. The site is generated from a private record of the work itself
(tickets, commits, reviews, chat and documents, attributed per project and per
person) and published through a redaction gate that refuses to ship anything
still carrying a client's name.

## How it fits together

```
../assistance/relaunch/                    private record — never published
  profiles/mayank/present/present.json       Present mode's screen-share-safe build
  profiles/mayank/portfolio/labels.json      curated label + redaction map
  scripts/export_world.py                    builds the world's terse dataset
  scripts/verify_portfolio.py                scans a built site for anything withheld

public/data/world.json     skills, projects, timeline, domains, story titles; one line each
public/world/icons/        the Present art the world uses
app/                       Next.js App Router, static export
```

Deliberately thin: no write-ups, architecture, diagrams, outcome claims or
activity counts are published. The detail stays in Present.

## Running it

```
nvm use                 # Node 22.23.2, pinned in .nvmrc
npm install
npm run world           # re-export the world from Present
npm run dev
npm run build           # static export to out/
```

After a build, before publishing:

```
python3 ../assistance/relaunch/scripts/verify_portfolio.py out
```

That scan is the gate. It exits non-zero if any withheld client name, internal
repository name or personal contact detail reached the built HTML.

## Disclosure

Products the company owned are named. Client names and client-owned product
names are replaced by what the client does ("a regulatory medical-writing
platform"). Architecture diagrams are redrawn with internal service and
repository names replaced by the part's function. Figures are rounded down.

## The world

The site opens straight into it (`/`, also `/world/`). The plaza is now; each
ring outwards is a year further back, to the rim. Seven districts, one per kind
of problem; a plinth is a project, its height how much of the record is mine.
Skill stones ring the plaza: pick one and threads run to every project that used
it, pick a project and they run back to its skills. Stories circle the project
they happened on. Long reads and diagrams open as a panel, never as geometry.
Code: `components/world/atlas/`.
