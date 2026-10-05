import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import StudioMount from "@/components/world/StudioMount";
import type { Thing } from "@/components/world/Studio";

export const metadata: Metadata = {
  title: "The studio",
  description:
    "A one-room studio in Bangalore: the desk, the shelf, the workshop corner, " +
    "and three walls. Click anything.",
};

export default function StudioPage() {
  const things: Thing[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "content", "studio.json"), "utf8")
  );
  return (
    <>
      <StudioMount things={things} />
      {/* The room in words, for anything that cannot run it. */}
      <div className="visually-hidden">
        <h1>The studio</h1>
        <ul>
          {things.map((t) => (
            <li key={t.id}>
              <b>{t.label}.</b> {t.fact ?? ""}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
