export function ProgressBar({
  done,
  total,
  className,
}: {
  done: number
  total: number
  className?: string
}) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[10px] text-text-muted mb-0.5">
        <span>{done}/{total} objectives</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
