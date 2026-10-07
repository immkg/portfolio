import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mayank Kumar Gupta — a world of the work",
    short_name: "Mayank",
    description: "Engineering leader: skills, projects and a timeline, laid out as a world you can walk.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fd",
    theme_color: "#1b2437",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
