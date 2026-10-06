import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { constellation } from "@/lib/data";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://immkg.github.io/portfolio/"),
  title: {
    default: "Mayank Kumar Gupta — engineering, plotted",
    template: "%s — Mayank Kumar Gupta",
  },
  description:
    "Seven years running the engineering function of a SaaS and AI product company, " +
    "drawn as a plot of 77 projects: what was built, who it was for, and what was decided.",
  openGraph: {
    type: "website",
    siteName: "Mayank Kumar Gupta",
    url: "https://immkg.github.io/portfolio/",
  },
  robots: { index: true, follow: true },
};

const SHEETS = [
  { href: "/plot/", label: "Plot" },
  { href: "/work/", label: "Work" },
  { href: "/journey/", label: "Journey" },
  { href: "/about/", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const c = constellation();
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <nav className="index" aria-label="Sheets">
          <div className="index-inner">
            <Link href="/" className="index-name">
              Mayank Kumar Gupta
            </Link>
            {SHEETS.map((s) => (
              <Link key={s.href} href={s.href}>
                {s.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
        <footer className="band">
          <div className="sheet datum">
            <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", maxWidth: "58ch" }}>
              Generated from a record of the work itself — tickets, commits, reviews
              and the diagrams drawn at the time. Clients are described by what they
              do rather than named, and figures are rounded down.
            </p>
            <p>
              <a href="mailto:mayankgupta690@gmail.com">mayankgupta690@gmail.com</a>
              {" · "}
              <a href="https://github.com/immkg">github.com/immkg</a>
              {" · "}
              <a href="https://www.linkedin.com/in/immkg/">linkedin.com/in/immkg</a>
            </p>
          </div>
        </footer>
        <aside className="title-block" aria-hidden="true">
          <div>
            <b>{c.totals.projects}</b> projects
          </div>
          <div>
            revised <b>{c.built_at}</b>
          </div>
        </aside>
      </body>
    </html>
  );
}
