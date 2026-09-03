import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CircleGauge,
  GitBranch,
  Hand,
  Scroll,
  Star,
  SunMedium,
} from 'lucide-react'
import { db } from '../db'
import { useAppStore } from '../store'
import type { Task } from '../types'
import { PRIORITY_HEX } from '../constants'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDate, isDueToday, isOverdue } from '../utils'
import { cn } from '../utils'

const EMPTY_TASKS: Task[] = []

/**
 * Character overview rendered as an old quest ledger. The query and all links
 * deliberately stay on the existing data model; only the presentation changes.
 */
export function DashboardPage() {
  const tasksQuery = useLiveQuery(() => db.tasks.toArray())
  const isLoading = tasksQuery === undefined
  const tasks = tasksQuery ?? EMPTY_TASKS
  const trackedTaskIds = useAppStore((state) => state.settings?.trackedTaskIds)
  const trackedIds = useMemo(() => new Set(trackedTaskIds ?? []), [trackedTaskIds])
  const summary = useMemo(() => {
    const inProgress: Task[] = []
    const pendingReview: Task[] = []
    const overdue: Task[] = []
    const dueToday: Task[] = []
    const tracked: Task[] = []
    let activeCount = 0
    let completedCount = 0
    let linkedCount = 0

    for (const task of tasks) {
      if (task.status !== 'completed' && task.status !== 'abandoned') activeCount += 1
      if (task.status === 'in_progress') inProgress.push(task)
      if (task.status === 'pending_review') pendingReview.push(task)
      if (task.status === 'completed') completedCount += 1
      if (isOverdue(task.dueDate, task.status)) overdue.push(task)
      if (isDueToday(task.dueDate, task.status)) dueToday.push(task)
      if (trackedIds.has(task.id) && task.status !== 'completed') tracked.push(task)
      linkedCount += task.linkedItems.length
    }

    const recentlyUpdated = [...tasks]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 5)

    return {
      activeCount,
      completedCount,
      inProgress,
      pendingReview,
      overdue,
      dueToday,
      tracked,
      linkedCount,
      recentlyUpdated,
    }
  }, [tasks, trackedIds])
  const completionPct = tasks.length === 0
    ? 0
    : Math.round((summary.completedCount / tasks.length) * 100)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'

  return (
    <div className="dashboard-shell">
      <div className="frame-overlay" aria-hidden="true">
        <span className="frame-edge frame-edge-top" />
        <span className="frame-edge frame-edge-right" />
        <span className="frame-edge frame-edge-bottom" />
        <span className="frame-edge frame-edge-left" />
        <span className="frame-wax">
          <img src="/wax-seal-v3.webp" alt="" decoding="async" />
        </span>
      </div>

      <div className="dashboard-ledger">
        <header className="ledger-header">
          <div className="illuminated-initial" aria-hidden="true">G</div>
          <div className="ledger-greeting">
            <h1>Good {greeting}</h1>
            <p>
              {summary.activeCount > 0
                ? `${summary.activeCount} quest${summary.activeCount === 1 ? '' : 's'} await your attention`
                : 'No active quests'}
              <span className="header-flourish" aria-hidden="true">◆ ── ◇</span>
            </p>
          </div>
        </header>

        <section className="parchment-panel progress-panel" aria-label="Quest completion progress">
          <div className="progress-heading">
            <span>Progress</span>
            <span className="tabular">
              {summary.completedCount} / {tasks.length} completed · {completionPct}%
            </span>
          </div>
          <div className="ledger-progress-track">
            <div
              className="ledger-progress-fill"
              data-empty={completionPct === 0 || undefined}
              style={{ width: `${completionPct}%` }}
            >
              <span className="ledger-progress-flame" aria-hidden="true" />
            </div>
          </div>
        </section>

        <div className="stats-grid">
          <StatCard label="In Progress" value={summary.inProgress.length} icon={CircleGauge} to="/quests" />
          <StatCard label="Turn In" value={summary.pendingReview.length} icon={Hand} to="/quests" />
          <StatCard label="Due Today" value={summary.dueToday.length} icon={SunMedium} to="/quests" />
          <StatCard label="Overdue" value={summary.overdue.length} icon={AlertTriangle} tone="danger" to="/quests" />
        </div>

        <div className="task-sections-grid">
          <TaskSection title="Due Today" icon={Calendar} tasks={summary.dueToday} emptyText="Nothing due today" />
          <TaskSection
            title="Overdue"
            icon={AlertTriangle}
            tasks={summary.overdue}
            emptyText="No overdue quests"
            tone="danger"
          />
          <TaskSection title="Tracked" icon={Star} tasks={summary.tracked} emptyText="Star a quest to track it here" />
          <TaskSection title="Recent Activity" icon={Scroll} tasks={summary.recentlyUpdated} emptyText="No quests yet" />
        </div>

        <section className="parchment-panel journey-panel">
          <div className="journey-copy">
            <h2>{tasks.length === 0 ? 'Your journey begins' : 'The chronicle continues'}</h2>
            <p>
              {tasks.length === 0
                ? 'No quests logged yet.'
                : `${summary.activeCount} active · ${summary.completedCount} completed`}
            </p>
            <Link to="/quests" className="quest-log-link">
              Open the Quest Log <ArrowRight size={15} strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </div>
          {summary.linkedCount > 0 && (
            <Link to="/integrations" className="portal-link">
              <GitBranch size={14} aria-hidden="true" />
              {summary.linkedCount} bound portal{summary.linkedCount === 1 ? '' : 's'}
            </Link>
          )}
        </section>

        {isLoading && <p className="ledger-loading" role="status">Opening the ledger…</p>}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  tone?: 'danger'
  to: string
}) {
  return (
    <Link to={to} className={cn('parchment-panel stat-card', tone === 'danger' && 'ink-danger')}>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="tabular">{value}</strong>
      </div>
      <Icon size={50} strokeWidth={1.15} className="stat-icon" aria-hidden="true" />
    </Link>
  )
}

function TaskRow({ task }: { task: Task }) {
  const done = task.status === 'completed'
  return (
    <Link to={`/quests/${task.id}`} className="ledger-task-row">
      <span
        aria-hidden="true"
        className="task-priority-mark"
        style={{ background: PRIORITY_HEX[task.priority] }}
      />
      <div className="min-w-0 flex-1">
        <div className={cn('truncate', done && 'task-title-complete')}>{task.title}</div>
        {task.dueDate && <div className="tabular task-date">{formatDate(task.dueDate)}</div>}
      </div>
      <StatusBadge status={task.status} />
    </Link>
  )
}

function TaskSection({
  title,
  icon: Icon,
  tasks,
  emptyText,
  tone,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  tasks: Task[]
  emptyText: string
  tone?: 'danger'
}) {
  return (
    <section className={cn('parchment-panel task-section', tone === 'danger' && 'ink-danger')}>
      <div className="task-section-title">
        <Icon size={23} strokeWidth={1.55} aria-hidden="true" />
        <h2>{title}</h2>
        <span className="tabular">({tasks.length})</span>
      </div>
      <div className="ornament-rule" aria-hidden="true"><span /></div>
      {tasks.length === 0 ? (
        <p className="task-empty">{emptyText}</p>
      ) : (
        <div className="task-list">
          {tasks.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} />)}
          {tasks.length > 6 && (
            <Link to="/quests" className="task-view-all">View all {tasks.length} quests →</Link>
          )}
        </div>
      )}
    </section>
  )
}
