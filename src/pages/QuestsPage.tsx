import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDeferredValue, useEffect, useCallback, useMemo, useState } from 'react'
import { GitMerge, GitPullRequest, GripVertical, Plus, Search, Star, Ticket } from 'lucide-react'
import { db } from '../db'
import { useAppStore } from '../store'
import type { LinkedItem, Task, TaskStatus } from '../types'
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

const EMPTY_LIST: never[] = []

export function QuestsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const tasksQuery = useLiveQuery(() => db.tasks.toArray())
  const isLoading = tasksQuery === undefined
  const tasks = tasksQuery ?? EMPTY_LIST
  const departments = useLiveQuery(() => db.departments.toArray()) ?? EMPTY_LIST
  const missions = useLiveQuery(() => db.missions.toArray()) ?? EMPTY_LIST
  const maps = useLiveQuery(() => db.maps.toArray()) ?? EMPTY_LIST
  const people = useLiveQuery(() => db.people.toArray()) ?? EMPTY_LIST
  const toggleTrackTask = useAppStore((state) => state.toggleTrackTask)
  const trackedTaskIds = useAppStore((state) => state.settings?.trackedTaskIds)
  const trackedIds = useMemo(() => new Set(trackedTaskIds ?? []), [trackedTaskIds])
  const isTracked = useCallback((taskId: string) => trackedIds.has(taskId), [trackedIds])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [missionFilter, setMissionFilter] = useState<string>('all')
  const [mapFilter, setMapFilter] = useState<string>('all')
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [dragId, setDragId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  const maxSortOrder = useMemo(
    () => tasks.reduce((max, task) => Math.max(max, task.sortOrder ?? 0), -1),
    [tasks],
  )

  const createTask = useCallback(async () => {
    const task = createEmptyTask(maxSortOrder + 1)
    await db.tasks.add(task)
    navigate(`/quests/${task.id}`)
  }, [navigate, maxSortOrder])

  useEffect(() => {
    if ((location.state as { createNew?: boolean })?.createNew) {
      createTask()
      navigate('/quests', { replace: true, state: {} })
    }
  }, [location.state, createTask, navigate])

  const missionDescendants = useMemo(
    () => missionFilter === 'all' ? null : getMissionDescendantIds(missionFilter, missions),
    [missionFilter, missions],
  )

  const { filtered, trackedTasks, otherTasks } = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase()
    const filteredTasks = tasks
      .filter((task) => {
        if (statusFilter !== 'all' && task.status !== statusFilter) return false
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
        if (departmentFilter !== 'all' && !task.departmentIds.includes(departmentFilter)) return false
        if (missionFilter !== 'all') {
          if (!task.missionId) return false
          if (task.missionId !== missionFilter && !missionDescendants?.has(task.missionId)) return false
        }
        if (mapFilter !== 'all' && task.mapId !== mapFilter) return false
        if (personFilter !== 'all') {
          const involved =
            task.publisherIds.includes(personFilter) ||
            task.executorIds.includes(personFilter) ||
            task.reviewerIds.includes(personFilter) ||
            task.assistantIds.includes(personFilter)
          if (!involved) return false
        }
        if (normalizedSearch && !task.title.toLocaleLowerCase().includes(normalizedSearch)) return false
        return true
      })
      .sort((a, b) => {
        const trackedOrder = Number(trackedIds.has(b.id)) - Number(trackedIds.has(a.id))
        if (trackedOrder !== 0) return trackedOrder
        const sortOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        if (sortOrder !== 0) return sortOrder
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      })

    return {
      filtered: filteredTasks,
      trackedTasks: filteredTasks.filter((task) => trackedIds.has(task.id)),
      otherTasks: filteredTasks.filter((task) => !trackedIds.has(task.id)),
    }
  }, [
    departmentFilter,
    mapFilter,
    missionDescendants,
    missionFilter,
    personFilter,
    priorityFilter,
    deferredSearch,
    statusFilter,
    tasks,
    trackedIds,
  ])

  const reorderTasks = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const list = [...filtered]
    const fromIdx = list.findIndex((t) => t.id === sourceId)
    const toIdx = list.findIndex((t) => t.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return

    const [moved] = list.splice(fromIdx, 1)
    list.splice(toIdx, 0, moved)

    const updatedAt = new Date().toISOString()
    await db.tasks.bulkPut(
      list.map((task, index) => ({ ...task, sortOrder: index, updatedAt })),
    )
  }

  const activeCount = useMemo(
    () => tasks.reduce(
      (count, task) => count + Number(task.status !== 'completed' && task.status !== 'abandoned'),
      0,
    ),
    [tasks],
  )

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
            <div
              key={task.id}
              draggable
              onDragStart={() => onDragStart(task.id)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId) onDrop(dragId, task.id)
              }}
              className={cn('quest-row', dragId === task.id && 'opacity-40')}
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
                    <BindingChips items={task.linkedItems} />
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
            </div>
          )
        })}
    </div>
  )
}

/**
 * A quest is usually the local face of a ticket that ships as a pull
 * request, so the row shows how far that work has physically got. The
 * previous "N linked" count said something was attached but not whether it
 * was open, abandoned, or already shipped — which is the only part anyone
 * scans a list for.
 */
function BindingChips({ items }: { items: LinkedItem[] }) {
  if (items.length === 0) return null

  const gh = items.find((i) => i.provider === 'github')
  const jira = items.find((i) => i.provider === 'jira')

  return (
    <span className="inline-flex items-center gap-2">
      {gh && (
        <span
          className={cn(
            'inline-flex items-center gap-1',
            gh.status === 'merged' && 'text-q-epic',
            gh.status === 'open' && 'text-success',
            gh.status === 'closed' && 'text-text-dim',
            (gh.status === 'draft' || !gh.status) && 'text-text-muted',
          )}
          title={`${gh.externalId}${gh.status ? ` — ${gh.status}` : ''}`}
        >
          {gh.status === 'merged' ? (
            <GitMerge size={11} aria-hidden="true" />
          ) : (
            <GitPullRequest size={11} aria-hidden="true" />
          )}
          {gh.status ?? gh.externalId.split('#')[1]}
        </span>
      )}
      {jira && (
        <span className="inline-flex items-center gap-1 text-q-heirloom" title={jira.externalId}>
          <Ticket size={11} aria-hidden="true" />
          {jira.externalId}
        </span>
      )}
    </span>
  )
}
