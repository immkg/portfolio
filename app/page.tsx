import type { Metadata } from "next";
import AtlasMount from "@/components/world/atlas/AtlasMount";
import AtlasIndex from "@/components/world/atlas/AtlasIndex";
import { PersonLd } from "@/components/pages/bits";
import { world } from "@/lib/data";

export const metadata: Metadata = {
  title: { absolute: "Mayank Kumar Gupta — Engineering Leader, CTO · a world of the work" },
  description:
    "Mayank Kumar Gupta, engineering leader for SaaS and AI products. Walk through his work since 2019: " +
    "84 projects in seven districts, the skills behind them and the stories from them.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Mayank Kumar Gupta — a world of the work",
    description: "Engineering leader for SaaS and AI products. Skills, projects and a timeline, laid out as a world you can walk.",
    url: "/",
  },
};

export default function Home() {
  return (
    <>
      <PersonLd w={world()} />
      <AtlasMount />
      <AtlasIndex />
    </>
  );
}
