import type { MetadataRoute } from "next";

const BASE = "https://immkg.github.io/portfolio";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/work", "/about", "/studio"];
  return pages.map((p) => ({
    url: `${BASE}${p}/`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.6,
  }));
}
