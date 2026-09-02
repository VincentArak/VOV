export function ProgressBar({
  done,
  total,
  className,
  label = 'objectives',
}: {
  done: number
  total: number
  className?: string
  label?: string
}) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  const complete = done === total

  return (
    <div className={className}>
      <div className="tabular mb-0.5 flex items-center justify-between text-[10px] text-ot-normal">
        <span>
          {done}/{total} {label}
        </span>
        <span className={complete ? 'text-success' : 'text-accent'}>{pct}%</span>
      </div>
      <div
        className="wow-bar h-2 rounded-sm"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} ${label} complete`}
      >
        <div
          className="wow-bar-fill rounded-sm"
          data-empty={done === 0}
          style={{
            ['--fill' as string]: pct,
            // Completed bars turn green, matching the game's finished-cast
            // colour; in progress stays gold.
            background: complete
              ? 'linear-gradient(180deg,#4dff4d,#1aff1a 55%,#00c000)'
              : 'linear-gradient(180deg,#ffe066,#ffd100 55%,#c4a300)',
          }}
        />
      </div>
    </div>
  )
}
