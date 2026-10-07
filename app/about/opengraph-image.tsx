import { card, jpeg, OG_SIZE, OG_TYPE } from "@/lib/og";

export const dynamic = "force-static";
export const alt = "About Mayank Kumar Gupta, engineering leader";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image() {
  return card({
    kicker: "ABOUT",
    title: "Mayank Kumar Gupta",
    line: "I run engineering for SaaS and AI products, and I stay hands on. Bengaluru; open to CTO, VP and Head of Engineering roles.",
    facts: ["CTO · Smarter.Codes", "IIT Palakkad"],
    backdrop: await jpeg("og-card.jpg"),
  });
}
