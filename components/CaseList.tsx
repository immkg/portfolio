import Link from "next/link";
import { constellation, DOMAIN, type Node } from "@/lib/data";

export default function CaseList() {
  const cases = constellation().nodes.filter((n) => n.case).sort((a, b) => b.mine - a.mine);
  return (
    <div className="cases">
      {cases.map((n: Node) => (
        <Link className="case" key={n.slug} href={`/work/${n.slug}/`} data-domain={n.domain}>
          <div className="case-kind">{DOMAIN[n.domain]}</div>
          <h3 className="case-name">{n.label}</h3>
          <p className="case-line">{n.line}</p>
          <div className="case-meta">
            {n.first.slice(0, 4)}–{n.last.slice(0, 4)} · {n.people} people
          </div>
        </Link>
      ))}
    </div>
  );
}
