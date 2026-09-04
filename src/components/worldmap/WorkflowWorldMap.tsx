import {
  ArchiveRestore,
  BookOpen,
  Castle,
  Crown,
  Expand,
  LocateFixed,
  MapPinned,
  Minus,
  Plus,
  Shield,
  Sparkles,
  TreePine,
  X,
} from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import type { Priority, Task, WorldMapPosition } from '../../types'
import { subtaskProgress } from '../../utils'
import {
  DEFAULT_CONTINENTS,
  VORTEX,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  continentAt,
  pathFromPolygon,
  positionForTask,
  toLocalPosition,
  type WorldContinent,
} from '../../worldmap/model'

type Camera = { x: number; y: number; scale: number }
type PositionedTask = { task: Task; x: number; y: number; continent: WorldContinent }

interface WorkflowWorldMapProps {
  tasks: Task[]
  customContinents: WorldContinent[]
  search: string
  priorities: Set<Priority>
  backlogOpen: boolean
  onBacklogOpen: (open: boolean) => void
  onOpenTask: (task: Task) => void
  onMoveTask: (task: Task, status: Task['status'], position: WorldMapPosition) => Promise<void>
  onDeleteCustomContinent: (continent: WorldContinent) => void
}

const ICONS = {
  shield: Shield,
  crown: Crown,
  rune: Sparkles,
  tree: TreePine,
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 1, height: 1 })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}

const WorldQuestCard = memo(function WorldQuestCard({
  item,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  item: PositionedTask
  onOpen: (task: Task) => void
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, item: PositionedTask) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
}) {
  const { task, x, y } = item
  const progress = subtaskProgress(task)
  const doneRatio = progress.total ? progress.done / progress.total : 0
  return (
    <article
      className={`world-quest-card priority-${task.priority}`}
      style={{ left: x, top: y } as CSSProperties}
      data-world-interactive="true"
      data-task-id={task.id}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}, ${PRIORITY_LABEL[task.priority]} priority`}
      onPointerDown={(event) => onPointerDown(event, item)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(task)
      }}
    >
      <div className="world-quest-card-title">
        <span className="world-quest-shield" aria-hidden="true" />
        <span>{task.title}</span>
      </div>
      <div className="world-quest-card-meta">
        <strong>{PRIORITY_LABEL[task.priority]}</strong>
        {task.dueDate && <time>{new Date(task.dueDate).toLocaleDateString()}</time>}
      </div>
      <div className="world-quest-progress" aria-label={`${progress.done} of ${progress.total} subtasks`}>
        <span style={{ width: `${Math.round(doneRatio * 100)}%` }} />
        {Array.from({ length: Math.min(7, Math.max(4, progress.total || 5)) }, (_, index) => (
          <i key={index} className={index < progress.done ? 'complete' : undefined} />
        ))}
      </div>
      <span className="world-quest-ring left" aria-hidden="true" />
      <span className="world-quest-ring right" aria-hidden="true" />
    </article>
  )
})

export function WorkflowWorldMap({
  tasks,
  customContinents,
  search,
  priorities,
  backlogOpen,
  onBacklogOpen,
  onOpenTask,
  onMoveTask,
  onDeleteCustomContinent,
}: WorkflowWorldMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: .4 })
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: .4 })
  const [vortexPulse, setVortexPulse] = useState(false)
  const viewport = useElementSize(viewportRef)
  const continents = useMemo(
    () => [...DEFAULT_CONTINENTS, ...customContinents],
    [customContinents],
  )

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return tasks.filter((task) => {
      if (task.status === 'abandoned' || (
        task.status === 'available' && task.worldMapPosition?.continentId === 'backlog'
      )) return false
      if (priorities.size && !priorities.has(task.priority)) return false
      if (!query) return true
      return `${task.title} ${task.description} ${task.tags.join(' ')}`.toLocaleLowerCase().includes(query)
    })
  }, [priorities, search, tasks])

  const backlogTasks = useMemo(
    () => tasks.filter((task) => task.status === 'available' && task.worldMapPosition?.continentId === 'backlog'),
    [tasks],
  )

  const positionedTasks = useMemo(() => {
    const counters = new Map<string, number>()
    return visibleTasks.flatMap((task) => {
      const id = task.worldMapPosition?.continentId ?? (
        task.status === 'in_progress' ? 'in-progress'
          : task.status === 'pending_review' ? 'in-review'
            : task.status === 'completed' ? 'done' : 'todo'
      )
      const index = counters.get(id) ?? 0
      counters.set(id, index + 1)
      const position = positionForTask(task, continents, index)
      return position ? [{ task, ...position }] : []
    })
  }, [continents, visibleTasks])

  const continentCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of positionedTasks) counts.set(item.continent.id, (counts.get(item.continent.id) ?? 0) + 1)
    return counts
  }, [positionedTasks])

  const applyCamera = useCallback((next: Camera, syncControls = true) => {
    const bounded = { ...next, scale: Math.min(1.35, Math.max(.2, next.scale)) }
    cameraRef.current = bounded
    if (worldRef.current) {
      worldRef.current.style.transform = `translate3d(${bounded.x}px, ${bounded.y}px, 0) scale(${bounded.scale})`
    }
    if (syncControls) setCamera(bounded)
  }, [])

  const fitMap = useCallback(() => {
    const scale = Math.min(viewport.width / WORLD_WIDTH, viewport.height / WORLD_HEIGHT) * .98
    applyCamera({
      scale,
      x: (viewport.width - WORLD_WIDTH * scale) / 2,
      y: (viewport.height - WORLD_HEIGHT * scale) / 2,
    })
  }, [applyCamera, viewport.height, viewport.width])

  useEffect(() => {
    const frame = window.requestAnimationFrame(fitMap)
    return () => window.cancelAnimationFrame(frame)
  }, [fitMap])

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const previous = cameraRef.current
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top
    const scale = Math.min(1.35, Math.max(.2, previous.scale * factor))
    const worldX = (px - previous.x) / previous.scale
    const worldY = (py - previous.y) / previous.scale
    applyCamera({ x: px - worldX * scale, y: py - worldY * scale, scale })
  }, [applyCamera])

  const screenToWorld = useCallback((clientX: number, clientY: number): [number, number] => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const current = cameraRef.current
    return [
      (clientX - (rect?.left ?? 0) - current.x) / current.scale,
      (clientY - (rect?.top ?? 0) - current.y) / current.scale,
    ]
  }, [])

  const panRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    cameraX: number
    cameraY: number
  } | null>(null)

  const onViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-world-interactive]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cameraX: cameraRef.current.x,
      cameraY: cameraRef.current.y,
    }
    event.currentTarget.dataset.panning = 'true'
  }

  const onViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    applyCamera({
      ...cameraRef.current,
      x: pan.cameraX + event.clientX - pan.startX,
      y: pan.cameraY + event.clientY - pan.startY,
    }, false)
  }

  const finishPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId !== event.pointerId) return
    panRef.current = null
    delete event.currentTarget.dataset.panning
    setCamera({ ...cameraRef.current })
  }

  const dragRef = useRef<{
    pointerId: number
    item: PositionedTask
    element: HTMLElement
    startClientX: number
    startClientY: number
    grabX: number
    grabY: number
    moved: boolean
  } | null>(null)

  const setDropTargetVisual = useCallback((targetId?: string) => {
    const world = worldRef.current
    if (!world) return
    world.querySelector('.world-drop-zone.is-drop-target')?.classList.remove('is-drop-target')
    if (!targetId) {
      world.removeAttribute('data-drop-target')
      return
    }
    world.setAttribute('data-drop-target', targetId)
    if (targetId !== 'backlog') {
      const zone = Array.from(world.querySelectorAll<SVGPathElement>('.world-drop-zone'))
        .find((element) => element.dataset.continentId === targetId)
      zone?.classList.add('is-drop-target')
    }
  }, [])

  const beginTaskDrag = useCallback((event: ReactPointerEvent<HTMLElement>, item: PositionedTask) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const worldPoint = screenToWorld(event.clientX, event.clientY)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      item,
      element: event.currentTarget,
      startClientX: event.clientX,
      startClientY: event.clientY,
      grabX: worldPoint[0] - item.x,
      grabY: worldPoint[1] - item.y,
      moved: false,
    }
  }, [screenToWorld])

  const moveTaskDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    if (!drag.moved && Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) < 4) return
    drag.moved = true
    drag.element.dataset.dragging = 'true'
    const point = screenToWorld(event.clientX, event.clientY)
    const x = point[0] - drag.grabX
    const y = point[1] - drag.grabY
    drag.element.style.left = `${x}px`
    drag.element.style.top = `${y}px`
    const overVortex = Math.hypot(x - VORTEX.x, y - VORTEX.y) <= VORTEX.radius
    const overContinent = overVortex ? undefined : continentAt([x, y], continents)
    setDropTargetVisual(overVortex ? 'backlog' : overContinent?.id)
  }, [continents, screenToWorld, setDropTargetVisual])

  const finishTaskDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    dragRef.current = null
    delete drag.element.dataset.dragging
    setDropTargetVisual()
    if (!drag.moved) {
      onOpenTask(drag.item.task)
      return
    }
    const point = screenToWorld(event.clientX, event.clientY)
    const x = point[0] - drag.grabX
    const y = point[1] - drag.grabY
    if (Math.hypot(x - VORTEX.x, y - VORTEX.y) <= VORTEX.radius) {
      setVortexPulse(true)
      window.setTimeout(() => setVortexPulse(false), 720)
      void onMoveTask(drag.item.task, 'available', { continentId: 'backlog', x: 0, y: 0 })
      return
    }
    const destination = continentAt([x, y], continents)
    if (destination) {
      void onMoveTask(drag.item.task, destination.status, toLocalPosition(destination, [x, y]))
      return
    }
    drag.element.style.left = `${drag.item.x}px`
    drag.element.style.top = `${drag.item.y}px`
  }, [continents, onMoveTask, onOpenTask, screenToWorld, setDropTargetVisual])

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    zoomAt(event.deltaY > 0 ? .88 : 1.14, event.clientX, event.clientY)
  }

  const recenterFromMinimap = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const worldX = ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH
    const worldY = ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT
    const current = cameraRef.current
    applyCamera({
      ...current,
      x: viewport.width / 2 - worldX * current.scale,
      y: viewport.height / 2 - worldY * current.scale,
    })
  }

  const minimapView = {
    left: Math.max(0, (-camera.x / camera.scale / WORLD_WIDTH) * 100),
    top: Math.max(0, (-camera.y / camera.scale / WORLD_HEIGHT) * 100),
    width: Math.min(100, (viewport.width / camera.scale / WORLD_WIDTH) * 100),
    height: Math.min(100, (viewport.height / camera.scale / WORLD_HEIGHT) * 100),
  }

  return (
    <div
      ref={viewportRef}
      className="world-map-viewport"
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={finishPan}
      onPointerCancel={finishPan}
      onWheel={onWheel}
    >
      <div ref={worldRef} className="world-map-world" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT }}>
        <img className="world-map-art" src="/world-kanban-atlas-v1.webp" alt="" draggable={false} />
        <div className="world-map-ink-wash" aria-hidden="true" />

        {customContinents.map((continent) => (
          <div
            key={continent.id}
            className="world-custom-continent"
            style={{
              left: continent.bounds.x,
              top: continent.bounds.y,
              width: continent.bounds.width,
              height: continent.bounds.height,
            }}
          >
            <img src="/workflow-island-v1.webp" alt="" draggable={false} />
          </div>
        ))}

        <svg className="world-drop-zones" viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} aria-hidden="true">
          {continents.map((continent) => (
            <path
              key={continent.id}
              className="world-drop-zone"
              data-continent-id={continent.id}
              d={pathFromPolygon(continent.polygon)}
            />
          ))}
        </svg>

        {continents.map((continent) => {
          const Crest = ICONS[continent.crest]
          return (
            <section
              key={continent.id}
              className={`world-continent-label tone-${continent.tone}`}
              style={{ left: continent.label.x, top: continent.label.y }}
              aria-label={`${continent.name}: ${continentCounts.get(continent.id) ?? 0} quests`}
            >
              <div className="world-continent-banner">
                <span className="world-continent-crest"><Crest aria-hidden="true" /></span>
                <h2>{continent.name}</h2>
                <span className="world-continent-count">{continentCounts.get(continent.id) ?? 0}</span>
                {continent.custom && (
                  <button
                    className="world-continent-delete"
                    data-world-interactive="true"
                    onClick={() => onDeleteCustomContinent(continent)}
                    title="Remove custom continent"
                    aria-label={`Remove ${continent.name}`}
                  >
                    <X />
                  </button>
                )}
              </div>
              <h3>{continent.subtitle}</h3>
              <p>{continent.lore}</p>
            </section>
          )
        })}

        <button
          type="button"
          className={`world-vortex ${vortexPulse ? 'is-consuming' : ''}`}
          style={{ left: VORTEX.x, top: VORTEX.y }}
          data-world-interactive="true"
          aria-label={`Backlog maelstrom, ${backlogTasks.length} quests. Drop a quest here to return it to backlog.`}
          onClick={() => onBacklogOpen(true)}
        >
          <img src="/backlog-maelstrom-v1.webp" alt="" draggable={false} />
          <span>Backlog</span>
          <strong>{backlogTasks.length}</strong>
        </button>

        {positionedTasks.map((item) => (
          <WorldQuestCard
            key={item.task.id}
            item={item}
            onOpen={onOpenTask}
            onPointerDown={beginTaskDrag}
            onPointerMove={moveTaskDrag}
            onPointerUp={finishTaskDrag}
          />
        ))}

        <div className="world-sea-name">The Shattered Sea</div>
      </div>

      <div className="world-map-fog fog-one" aria-hidden="true" />
      <div className="world-map-fog fog-two" aria-hidden="true" />

      <div className="world-map-zoom" data-world-interactive="true">
        <button onClick={() => zoomAt(1.18)} aria-label="Zoom in"><Plus /></button>
        <div className="world-map-zoom-track"><span style={{ top: `${82 - ((camera.scale - .2) / 1.15) * 76}%` }} /></div>
        <button onClick={() => zoomAt(.84)} aria-label="Zoom out"><Minus /></button>
        <button onClick={fitMap} aria-label="Fit map"><LocateFixed /></button>
        <button
          onClick={() => viewportRef.current?.requestFullscreen?.()}
          aria-label="Enter full screen"
        ><Expand /></button>
      </div>

      <div className="world-minimap-panel" data-world-interactive="true">
        <h3><MapPinned /> Realm Overview</h3>
        <button className="world-minimap" onPointerDown={recenterFromMinimap} aria-label="Recenter using minimap">
          <span className="world-minimap-view" style={minimapView} />
        </button>
        <div className="world-minimap-legend">
          {DEFAULT_CONTINENTS.map((continent) => (
            <button
              key={continent.id}
              onClick={() => {
                const next = cameraRef.current
                applyCamera({
                  ...next,
                  x: viewport.width / 2 - continent.label.x * next.scale,
                  y: viewport.height / 2 - continent.label.y * next.scale,
                })
              }}
            >
              <i className={`tone-${continent.tone}`} /> {continent.name}
            </button>
          ))}
        </div>
        <button className="world-recenter" onClick={fitMap}><LocateFixed /> Re-center Map</button>
      </div>

      <div className="world-drag-hint" data-world-interactive="true">
        <Castle aria-hidden="true" />
        <div><strong>Drag &amp; Drop Quests</strong><span>Move quests between continents to update their status.</span></div>
      </div>

      <details className="world-map-legend" data-world-interactive="true">
        <summary><BookOpen /> Map Legend</summary>
        <p>Each landmass is a workflow stage. The ocean is neutral. Drop a quest into the central maelstrom to send it back to the backlog.</p>
      </details>

      {backlogOpen && (
        <aside className="world-backlog-drawer" data-world-interactive="true">
          <header>
            <div><ArchiveRestore /><span><small>The Maelstrom</small><strong>Quest Backlog</strong></span></div>
            <button onClick={() => onBacklogOpen(false)} aria-label="Close backlog"><X /></button>
          </header>
          <p>These quests wait beneath the tides. Restore one to the Uncharted Wilds.</p>
          <div className="world-backlog-list">
            {backlogTasks.length === 0 ? (
              <div className="world-backlog-empty">The waters are still. No quests in backlog.</div>
            ) : backlogTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => void onMoveTask(task, 'available', { continentId: 'todo', x: .5, y: .58 })}
              >
                <span>{task.title}</span><small><ArchiveRestore /> Restore to To Do</small>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  )
}
