import type { Metadata } from "next";
import AtlasMount from "@/components/world/atlas/AtlasMount";
import AtlasIndex from "@/components/world/atlas/AtlasIndex";

export const metadata: Metadata = {
  title: "The world",
  description: "The same world the home page opens into.",
  alternates: { canonical: "/" },
};

export default function WorldPage() {
  return (
    <>
      <AtlasMount />
      <AtlasIndex />
    </>
  );
}
