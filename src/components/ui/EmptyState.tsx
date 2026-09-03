import { cn } from '../../utils'

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded border border-dashed border-gold-lo/50 py-14 text-center',
        'bg-[radial-gradient(ellipse_at_center,rgba(255,209,0,0.04),transparent_70%)]',
        className,
      )}
    >
      <p className="font-fancy text-lg text-accent-dim">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-text-dim">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
