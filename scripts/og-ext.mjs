// GitHub Pages serves a file by its extension, and Next writes share cards
// as bare "opengraph-image". Give them ".png" so every network reads them as
// images, and point the pages' tags at the new names.
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");
let cards = 0, pages = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "opengraph-image") { fs.renameSync(p, p + ".png"); cards++; }
    else if (/\.(html|txt)$/.test(e.name)) {
      const s = fs.readFileSync(p, "utf8");
      const t = s.replace(/\/opengraph-image\?/g, "/opengraph-image.png?");
      if (t !== s) { fs.writeFileSync(p, t); pages++; }
    }
  }
};
walk(OUT);
console.log(`og-ext: ${cards} cards renamed, ${pages} files repointed`);
