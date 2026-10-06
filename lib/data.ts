import fs from "node:fs";
import path from "node:path";
import type { WorldData } from "@/components/world/atlas/model";

/** The one public dataset: terse skills, projects, timeline, domains and
 *  story titles, exported from Present by relaunch/scripts/export_world.py. */
export const world = (): WorldData =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "world.json"), "utf8"));
