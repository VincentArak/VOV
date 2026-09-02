import { useCallback, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { Location } from '../types'
import { cn } from '../utils'

interface MapCanvasProps {
  imageUrl: string
  locations: Location[]
  editMode?: boolean
  selectedLocationId?: string | null
  onLocationClick?: (location: Location) => void
  onAddLocation?: (x: number, y: number) => void
  onMoveLocation?: (id: string, x: number, y: number) => void
  highlightIds?: string[]
  dimUnhighlighted?: boolean
  taskCountByLocation?: Record<string, number>
  hasChildMap?: (locationId: string) => boolean
}

export function MapCanvas({
  imageUrl,
  locations,
  editMode = false,
  selectedLocationId,
  onLocationClick,
  onAddLocation,
  onMoveLocation,
  highlightIds = [],
  dimUnhighlighted = false,
  taskCountByLocation = {},
  hasChildMap,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  const getPercentCoords = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      }
    },
    [],
  )

  const handleMapClick = (e: React.MouseEvent) => {
    if (!editMode || dragging) return
    if ((e.target as HTMLElement).closest('[data-location-pin]')) return
    const { x, y } = getPercentCoords(e)
    onAddLocation?.(x, y)
  }

  const handlePinMouseDown = (e: React.MouseEvent, locId: string) => {
    if (!editMode) return
    e.stopPropagation()
    setDragging(locId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !onMoveLocation) return
    const { x, y } = getPercentCoords(e)
    onMoveLocation(dragging, x, y)
  }

  const handleMouseUp = () => setDragging(null)

  const hasHighlightFilter = dimUnhighlighted && highlightIds.length > 0

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full select-none',
        editMode && 'cursor-crosshair',
      )}
      onClick={handleMapClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={imageUrl}
        alt="Map"
        className="w-full h-auto rounded-lg border border-border"
        draggable={false}
      />
      {locations.map((loc) => {
        const highlighted = highlightIds.includes(loc.id)
        const selected = selectedLocationId === loc.id
        const dimmed = hasHighlightFilter && !highlighted && !selected
        const taskCount = taskCountByLocation[loc.id] ?? 0
        const childMap = hasChildMap?.(loc.id)

        return (
          <div
            key={loc.id}
            data-location-pin
            className={cn(
              'absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5 transition-all duration-200',
              editMode && 'cursor-grab active:cursor-grabbing',
              selected && 'z-10 scale-110',
              dimmed && 'opacity-30 scale-90',
            )}
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
            onMouseDown={(e) => handlePinMouseDown(e, loc.id)}
            onClick={(e) => {
              e.stopPropagation()
              onLocationClick?.(loc)
            }}
          >
            <div className="relative">
              <MapPin
                size={28}
                className={cn(
                  'drop-shadow-lg',
                  highlighted || selected
                    ? 'text-accent fill-accent/30'
                    : 'text-danger fill-danger/30',
                )}
              />
              {taskCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-surface text-[10px] font-bold px-1 shadow">
                  {taskCount}
                </span>
              )}
              {childMap && (
                <span className="absolute -bottom-1 -right-2 w-[14px] h-[14px] flex items-center justify-center rounded-full bg-info text-white text-[8px] font-bold shadow">
                  ⊕
                </span>
              )}
            </div>
            <span
              className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded bg-surface-raised/90 border border-border whitespace-nowrap',
                (highlighted || selected) && 'border-accent text-accent',
              )}
            >
              {loc.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
