"use client";

import { useEffect, useState } from "react";
import type { Contact } from "./model";

/** A vCard: scanning the QR, or opening the file, offers to save the contact. */
function vcard(name: string, title: string, c: Contact) {
  const [first, ...rest] = name.split(" ");
  return [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:${rest.join(" ")};${first};;;`, `FN:${name}`, `TITLE:${title}`,
    `EMAIL;TYPE=INTERNET:${c.email}`,
    c.phone ? `TEL;TYPE=CELL:${c.phone.replace(/\s+/g, "")}` : "",
    `URL:${c.site}`, `URL;TYPE=LinkedIn:${c.linkedin}`, `URL;TYPE=GitHub:${c.github}`,
    c.city ? `ADR;TYPE=WORK:;;;${c.city};;;` : "",
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}

const Plane = () => (
  <svg viewBox="0 0 64 48" width="64" height="48" aria-hidden="true">
    <path d="M2 22 L62 2 L40 46 L30 30 Z" fill="#fff" stroke="#1b2437" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M62 2 L30 30 L26 44 L34 33" fill="#dcdefb" stroke="#1b2437" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
);

/* small line icons, drawn rather than fetched */
const I = {
  in: <path d="M4 9h3v10H4zM5.5 4.5a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zM10 9h3v1.5c.5-.9 1.6-1.8 3.3-1.8 3 0 3.7 2 3.7 4.6V19h-3v-5c0-1.2-.1-2.6-1.7-2.6S13 12.6 13 14v5h-3z" fill="currentColor" />,
  gh: <path d="M12 3a9 9 0 00-2.8 17.5c.4.1.6-.2.6-.4v-1.6c-2.5.5-3-1.1-3-1.1-.4-1-1-1.3-1-1.3-.8-.6.1-.6.1-.6.9.1 1.4.9 1.4.9.8 1.4 2.1 1 2.6.8.1-.6.3-1 .6-1.2-2-.2-4.1-1-4.1-4.4 0-1 .3-1.8.9-2.4-.1-.2-.4-1.1.1-2.4 0 0 .8-.2 2.5.9a8.6 8.6 0 014.5 0c1.7-1.1 2.5-.9 2.5-.9.5 1.3.2 2.2.1 2.4.6.6.9 1.4.9 2.4 0 3.4-2.1 4.2-4.1 4.4.3.3.6.8.6 1.6v2.4c0 .2.2.5.6.4A9 9 0 0012 3z" fill="currentColor" />,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M5 15V6a1 1 0 011-1h9" fill="none" stroke="currentColor" strokeWidth="1.8" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="9" cy="11" r="2.2" fill="currentColor" /><path d="M5.5 16c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4M14 10h4M14 13h3" fill="none" stroke="currentColor" strokeWidth="1.6" /></>,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
};
const Ico = ({ d }: { d: React.ReactNode }) => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{d}</svg>;

export default function ReachOut({ name, title, c }: { name: string; title: string; c: Contact }) {
  const [msg, setMsg] = useState("");
  const [flying, setFlying] = useState(false);
  const [landed, setLanded] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [mode, setMode] = useState<"contact" | "site">("contact");
  const [said, setSaid] = useState<string | null>(null);
  const card = vcard(name, title, c);
  const tel = c.phone?.replace(/\s+/g, "");

  useEffect(() => {
    if (!qrOpen) return;
    let live = true;
    import("qrcode").then((Q) =>
      Q.toDataURL(mode === "contact" ? card : c.site, { margin: 1, width: 360, color: { dark: "#1b2437", light: "#ffffff" } })
    ).then((u) => live && setQr(u)).catch(() => {});
    return () => { live = false; };
  }, [qrOpen, mode, card, c.site]);

  const flash = (m: string) => { setSaid(m); setTimeout(() => setSaid(null), 2200); };
  const copy = async (text: string, m: string) => {
    try { await navigator.clipboard.writeText(text); flash(m); } catch { flash("Copy not allowed here"); }
  };
  const saveCard = () => {
    const url = URL.createObjectURL(new Blob([card], { type: "text/vcard" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${name.replace(/\s+/g, "_")}.vcf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const share = async () => {
    const data = { title: name, text: `${name}, ${title}`, url: c.site };
    if ((navigator as any).share) { try { await (navigator as any).share(data); return; } catch { return; } }
    copy(c.site, "Link copied");
  };
  const mailto = (subject: string, body: string) =>
    `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  /* fold the note into a plane and let it fly; then the visitor picks where it
     lands. A mailto link alone does nothing for anyone without a desktop mail
     app, so webmail and a plain copy are offered alongside it. */
  const subject = "A paper plane from your portfolio";
  const body = () => (msg.trim() || "Hi Mayank,") + "\n\n(thrown from your portfolio world)";
  const throwPlane = () => {
    setFlying(true);
    setTimeout(() => { setFlying(false); setLanded(true); }, 900);
  };
  const gmail = () =>
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body())}`;
  const outlook = () =>
    `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(c.email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body())}`;

  return (
    <section className="plane">
      <div className={`plane-art${flying ? " is-flying" : ""}`}><Plane /></div>
      <h3>Throw me a paper plane</h3>
      <p className="plane-sub">Write a line. I&rsquo;ll find it in my inbox.</p>
      <textarea
        value={msg} onChange={(e) => setMsg(e.target.value)} rows={3}
        placeholder="Hi Mayank, I took a walk through your world and have something worth a coffee…" aria-label="Your message"
      />
      {!landed ? (
        <button className="plane-throw" onClick={throwPlane} disabled={flying}>Fold &amp; throw ✈</button>
      ) : (
        <div className="plane-land" role="group" aria-label="Where should it land?">
          <p>It&rsquo;s airborne. Where should it land?</p>
          <div>
            <a href={gmail()} target="_blank" rel="noopener" onClick={() => flash("Landing in Gmail…")}>Gmail</a>
            <a href={outlook()} target="_blank" rel="noopener" onClick={() => flash("Landing in Outlook…")}>Outlook</a>
            <a href={mailto(subject, body())} onClick={() => flash("Opening your mail app…")}>Mail app</a>
            <button onClick={() => copy(`To: ${c.email}\nSubject: ${subject}\n\n${body()}`, "Copied. Paste it into any mail.")}>Copy</button>
          </div>
          <button className="plane-again" onClick={() => setLanded(false)}>← fold it again</button>
        </div>
      )}

      <div className="plane-tiles">
        <a href={mailto("Hello from your portfolio", "Hi Mayank,\n\n")}><b>✉</b>Email</a>
        {tel && <a href={`tel:${tel}`}><b>☎</b>Call</a>}
        {c.whatsapp && <a href={c.whatsapp} target="_blank" rel="noopener"><b>✆</b>WhatsApp</a>}
        <a href={c.resume} download><b>▤</b>Résumé</a>
      </div>

      <div className="plane-icons">
        <a href={c.linkedin} target="_blank" rel="noopener" title="LinkedIn" aria-label="LinkedIn"><Ico d={I.in} /></a>
        <a href={c.github} target="_blank" rel="noopener" title="GitHub" aria-label="GitHub"><Ico d={I.gh} /></a>
        <button onClick={() => copy(c.email, "Email copied")} title="Copy email" aria-label="Copy email"><Ico d={I.copy} /></button>
        <button onClick={saveCard} title="Save my contact" aria-label="Save my contact"><Ico d={I.card} /></button>
        <button onClick={share} title="Share this world" aria-label="Share this world"><Ico d={I.share} /></button>
      </div>

      <details className="plane-qr" onToggle={(e) => setQrOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Scan from your phone</summary>
        <div>
          {qr ? <img src={qr} alt={mode === "contact" ? "QR code that saves my contact" : "QR code that opens this world"} width={140} height={140} /> : <div className="plane-qr-wait" />}
          <div className="plane-qr-modes">
            <button aria-pressed={mode === "contact"} onClick={() => setMode("contact")}>Save my contact</button>
            <button aria-pressed={mode === "site"} onClick={() => setMode("site")}>Open this world</button>
          </div>
        </div>
      </details>
      {said && <div className="plane-said" role="status">{said}</div>}
    </section>
  );
}
