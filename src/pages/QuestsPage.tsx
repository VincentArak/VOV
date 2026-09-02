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
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
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

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quest Log</h1>
          <p className="text-sm text-text-muted mt-1">
            {tasks.length} quest{tasks.length !== 1 ? 's' : ''} total · Press{' '}
            <kbd className="px-1 py-0.5 rounded bg-surface-overlay text-xs">N</kbd> to create
          </p>
        </div>
        <Button onClick={createTask}>
          <Plus size={16} />
          New Quest
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            data-search-input
            placeholder="Search quests... (press /)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
          options={[
            { value: 'all', label: 'All Statuses' },
            ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Priorities' },
            ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
          ]}
        />
        <Select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Departments' },
            ...departments.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <Select
          value={missionFilter}
          onChange={(e) => setMissionFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Missions' },
            ...missions.map((m) => ({ value: m.id, label: missionLabel(m, missions) })),
          ]}
        />
        <Select
          value={mapFilter}
          onChange={(e) => setMapFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Maps' },
            ...maps.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <Select
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All People' },
            ...people.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No quests found"
          description="Create your first quest to get started"
          action={
            <Button onClick={createTask}>
              <Plus size={16} />
              New Quest
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {trackedTasks.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-accent mb-3 flex items-center gap-1.5">
                <Star size={12} className="fill-accent" />
                Tracked ({trackedTasks.length})
              </h2>
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
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                  All Quests
                </h2>
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
      <div className="space-y-2">
        {tasks.map((task) => {
          const blocked = !areDependenciesMet(task, allTasks) && task.status === 'available'
          const progress = subtaskProgress(task)
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
              className={cn(dragId === task.id && 'opacity-50')}
            >
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-2 py-3 hover:border-accent/40 transition-colors group',
                  isTracked(task.id) && 'border-accent/30 bg-accent/5',
                  blocked && 'opacity-60',
                )}
              >
                <div className="shrink-0 text-text-muted cursor-grab active:cursor-grabbing px-1">
                  <GripVertical size={16} />
                </div>
                <button
                  className="shrink-0 text-text-muted hover:text-accent transition-colors cursor-pointer"
                  onClick={() => onToggleTrack(task.id)}
                >
                  <Star
                    size={16}
                    className={isTracked(task.id) ? 'fill-accent text-accent' : ''}
                  />
                </button>
                <Link to={`/quests/${task.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{task.title}</span>
                    {blocked && (
                      <span className="text-xs text-warning">🔒 Locked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span className={PRIORITY_COLORS[task.priority]}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.dueDate && (
                      <span className={isOverdue(task.dueDate, task.status) ? 'text-danger' : ''}>
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                  {progress.total > 0 && (
                    <ProgressBar
                      done={progress.done}
                      total={progress.total}
                      className="mt-2 max-w-xs"
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
