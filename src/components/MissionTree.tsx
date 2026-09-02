import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Mission } from '../types'
import { MISSION_STATUS_COLORS } from '../constants/missions'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../utils'

interface MissionTreeProps {
  onSelect?: (mission: Mission) => void
  selectedId?: string | null
  onAdd?: (parentId: string | null) => void
  onEdit?: (mission: Mission) => void
  onDelete?: (mission: Mission) => void
}

function TreeNode({
  mission,
  level,
  onSelect,
  selectedId,
  onAdd,
  onEdit,
  onDelete,
}: {
  mission: Mission & { children: Mission[] }
  level: number
} & MissionTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = mission.children.length > 0

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors',
          selectedId === mission.id
            ? 'bg-accent/15 text-accent'
            : 'hover:bg-surface-overlay text-text',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(mission)}
      >
        <button
          className="shrink-0 text-text-muted hover:text-text cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3.5" />
          )}
        </button>
        <span
          className={cn('w-2 h-2 rounded-full shrink-0', MISSION_STATUS_COLORS[mission.status])}
          title={mission.status}
        />
        <span className="flex-1 truncate">{mission.name}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          {onAdd && (
            <button
              className="p-0.5 text-text-muted hover:text-accent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onAdd(mission.id)
              }}
              title="Add sub-mission"
            >
              <Plus size={13} />
            </button>
          )}
          {onEdit && (
            <button
              className="p-0.5 text-text-muted hover:text-info cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(mission)
              }}
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              className="p-0.5 text-text-muted hover:text-danger cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(mission)
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      {expanded &&
        hasChildren &&
        (mission.children as (Mission & { children: Mission[] })[]).map((child) => (
          <TreeNode
            key={child.id}
            mission={child}
            level={level + 1}
            onSelect={onSelect}
            selectedId={selectedId}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </div>
  )
}

export function MissionTree(props: MissionTreeProps) {
  const missions = useLiveQuery(() => db.missions.toArray()) ?? []

  const buildTree = (
    items: Mission[],
  ): (Mission & { children: Mission[] })[] => {
    const map = new Map<string, Mission & { children: Mission[] }>()
    items.forEach((m) => map.set(m.id, { ...m, children: [] }))
    const roots: (Mission & { children: Mission[] })[] = []
    map.forEach((mission) => {
      if (mission.parentId && map.has(mission.parentId)) {
        map.get(mission.parentId)!.children.push(mission)
      } else {
        roots.push(mission)
      }
    })
    roots.sort((a, b) => a.sortOrder - b.sortOrder)
    map.forEach((m) => m.children.sort((a, b) => a.sortOrder - b.sortOrder))
    return roots
  }

  const tree = buildTree(missions)

  if (tree.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-4">No missions yet</p>
    )
  }

  return (
    <div className="space-y-0.5">
      {tree.map((mission) => (
        <TreeNode key={mission.id} mission={mission} level={0} {...props} />
      ))}
    </div>
  )
}
