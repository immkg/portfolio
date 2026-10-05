import Link from "next/link";
import Marker from "./Marker";
import { DOMAIN, num, type Node } from "@/lib/data";

export default function WorkRow({ n }: { n: Node }) {
  const body = (
    <>
      <Marker domain={n.domain} filled={n.case} />
      <span className="plot-row-label">{n.label}</span>
      <span className="plot-row-meta">{DOMAIN[n.domain]}</span>
      <span className="plot-row-meta">
        {n.first.slice(0, 4)}–{n.last.slice(0, 4)}
      </span>
      <span className="plot-row-meta" title={`${num(n.mine)} events of ${num(n.events)}`}>
        <span className="plot-row-bar">
          <span style={{ width: `${Math.max(2, Math.round(n.share * 100))}%` }} />
        </span>
      </span>
    </>
  );
  return n.case ? (
    <Link className="plot-row" data-case href={`/work/${n.slug}/`}>
      {body}
    </Link>
  ) : (
    <div className="plot-row">{body}</div>
  );
}
