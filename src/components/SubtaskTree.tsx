import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { Subtask, TaskStatus } from '../types'
import { STATUS_LABELS, TASK_STATUSES } from '../constants'
import { Select } from './ui/Select'
import { cn } from '../utils'

interface SubtaskTreeProps {
  subtasks: Subtask[]
  level?: number
  onUpdate: (id: string, patch: Partial<Pick<Subtask, 'title' | 'status' | 'sortOrder'>>) => void
  onRemove: (id: string) => void
  onAddChild: (parentId: string | null) => void
}

function SubtaskNode({
  subtask,
  level,
  onUpdate,
  onRemove,
  onAddChild,
}: {
  subtask: Subtask
  level: number
} & Omit<SubtaskTreeProps, 'subtasks' | 'level'>) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = subtask.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2"
        style={{ marginLeft: level * 20 }}
      >
        <button
          className="shrink-0 text-text-muted hover:text-text cursor-pointer w-3.5"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3.5" />
          )}
        </button>
        <button
          className="shrink-0 cursor-pointer"
          onClick={() =>
            onUpdate(subtask.id, {
              status: subtask.status === 'completed' ? 'available' : 'completed',
            })
          }
        >
          <div
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              subtask.status === 'completed'
                ? 'bg-success border-success'
                : 'border-border hover:border-accent',
            )}
          >
            {subtask.status === 'completed' && <Check size={12} className="text-white" />}
          </div>
        </button>
        <input
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          value={subtask.title}
          onChange={(e) => onUpdate(subtask.id, { title: e.target.value })}
        />
        <Select
          value={subtask.status}
          onChange={(e) => onUpdate(subtask.id, { status: e.target.value as TaskStatus })}
          options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          className="w-32 shrink-0"
        />
        <button
          className="p-0.5 text-text-muted hover:text-accent cursor-pointer shrink-0"
          onClick={() => onAddChild(subtask.id)}
          title="Add sub-objective"
        >
          <Plus size={14} />
        </button>
        <button
          className="p-0.5 text-text-muted hover:text-danger cursor-pointer shrink-0"
          onClick={() => onRemove(subtask.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && hasChildren && (
        <div className="mt-2 space-y-2">
          <SubtaskTree
            subtasks={subtask.children}
            level={level + 1}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onAddChild={onAddChild}
          />
        </div>
      )}
    </div>
  )
}

export function SubtaskTree({
  subtasks,
  level = 0,
  onUpdate,
  onRemove,
  onAddChild,
}: SubtaskTreeProps) {
  return (
    <>
      {subtasks.map((subtask) => (
        <SubtaskNode
          key={subtask.id}
          subtask={subtask}
          level={level}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onAddChild={onAddChild}
        />
      ))}
    </>
  )
}
