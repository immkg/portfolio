# Portfolio

Seven years of engineering, plotted — [immkg.github.io/portfolio](https://immkg.github.io/portfolio)

Not a CV page. The site is generated from a private record of the work itself
(tickets, commits, reviews, chat and documents, attributed per project and per
person) and published through a redaction gate that refuses to ship anything
still carrying a client's name.

## How it fits together

```
../assistance/relaunch/            private record — never published
  profiles/_kt/                      84 project cards, claims, stories, diagrams
  profiles/mayank/portfolio/labels.json  curated label + redaction map
  scripts/export_portfolio.py        builds the public dataset
  scripts/verify_portfolio.py        scans a built site for anything withheld

public/data/constellation.json     77 plotted projects, positions and metrics
public/data/{stats,journey}.json   the numbers and the four eras
content/work/<slug>.json           the 9 written-up case studies
app/                               Next.js App Router, static export
```

## Running it

```
nvm use                 # Node 22.23.2, pinned in .nvmrc
npm install
npm run data            # re-export from the private record
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
