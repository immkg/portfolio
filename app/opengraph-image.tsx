import { card, jpeg, OG_SIZE, OG_TYPE } from "@/lib/og";
import { world } from "@/lib/data";

export const dynamic = "force-static";
export const alt = "Mayank Kumar Gupta, engineering leader: a world of the work you can walk";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image() {
  const w = world();
  return card({
    kicker: "A WORLD OF THE WORK",
    title: "Mayank Kumar Gupta",
    line: "Engineering leader for SaaS and AI products. My work since 2019, as a world you can walk.",
    facts: [`${w.projects.length} projects`, `${w.skills.length} skills`, `${w.stories.length} stories`],
    backdrop: await jpeg("og-card.jpg"),
  });
}
