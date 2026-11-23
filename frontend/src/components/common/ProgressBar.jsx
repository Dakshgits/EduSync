/** Continuous bar, or one segment per member when `segments` (array of booleans) is given. */
export default function ProgressBar({ value = 0, segments, label, className = '' }) {
  const color = value >= 100 ? 'bg-emerald-500' : value > 0 ? 'bg-amber-500' : 'bg-slate-300';
  return (
    <div className={className}>
      <div
        className="flex h-2 gap-1" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
        {segments && segments.length > 0 ? (
          segments.map((done, i) => <div key={i} className={`h-full flex-1 rounded-full ${done ? (value >= 100 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-200'}`} />)
        ) : (
          <div className="h-full w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
