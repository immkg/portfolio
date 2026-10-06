import type { MetadataRoute } from "next";
import { world } from "@/lib/data";

const BASE = "https://immkg.github.io/portfolio";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const w = world();
  const at = new Date(w.built_at);
  const page = (p: string, priority: number) => ({
    url: `${BASE}${p}`, lastModified: at, changeFrequency: "monthly" as const, priority,
  });
  return [
    page("/", 1), page("/work/", 0.9), page("/about/", 0.8), page("/studio/", 0.4),
    ...w.projects.map((p) => page(`/work/${p.slug}/`, p.tier === 3 ? 0.8 : 0.6)),
    ...w.skills.map((s) => page(`/skills/${s.slug}/`, 0.5)),
  ];
}
