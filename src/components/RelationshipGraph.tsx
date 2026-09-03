import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Person, PersonRelationship, RelationshipTypeDef } from '../types'
import { getTypeColor, getTypeDef } from '../constants/relationships'

interface GraphNode {
  id: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
}

interface RelationshipGraphProps {
  people: Person[]
  relationships: PersonRelationship[]
  typeDefs: RelationshipTypeDef[]
  filterTypeIds?: string[]
  highlightPersonId?: string | null
  height?: number
}

export function RelationshipGraph({
  people,
  relationships,
  typeDefs,
  filterTypeIds,
  highlightPersonId,
  height = 480,
}: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const dragMovedRef = useRef(false)
  const nodesRef = useRef<GraphNode[]>([])
  const rafRef = useRef<number>(0)
  const navigate = useNavigate()

  const filteredRels = relationships.filter(
    (r) => !filterTypeIds || filterTypeIds.length === 0 || filterTypeIds.includes(r.type),
  )

  const connectedIds = new Set<string>()
  filteredRels.forEach((r) => {
    connectedIds.add(r.fromPersonId)
    connectedIds.add(r.toPersonId)
  })
  const visiblePeople = people.filter(
    (p) => connectedIds.has(p.id) || people.length <= 12,
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const cx = width / 2
    const cy = height / 2
    const initial: GraphNode[] = visiblePeople.map((p, i) => {
      const angle = (i / visiblePeople.length) * Math.PI * 2
      const r = Math.min(width, height) * 0.3
      return {
        id: p.id,
        name: p.name,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      }
    })
    nodesRef.current = initial
    setNodes(initial)
  }, [visiblePeople.map((p) => p.id).join(','), width, height])

  useEffect(() => {
    const tick = () => {
      const ns = nodesRef.current
      if (ns.length === 0) return

      const cx = width / 2
      const cy = height / 2

      for (const n of ns) {
        if (dragging === n.id) continue
        n.vx += (cx - n.x) * 0.002
        n.vy += (cy - n.y) * 0.002
      }

      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i]
          const b = ns[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.max(Math.hypot(dx, dy), 1)
          const force = 800 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (dragging !== a.id) {
            a.vx -= fx
            a.vy -= fy
          }
          if (dragging !== b.id) {
            b.vx += fx
            b.vy += fy
          }
        }
      }

      for (const rel of filteredRels) {
        const a = ns.find((n) => n.id === rel.fromPersonId)
        const b = ns.find((n) => n.id === rel.toPersonId)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.max(Math.hypot(dx, dy), 1)
        const target = 120
        const force = (dist - target) * 0.02
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        if (dragging !== a.id) {
          a.vx += fx
          a.vy += fy
        }
        if (dragging !== b.id) {
          b.vx -= fx
          b.vy -= fy
        }
      }

      for (const n of ns) {
        if (dragging === n.id) continue
        n.vx *= 0.85
        n.vy *= 0.85
        n.x += n.vx
        n.y += n.vy
        n.x = Math.max(40, Math.min(width - 40, n.x))
        n.y = Math.max(40, Math.min(height - 40, n.y))
      }

      setNodes([...ns])
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [filteredRels, width, height, dragging, visiblePeople.length])

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault()
    dragMovedRef.current = false
    setDragging(id)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return
    dragMovedRef.current = true
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const n = nodesRef.current.find((n) => n.id === dragging)
    if (n) {
      n.x = x
      n.y = y
      n.vx = 0
      n.vy = 0
      setNodes([...nodesRef.current])
    }
  }

  const handlePointerUp = () => {
    if (dragging && !dragMovedRef.current) {
      navigate(`/people/${dragging}`)
    }
    setDragging(null)
  }

  if (visiblePeople.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border text-text-muted text-sm"
        style={{ height }}
      >
        Add relationships between people to see the network
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-sm border border-frame-dark bg-surface overflow-hidden"
      style={{ height }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg width={width} height={height} className="absolute inset-0">
        <defs>
          {filteredRels.map((rel) => {
            const color = getTypeColor(typeDefs, rel.type)
            return (
              <marker
                key={`arrow-${rel.id}`}
                id={`arrow-${rel.id}`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L6,3 z" fill={color} />
              </marker>
            )
          })}
        </defs>
        {filteredRels.map((rel) => {
          const a = nodes.find((n) => n.id === rel.fromPersonId)
          const b = nodes.find((n) => n.id === rel.toPersonId)
          if (!a || !b) return null
          const color = getTypeColor(typeDefs, rel.type)
          const typeDef = getTypeDef(typeDefs, rel.type)
          const isSymmetric = typeDef?.isSymmetric ?? false
          return (
            <g key={rel.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeWidth={2}
                strokeOpacity={0.7}
                markerEnd={isSymmetric ? undefined : `url(#arrow-${rel.id})`}
              />
            </g>
          )
        })}
        {nodes.map((n) => {
          const highlighted = highlightPersonId === n.id
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={highlighted ? 22 : 18}
                fill={highlighted ? '#b67524' : '#73522d'}
                stroke={highlighted ? '#6d3517' : '#40270f'}
                strokeWidth={highlighted ? 3 : 2}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handlePointerDown(n.id, e)}
              />
              <text
                x={n.x}
                y={n.y + 32}
                textAnchor="middle"
                className="fill-text text-[11px] pointer-events-none select-none"
              >
                {n.name.length > 10 ? `${n.name.slice(0, 9)}…` : n.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function RelationshipLegend({
  typeDefs,
  activeTypeIds,
  onToggle,
}: {
  typeDefs: RelationshipTypeDef[]
  activeTypeIds: string[]
  onToggle: (typeId: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {typeDefs.map((type) => {
        const active = activeTypeIds.length === 0 || activeTypeIds.includes(type.id)
        return (
          <button
            key={type.id}
            onClick={() => onToggle(type.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-opacity cursor-pointer ${
              active ? 'opacity-100 border-border' : 'opacity-40 border-transparent'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: type.color }}
            />
            {type.name}
          </button>
        )
      })}
    </div>
  )
}
