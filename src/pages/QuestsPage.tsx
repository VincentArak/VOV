import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, Plus, Search, Star } from 'lucide-react'
import { db } from '../db'
import { useAppStore } from '../store'
import type { Task, TaskStatus } from '../types'
import {
  PRIORITIES,
  PRIORITY_COLORS,
  PRIORITY_HEX,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
} from '../constants'
import {
  areDependenciesMet,
  createEmptyTask,
  formatDate,
  getMissionDescendantIds,
  isOverdue,
  missionLabel,
  subtaskProgress,
} from '../utils'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'
import { cn } from '../utils'

export function QuestsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const tasksQuery = useLiveQuery(() => db.tasks.toArray())
  const isLoading = tasksQuery === undefined
  const tasks = tasksQuery ?? []
  const departments = useLiveQuery(() => db.departments.toArray()) ?? []
  const missions = useLiveQuery(() => db.missions.toArray()) ?? []
  const maps = useLiveQuery(() => db.maps.toArray()) ?? []
  const people = useLiveQuery(() => db.people.toArray()) ?? []
  const { toggleTrackTask, isTracked } = useAppStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [missionFilter, setMissionFilter] = useState<string>('all')
  const [mapFilter, setMapFilter] = useState<string>('all')
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [dragId, setDragId] = useState<string | null>(null)

  const createTask = useCallback(async () => {
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), -1)
    const task = createEmptyTask(maxOrder + 1)
    await db.tasks.add(task)
    navigate(`/quests/${task.id}`)
  }, [navigate, tasks])

  useEffect(() => {
    if ((location.state as { createNew?: boolean })?.createNew) {
      createTask()
      navigate('/quests', { replace: true, state: {} })
    }
  }, [location.state, createTask, navigate])

  const filtered = tasks
    .filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (departmentFilter !== 'all' && !t.departmentIds.includes(departmentFilter)) return false
      if (missionFilter !== 'all') {
        if (!t.missionId) return false
        if (t.missionId !== missionFilter) {
          const descendants = getMissionDescendantIds(missionFilter, missions)
          if (!descendants.has(t.missionId)) return false
        }
      }
      if (mapFilter !== 'all' && t.mapId !== mapFilter) return false
      if (personFilter !== 'all') {
        const involved =
          t.publisherIds.includes(personFilter) ||
          t.executorIds.includes(personFilter) ||
          t.reviewerIds.includes(personFilter) ||
          t.assistantIds.includes(personFilter)
        if (!involved) return false
      }
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const aTracked = isTracked(a.id) ? 0 : 1
      const bTracked = isTracked(b.id) ? 0 : 1
      if (aTracked !== bTracked) return aTracked - bTracked
      const aOrder = a.sortOrder ?? 0
      const bOrder = b.sortOrder ?? 0
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  const trackedTasks = filtered.filter((t) => isTracked(t.id))
  const otherTasks = filtered.filter((t) => !isTracked(t.id))

  const reorderTasks = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const list = [...filtered]
    const fromIdx = list.findIndex((t) => t.id === sourceId)
    const toIdx = list.findIndex((t) => t.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return

    const [moved] = list.splice(fromIdx, 1)
    list.splice(toIdx, 0, moved)

    await Promise.all(
      list.map((t, index) =>
        db.tasks.put({ ...t, sortOrder: index, updatedAt: new Date().toISOString() }),
      ),
    )
  }

  const activeCount = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'abandoned',
  ).length

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-fancy text-3xl text-accent [text-shadow:0_0_14px_rgba(255,209,0,0.25),1px_1px_0_#000]">
            Quest Log
          </h1>
          <p className="tabular mt-1 text-xs text-text-muted">
            {/* WoW caps your log at 25 quests; showing an active count in
                that shape makes the number feel like a resource. */}
            <span className="text-accent">{activeCount}</span> active ·{' '}
            <span className="text-text-dim">{tasks.length} total</span> · press{' '}
            <kbd className="rounded-sm border border-frame-dark bg-surface-overlay px-1.5 py-0.5 text-[10px] shadow-[0_0_0_1px_rgba(107,74,24,0.6)]">
              N
            </kbd>{' '}
            to accept a new quest
          </p>
        </div>
        <Button onClick={createTask}>
          <Plus size={15} aria-hidden="true" />
          New Quest
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-text-dim"
          />
          <Input
            data-search-input
            aria-label="Search quests"
            placeholder="Search quests… (press /)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
          options={[
            { value: 'all', label: 'All Statuses' },
            ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
        />
        <Select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Difficulties' },
            ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
          ]}
        />
        <Select
          aria-label="Filter by repository"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Repositories' },
            ...departments.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <Select
          aria-label="Filter by campaign"
          value={missionFilter}
          onChange={(e) => setMissionFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Campaigns' },
            ...missions.map((m) => ({ value: m.id, label: missionLabel(m, missions) })),
          ]}
        />
        <Select
          aria-label="Filter by zone"
          value={mapFilter}
          onChange={(e) => setMapFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Zones' },
            ...maps.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <Select
          aria-label="Filter by person"
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Characters' },
            ...people.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted" role="status">
          Loading quest log…
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Your quest log is empty"
          description="No quests match these filters. Accept a new one to begin."
          action={
            <Button onClick={createTask}>
              <Plus size={15} aria-hidden="true" />
              New Quest
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {trackedTasks.length > 0 && (
            <section>
              <QuestSectionHeader
                icon={<Star size={11} className="fill-accent text-accent" aria-hidden="true" />}
                label="Tracked"
                count={trackedTasks.length}
              />
              <TaskList
                tasks={trackedTasks}
                allTasks={tasks}
                isTracked={isTracked}
                onToggleTrack={toggleTrackTask}
                dragId={dragId}
                onDragStart={setDragId}
                onDragEnd={() => setDragId(null)}
                onDrop={reorderTasks}
              />
            </section>
          )}
          {otherTasks.length > 0 && (
            <section>
              {trackedTasks.length > 0 && (
                <QuestSectionHeader label="All Quests" count={otherTasks.length} />
              )}
              <TaskList
                tasks={otherTasks}
                allTasks={tasks}
                isTracked={isTracked}
                onToggleTrack={toggleTrackTask}
                dragId={dragId}
                onDragStart={setDragId}
                onDragEnd={() => setDragId(null)}
                onDrop={reorderTasks}
              />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

/** Collapsible-style category header, matching the quest log's zone rows. */
function QuestSectionHeader({
  icon,
  label,
  count,
}: {
  icon?: React.ReactNode
  label: string
  count: number
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {icon}
      <h2 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header">{label}</h2>
      <span className="tabular text-xs text-text-dim">({count})</span>
      <div className="wow-divider flex-1" />
    </div>
  )
}

function TaskList({
  tasks,
  allTasks,
  isTracked,
  onToggleTrack,
  dragId,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  tasks: Task[]
  allTasks: Task[]
  isTracked: (id: string) => boolean
  onToggleTrack: (id: string) => void
  dragId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDrop: (sourceId: string, targetId: string) => void
}) {
  return (
    <AnimatePresence>
      <div className="space-y-1.5">
        {tasks.map((task, index) => {
          const blocked = !areDependenciesMet(task, allTasks) && task.status === 'available'
          const progress = subtaskProgress(task)
          const tracked = isTracked(task.id)
          const done = task.status === 'completed'
          const readyToTurnIn = task.status === 'pending_review'

          const moveTo = (targetIndex: number) => {
            const target = tasks[targetIndex]
            if (target) onDrop(task.id, target.id)
          }

          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              draggable
              onDragStart={() => onDragStart(task.id)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId) onDrop(dragId, task.id)
              }}
              className={cn(dragId === task.id && 'opacity-40')}
            >
              <div
                className={cn(
                  'wow-hilight group flex items-center gap-2 rounded-sm border border-frame-dark px-2 py-2.5',
                  'bg-gradient-to-r from-surface-raised to-surface-raised/60',
                  'shadow-[0_0_0_1px_rgba(107,74,24,0.45),inset_0_1px_0_rgba(248,231,160,0.06)]',
                  'transition-shadow',
                  tracked &&
                    'from-accent/10 shadow-[0_0_0_1px_var(--color-gold-mid),inset_0_1px_0_rgba(248,231,160,0.15)]',
                  // Completed work recedes toward the background instead of
                  // being struck through — the game never uses strikethrough.
                  done && 'opacity-55',
                  blocked && 'opacity-50 saturate-50',
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Reorder "${task.title}". Use arrow up or down to move.`}
                  className="shrink-0 cursor-grab rounded p-2 text-text-dim opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group-hover:opacity-100 active:cursor-grabbing"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      moveTo(index - 1)
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      moveTo(index + 1)
                    }
                  }}
                >
                  <GripVertical size={14} aria-hidden="true" />
                </div>

                <button
                  className="shrink-0 cursor-pointer rounded p-2 text-text-dim transition-colors hover:text-accent"
                  onClick={() => onToggleTrack(task.id)}
                  aria-label={tracked ? 'Untrack quest' : 'Track quest'}
                  aria-pressed={tracked}
                >
                  <Star
                    size={15}
                    aria-hidden="true"
                    className={tracked ? 'fill-accent text-accent' : ''}
                  />
                </button>

                {/* Difficulty pip: the coloured square is how the game
                    signals at a glance whether a quest is worth doing. */}
                <span
                  aria-hidden="true"
                  className="h-7 w-1 shrink-0 rounded-full"
                  style={{
                    background: PRIORITY_HEX[task.priority],
                    boxShadow: `0 0 6px ${PRIORITY_HEX[task.priority]}66`,
                  }}
                />

                <Link to={`/quests/${task.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {readyToTurnIn && (
                      <span
                        className="wow-bob font-fancy text-base leading-none text-accent"
                        title="Ready to turn in"
                        aria-label="Ready to turn in"
                      >
                        ?
                      </span>
                    )}
                    <span
                      className={cn(
                        'truncate font-medium',
                        done ? 'text-ot-complete' : 'text-ot-normal group-hover:text-white',
                      )}
                    >
                      {task.title}
                    </span>
                    {blocked && (
                      <span className="tabular shrink-0 text-[10px] uppercase tracking-wide text-warning">
                        Locked
                      </span>
                    )}
                  </div>

                  <div className="tabular mt-0.5 flex items-center gap-2.5 text-[11px]">
                    <span className={PRIORITY_COLORS[task.priority]}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.dueDate && (
                      <span
                        className={
                          isOverdue(task.dueDate, task.status) ? 'text-danger' : 'text-text-dim'
                        }
                      >
                        {isOverdue(task.dueDate, task.status) ? 'Overdue ' : 'Due '}
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.linkedItems.length > 0 && (
                      <span className="text-q-heirloom">
                        {task.linkedItems.length} linked
                      </span>
                    )}
                  </div>

                  {progress.total > 0 && (
                    <ProgressBar
                      done={progress.done}
                      total={progress.total}
                      className="mt-1.5 max-w-xs"
                    />
                  )}
                </Link>

                <StatusBadge status={task.status} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </AnimatePresence>
  )
}
