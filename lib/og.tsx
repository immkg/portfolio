import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";

/* Share cards, drawn at build time: 1200x630, the size every network crops
   to. One layout for all of them: a white paper card on the left with what
   the page is, the drawn art on the right, and my name and address at the
   foot so a card is never anonymous once it leaves the site. */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const INK = "#1b2437", INK2 = "#4e5a74", INK3 = "#7b87a3";
const pub = (...p: string[]) => path.join(process.cwd(), "public", ...p);

const fonts = () => [500, 700, 800].map((weight) => ({
  name: "Archivo",
  data: fs.readFileSync(path.join(process.cwd(), "assets", "fonts", `Archivo-${weight}.ttf`)),
  weight: weight as 500 | 700 | 800,
  style: "normal" as const,
}));

/** The art is webp, which the card renderer cannot read; hand it a PNG. */
export async function art(rel: string, size?: number) {
  const file = pub(rel);
  if (!fs.existsSync(file)) return null;
  let img = sharp(file);
  if (size) img = img.resize(size, size, { fit: "inside" });
  const buf = await img.png().toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function jpeg(rel: string) {
  return `data:image/jpeg;base64,${fs.readFileSync(pub(rel)).toString("base64")}`;
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, "") + "…" : s);

export async function card({ kicker, title, line, facts, pen = "#5a62e8", tint = "#eef1fb", picture, backdrop }: {
  kicker: string; title: string; line: string; facts?: string[];
  pen?: string; tint?: string; picture?: string | null; backdrop?: string | null;
}) {
  const me = await art("me.png", 128);
  const big = title.length > 30 ? 50 : 62;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: tint, fontFamily: "Archivo" }}>
        {backdrop && (
          <img src={backdrop} width={820} height={630} style={{ position: "absolute", right: 0, top: 0, objectFit: "cover" }} />
        )}
        {picture && (
          <div style={{ position: "absolute", right: 60, top: 85, width: 460, height: 460, borderRadius: 230,
                        background: "rgba(255,255,255,0.75)", border: `4px solid ${pen}`, display: "flex",
                        alignItems: "center", justifyContent: "center" }}>
            <img src={picture} width={360} height={360} style={{ objectFit: "contain" }} />
          </div>
        )}
        <div style={{ position: "absolute", left: 48, top: 48, bottom: 48, width: 610, display: "flex", flexDirection: "column",
                      background: "#ffffff", border: `3px solid ${INK}`, borderRadius: 28, padding: "40px 44px",
                      boxShadow: "0 18px 40px rgba(27,36,55,0.18)" }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: pen, letterSpacing: 0.5 }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: big, fontWeight: 800, color: INK, lineHeight: 1.05, marginTop: 14 }}>{clip(title, 60)}</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: INK2, lineHeight: 1.35, marginTop: 18 }}>{clip(line, 150)}</div>
          {facts && facts.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
              {facts.slice(0, 4).map((f) => (
                <div key={f} style={{ display: "flex", fontSize: 20, fontWeight: 700, color: INK, background: tint,
                                      border: `2px solid ${pen}`, borderRadius: 999, padding: "4px 14px" }}>{f}</div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexGrow: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: "2px solid #e3e8f3", paddingTop: 18 }}>
            {me && <img src={me} width={64} height={64} style={{ borderRadius: 32 }} />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: INK }}>Mayank Kumar Gupta</div>
              <div style={{ display: "flex", fontSize: 19, fontWeight: 500, color: INK3 }}>Engineering Leader · immkg.github.io</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts() },
  );
}
