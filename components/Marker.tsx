import { GLYPH } from "@/lib/data";

/** A plotted datum marker. Shape carries the domain; fill carries whether it
 *  is a project with a written case study behind it. */
export default function Marker({ domain, filled = false, size = 11 }:
  { domain: string; filled?: boolean; size?: number }) {
  const s = size;
  const h = s / 2;
  const stroke = "var(--pen, currentColor)";
  const fill = filled ? "var(--fill, none)" : "none";
  const shape = GLYPH[domain] ?? "circle";
  const common = { stroke, strokeWidth: 1.2, fill, vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true" data-domain={domain} style={{ overflow: "visible", flex: "none" }}>
      {shape === "circle" && <circle cx={h} cy={h} r={h - 1} {...common} />}
      {shape === "square" && <rect x={1} y={1} width={s - 2} height={s - 2} {...common} />}
      {shape === "triangle" && <polygon points={`${h},1 ${s - 1},${s - 1} 1,${s - 1}`} {...common} />}
      {shape === "diamond" && <polygon points={`${h},0.5 ${s - 0.5},${h} ${h},${s - 0.5} 0.5,${h}`} {...common} />}
      {shape === "cross" && (
        <>
          <line x1={1} y1={1} x2={s - 1} y2={s - 1} {...common} />
          <line x1={s - 1} y1={1} x2={1} y2={s - 1} {...common} />
        </>
      )}
      {shape === "chevron" && <polyline points={`1,${s - 2} ${h},2 ${s - 1},${s - 2}`} {...common} />}
      {shape === "bar" && <rect x={1} y={h - 1.5} width={s - 2} height={3} {...common} />}
    </svg>
  );
}
