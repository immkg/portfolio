import Link from "next/link";
import { constellation, DOMAIN, GLYPH, num, type Node } from "@/lib/data";

/* The plot, drawn as a static SVG on the server. This is the whole dataset —
   77 markers and the links between them — in the HTML itself, so it is
   readable with JavaScript off and indexable. It is also the poster the
   WebGL plot cross-fades over on capable devices. */

const W = 1000, H = 460, PAD_X = 54, PAD_Y = 34;
const X_SPAN = 120, Y_SPAN = 54;

const sx = (x: number) => PAD_X + ((x + X_SPAN / 2) / X_SPAN) * (W - PAD_X * 2);
const sy = (y: number) => PAD_Y + ((y + Y_SPAN / 2) / Y_SPAN) * (H - PAD_Y * 2);
const sr = (r: number) => Math.max(1.6, r * 3.2);

function glyph(n: Node, cx: number, cy: number) {
  const r = sr(n.r);
  const p = { strokeWidth: n.case ? 1.5 : 1.1, vectorEffect: "non-scaling-stroke" as const };
  switch (GLYPH[n.domain]) {
    case "square":
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} {...p} />;
    case "triangle":
      return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`} {...p} />;
    case "diamond":
      return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} {...p} />;
    case "cross":
      return (
        <g {...p}>
          <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
          <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} />
        </g>
      );
    case "chevron":
      return <polyline points={`${cx - r},${cy + r} ${cx},${cy - r} ${cx + r},${cy + r}`} {...p} />;
    case "bar":
      return <rect x={cx - r} y={cy - r / 2.4} width={r * 2} height={r / 1.2} {...p} />;
    default:
      return <circle cx={cx} cy={cy} r={r} {...p} />;
  }
}

export default function Plot() {
  const c = constellation();
  const nodes = c.nodes;
  const a = +c.span.first.slice(0, 4);
  const b = +c.span.last.slice(0, 4);
  const years = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const bandY = (d: string) => sy(nodes.find((n) => n.domain === d)?.y ?? 0);

  return (
    <figure className="plot" style={{ margin: "2.5rem 0 0" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`A plot of ${nodes.length} projects from ${a} to ${b}, placed by date and kind of problem, sized by how much of the work was mine.`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        {/* band rules — one per kind of problem */}
        {c.bands.map((d) => {
          const ys = nodes.filter((n) => n.domain === d).map((n) => sy(n.y));
          if (!ys.length) return null;
          const mid = ys.reduce((t, v) => t + v, 0) / ys.length;
          return (
            <g key={d}>
              <line x1={PAD_X} y1={mid} x2={W - PAD_X} y2={mid} stroke="var(--rule)" strokeWidth="1" />
              <text x={PAD_X - 8} y={mid + 3} textAnchor="end" fill="var(--ink-3)" fontSize="10">
                {DOMAIN[d].split(" ")[0]}
              </text>
            </g>
          );
        })}

        {/* links between projects that shared people */}
        <g stroke="var(--rule-bright)" fill="none">
          {c.edges.map((e, i) => (
            <line
              key={i}
              x1={sx(nodes[e.a].x)} y1={sy(nodes[e.a].y)}
              x2={sx(nodes[e.b].x)} y2={sy(nodes[e.b].y)}
              strokeWidth={Math.max(0.3, e.w * 1.1)}
              opacity={0.1 + e.w * 0.3}
            />
          ))}
        </g>

        {/* the markers */}
        <g fill="none">
          {nodes.map((n) => {
            const cx = sx(n.x), cy = sy(n.y);
            const mark = (
              <g
                stroke={n.case ? "var(--pen-2)" : "var(--pen-1)"}
                opacity={n.case ? 1 : 0.42 + Math.min(0.45, n.share)}
                className="plot-mark"
              >
                {glyph(n, cx, cy)}
                {n.case && <circle cx={cx} cy={cy} r={0.9} fill="var(--pen-2)" stroke="none" />}
                <title>
                  {n.label} — {DOMAIN[n.domain]}, {n.first.slice(0, 4)}–{n.last.slice(0, 4)},{" "}
                  {n.people} people, {num(n.mine)} events mine
                </title>
              </g>
            );
            return n.case ? (
              <Link key={n.slug} href={`/work/${n.slug}/`}>
                {mark}
              </Link>
            ) : (
              <g key={n.slug}>{mark}</g>
            );
          })}
        </g>

        {/* the time axis, dimensioned */}
        <g stroke="var(--rule-bright)" fill="var(--ink-3)" fontSize="10">
          <line x1={PAD_X} y1={H - 12} x2={W - PAD_X} y2={H - 12} />
          {years.map((y) => {
            const x = PAD_X + ((y - a) / (b - a)) * (W - PAD_X * 2);
            return (
              <g key={y}>
                <line x1={x} y1={H - 16} x2={x} y2={H - 8} />
                <text x={x} y={H + 2} textAnchor="middle" stroke="none">
                  {y}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption className="plot-row-meta" style={{ marginTop: "1.2rem", maxWidth: "62ch" }}>
        Each marker is a project, placed by when it ran and what kind of problem it
        was. Size is how much of its activity was mine; lines join projects that
        shared people. The {nodes.filter((n) => n.case).length} in amber have a case
        study behind them — follow one.
      </figcaption>
    </figure>
  );
}
