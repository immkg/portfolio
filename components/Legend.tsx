import { constellation, DOMAIN } from "@/lib/data";
import Marker from "./Marker";

export default function Legend() {
  const c = constellation();
  return (
    <ul className="legend">
      {c.bands.map((d) => (
        <li key={d} data-domain={d}>
          <Marker domain={d} />
          {DOMAIN[d]}
          <b>{c.nodes.filter((n) => n.domain === d).length}</b>
        </li>
      ))}
    </ul>
  );
}
