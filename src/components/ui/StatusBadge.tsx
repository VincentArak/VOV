import type { TaskStatus } from '../../types'
import { STATUS_COLORS, STATUS_LABELS } from '../../constants'
import { cn } from '../../utils'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white',
        STATUS_COLORS[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
