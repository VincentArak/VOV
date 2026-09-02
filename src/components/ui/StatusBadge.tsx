import type { TaskStatus } from '../../types'
import { STATUS_COLORS, STATUS_LABELS } from '../../constants'
import { cn } from '../../utils'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'tabular inline-flex shrink-0 items-center rounded-sm border border-frame-dark px-2 py-0.5',
        'text-[11px] font-medium uppercase tracking-wide text-white',
        'shadow-[0_0_0_1px_rgba(107,74,24,0.7),inset_0_1px_0_rgba(255,255,255,0.18)]',
        STATUS_COLORS[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
