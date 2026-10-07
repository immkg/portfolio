import { card, jpeg, OG_SIZE, OG_TYPE } from "@/lib/og";
import { world } from "@/lib/data";

export const dynamic = "force-static";
export const alt = "Skills and work of Mayank Kumar Gupta";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image() {
  const w = world();
  return card({
    kicker: "SKILLS AND WORK",
    title: "What I build, and with what",
    line: `${w.projects.length} projects across ${w.domains.map((d) => d.label.toLowerCase()).slice(0, 4).join(", ")} and more, with the skills and stories behind them.`,
    facts: [`${w.skills.length} skills`, `${w.projects.length} projects`, `${w.stories.length} stories`],
    backdrop: await jpeg("og-card.jpg"),
  });
}
