import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { db } from '../db'
import type { GameMap } from '../types'
import { useBlobUrl } from '../hooks/useBlobUrl'
import { cn } from '../utils'

interface MapTreeProps {
  onSelect?: (map: GameMap) => void
  selectedId?: string | null
  onAddChild?: (parentId: string) => void
  onDelete?: (map: GameMap) => void
}

function MapTreeNode({
  map,
  level,
  onSelect,
  selectedId,
  onAddChild,
  onDelete,
}: {
  map: GameMap & { children: GameMap[] }
  level: number
} & MapTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const imageUrl = useBlobUrl(map.imageId)
  const locationCount =
    useLiveQuery(() => db.locations.where('mapId').equals(map.id).count()) ?? 0
  const hasChildren = map.children.length > 0

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer transition-colors',
          selectedId === map.id
            ? 'bg-accent/15 text-accent'
            : 'hover:bg-surface-overlay text-text',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(map)}
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
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-8 h-5 rounded object-cover shrink-0" />
        ) : (
          <span className="w-8 h-5 rounded bg-surface-overlay shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium">{map.name}</div>
          <div className="text-[10px] text-text-muted">
            {locationCount} loc · {map.children.length} sub-map{map.children.length !== 1 ? 's' : ''}
          </div>
        </div>
        <Link
          to={`/maps/${map.id}`}
          className="hidden group-hover:inline text-xs text-accent shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          Open
        </Link>
        <div className="hidden group-hover:flex items-center gap-0.5">
          {onAddChild && (
            <button
              className="p-0.5 text-text-muted hover:text-accent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(map.id)
              }}
              title="Add sub-map"
            >
              <Plus size={13} />
            </button>
          )}
          {onDelete && (
            <button
              className="p-0.5 text-text-muted hover:text-danger cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(map)
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      {expanded &&
        hasChildren &&
        (map.children as (GameMap & { children: GameMap[] })[]).map((child) => (
          <MapTreeNode
            key={child.id}
            map={child}
            level={level + 1}
            onSelect={onSelect}
            selectedId={selectedId}
            onAddChild={onAddChild}
            onDelete={onDelete}
          />
        ))}
    </div>
  )
}

export function MapTree(props: MapTreeProps) {
  const maps = useLiveQuery(() => db.maps.toArray()) ?? []

  const buildTree = (): (GameMap & { children: GameMap[] })[] => {
    const map = new Map<string, GameMap & { children: GameMap[] }>()
    maps.forEach((m) => map.set(m.id, { ...m, children: [] }))
    const roots: (GameMap & { children: GameMap[] })[] = []
    map.forEach((m) => {
      if (m.parentMapId && map.has(m.parentMapId)) {
        map.get(m.parentMapId)!.children.push(m)
      } else {
        roots.push(m)
      }
    })
    return roots
  }

  const tree = buildTree()

  if (tree.length === 0) {
    return <p className="text-sm text-text-muted text-center py-4">No maps yet</p>
  }

  return (
    <div className="space-y-0.5">
      {tree.map((m) => (
        <MapTreeNode key={m.id} map={m} level={0} {...props} />
      ))}
    </div>
  )
}
