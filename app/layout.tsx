import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { world } from "@/lib/data";
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
    default: "Mayank Kumar Gupta — a world of the work",
    template: "%s — Mayank Kumar Gupta",
  },
  description:
    "Engineering leader: skills, projects and a timeline, laid out as a world you can walk.",
  openGraph: {
    type: "website",
    siteName: "Mayank Kumar Gupta",
    url: "https://immkg.github.io/portfolio/",
    images: [{ url: "/og-card.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/og-card.jpg"] },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

const SHEETS = [
  { href: "/", label: "Enter the world" },
  { href: "/work/", label: "Skills and work" },
  { href: "/about/", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const w = world();
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
              Generated from a record of the work itself. Clients are described by
              what they do rather than named.
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
            <b>{w.projects.length}</b> projects
          </div>
          <div>
            revised <b>{w.built_at}</b>
          </div>
        </aside>
      </body>
    </html>
  );
}
