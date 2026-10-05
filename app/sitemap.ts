import type { MetadataRoute } from "next";
import { caseSlugs } from "@/lib/data";

const BASE = "https://immkg.github.io/portfolio";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/journey", "/work", "/stats", "/craft", "/about"];
  const cases = caseSlugs().map((s) => `/work/${s}`);
  return [...pages, ...cases].map((p) => ({
    url: `${BASE}${p}/`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : p.startsWith("/work/") ? 0.8 : 0.6,
  }));
}
