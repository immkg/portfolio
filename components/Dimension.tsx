/** The time axis, drawn the way a drawing dimensions a length: witness lines at
 *  each end, ticks for each year, the measured span written at the ends. */
export default function Dimension({ from, to }: { from: string; to: string }) {
  const a = +from.slice(0, 4);
  const b = +to.slice(0, 4);
  const years = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  return (
    <div className="dimension" role="img" aria-label={`Recorded activity from ${a} to ${b}`}>
      <span>{a}</span>
      <span className="dimension-track">
        {years.slice(1, -1).map((y, i) => (
          <i
            key={y}
            className="dimension-tick"
            style={{ left: `${((i + 1) / (years.length - 1)) * 100}%` }}
          />
        ))}
      </span>
      <span>{b}</span>
    </div>
  );
}
