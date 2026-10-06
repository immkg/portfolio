import type { Metadata } from "next";
import AtlasMount from "@/components/world/atlas/AtlasMount";
import AtlasIndex from "@/components/world/atlas/AtlasIndex";

export const metadata: Metadata = {
  title: { absolute: "Mayank Kumar Gupta — a world of the work" },
  description:
    "Walk through eight years of engineering: 84 projects in seven districts, " +
    "the skills behind them and the stories from them, with time as distance.",
};

export default function Home() {
  return (
    <>
      <AtlasMount />
      <AtlasIndex />
    </>
  );
}
