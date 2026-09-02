import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Department } from '../types'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../utils'

interface DepartmentTreeProps {
  onSelect?: (dept: Department) => void
  selectedId?: string | null
  onAdd?: (parentId: string | null) => void
  onEdit?: (dept: Department) => void
  onDelete?: (dept: Department) => void
}

function TreeNode({
  dept,
  level,
  onSelect,
  selectedId,
  onAdd,
  onEdit,
  onDelete,
}: {
  dept: Department & { children: Department[] }
  level: number
} & DepartmentTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = dept.children.length > 0

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors',
          selectedId === dept.id
            ? 'bg-accent/15 text-accent'
            : 'hover:bg-surface-overlay text-text',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(dept)}
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
        <span className="flex-1 truncate">{dept.name}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          {onAdd && (
            <button
              className="p-0.5 text-text-muted hover:text-accent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onAdd(dept.id)
              }}
              title="Add sub-department"
            >
              <Plus size={13} />
            </button>
          )}
          {onEdit && (
            <button
              className="p-0.5 text-text-muted hover:text-info cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(dept)
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
                onDelete(dept)
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      {expanded &&
        hasChildren &&
        (dept.children as (Department & { children: Department[] })[]).map((child) => (
          <TreeNode
            key={child.id}
            dept={child}
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

export function DepartmentTree(props: DepartmentTreeProps) {
  const departments = useLiveQuery(() => db.departments.toArray()) ?? []

  const buildTree = (
    items: Department[],
  ): (Department & { children: Department[] })[] => {
    const map = new Map<string, Department & { children: Department[] }>()
    items.forEach((d) => map.set(d.id, { ...d, children: [] }))
    const roots: (Department & { children: Department[] })[] = []
    map.forEach((dept) => {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId)!.children.push(dept)
      } else {
        roots.push(dept)
      }
    })
    roots.sort((a, b) => a.sortOrder - b.sortOrder)
    return roots
  }

  const tree = buildTree(departments)

  if (tree.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-4">No departments yet</p>
    )
  }

  return (
    <div className="space-y-0.5">
      {tree.map((dept) => (
        <TreeNode key={dept.id} dept={dept} level={0} {...props} />
      ))}
    </div>
  )
}
