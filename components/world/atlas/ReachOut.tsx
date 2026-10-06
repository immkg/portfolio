"use client";

import { useEffect, useState } from "react";
import type { Contact } from "./model";

/** A vCard with no phone number: scanning the QR, or opening the file, offers
 *  to save the contact with email, LinkedIn and the site. */
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

export default function ReachOut({ name, title, c }: { name: string; title: string; c: Contact }) {
  const [qr, setQr] = useState<string | null>(null);
  const [mode, setMode] = useState<"contact" | "site">("contact");
  const [said, setSaid] = useState<string | null>(null);
  const card = vcard(name, title, c);

  useEffect(() => {
    let live = true;
    import("qrcode").then((Q) =>
      Q.toDataURL(mode === "contact" ? card : c.site, { margin: 1, width: 360, color: { dark: "#1b2437", light: "#ffffff" } })
    ).then((u) => live && setQr(u)).catch(() => {});
    return () => { live = false; };
  }, [mode, card, c.site]);

  const flash = (m: string) => { setSaid(m); setTimeout(() => setSaid(null), 1800); };
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
  const mail = (subject: string, body: string) =>
    `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section className="reach">
      <h3><span aria-hidden="true">✈</span> Send me a paper plane</h3>
      <p className="reach-sub">Folded here, lands in my inbox. The résumé comes along if you want it.</p>
      {c.open_to && <p className="reach-open">{c.open_to}</p>}
      <div className="reach-actions">
        <a className="reach-main" href={mail("Hello from your portfolio", "Hi Mayank,\n\n")}>Fold a plane (email)</a>
        <a className="reach-main" href={c.resume} download>Take my résumé</a>
        {c.phone && <a href={`tel:${c.phone.replace(/\s+/g, "")}`}>Ring my desk</a>}
        {c.whatsapp && <a href={c.whatsapp} target="_blank" rel="noopener">WhatsApp me</a>}
        <a href={mail("A role you might like", "Hi Mayank,\n\nRole:\nCompany:\nLink:\n\n")}>I have a role for you</a>
        <button onClick={() => copy(c.email, "Email copied")}>Copy email</button>
        <button onClick={saveCard}>Pocket my contact</button>
        <button onClick={share}>Send this world to a friend</button>
        <a href={c.linkedin} target="_blank" rel="noopener">LinkedIn</a>
        <a href={c.github} target="_blank" rel="noopener">GitHub</a>
      </div>
      <div className="reach-qr">
        {qr ? <img src={qr} alt={mode === "contact" ? "QR code that saves my contact" : "QR code that opens this world"} width={150} height={150} /> : <div className="reach-qr-wait" />}
        <div>
          <div className="reach-tabs" role="tablist">
            <button role="tab" aria-selected={mode === "contact"} onClick={() => setMode("contact")}>Save contact</button>
            <button role="tab" aria-selected={mode === "site"} onClick={() => setMode("site")}>Open on phone</button>
          </div>
          <p className="atlas-note">
            {mode === "contact" ? "Scan with a phone camera to save my contact." : "Scan to carry on exploring on your phone."}
          </p>
          <p className="atlas-note">{c.email}{c.phone ? ` · ${c.phone}` : ""}{c.city ? ` · ${c.city}` : ""}</p>
        </div>
      </div>
      {said && <div className="reach-said" role="status">{said}</div>}
    </section>
  );
}
